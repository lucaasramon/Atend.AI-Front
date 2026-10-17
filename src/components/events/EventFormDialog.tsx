import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Conflict, EventItem, Location, Ministry, ReminderConfig, parseOffsets, whenLabel } from "@/lib/events";
import { useAuth } from "@/contexts/AuthContext";
import ChipSelect from "./ChipSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Evento sendo editado; null = novo */
  event: EventItem | null;
  config: ReminderConfig;
  onSaved: () => void;
}

const toLocalInput = (iso: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "");

const emptyForm = {
  title: "",
  description: "",
  location: "",
  starts_at: "",
  ends_at: "",
  is_public: true,
  group_jid: "",
  custom_offsets: false,
  offsets: "",
  ministry_ids: [] as string[],
  location_ids: [] as string[],
};

export default function EventFormDialog({ open, onOpenChange, event, config, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const { user } = useAuth();
  const needsApproval = config.approval_required && user?.role !== "admin";

  useEffect(() => {
    if (!open) return;
    api.get<Ministry[]>("/api/ministries").then(setMinistries).catch(() => setMinistries([]));
    api.get<Location[]>("/api/locations").then(setLocations).catch(() => setLocations([]));
  }, [open]);

  const groupName = (jid?: string | null) =>
    (jid && config.groups.find((g) => g.id === jid)?.subject) || jid || "—";

  useEffect(() => {
    if (!open) return;
    setConflicts([]);
    setForm(
      event
        ? {
            title: event.title,
            description: event.description || "",
            location: event.location || "",
            starts_at: toLocalInput(event.starts_at),
            ends_at: toLocalInput(event.ends_at),
            is_public: event.is_public,
            group_jid: event.group_jid || "",
            custom_offsets: !!event.reminder_offsets?.length,
            offsets: (event.reminder_offsets || config.offsets).join(", "),
            ministry_ids: event.ministries.map((m) => m.id),
            location_ids: event.locations.map((l) => l.id),
          }
        : { ...emptyForm, offsets: config.offsets.join(", ") }
    );
  }, [open, event]);

  // Confere conflitos de horário/local enquanto o formulário é preenchido
  useEffect(() => {
    if (!open || !form.starts_at) {
      setConflicts([]);
      return;
    }
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ starts_at: new Date(form.starts_at).toISOString(), location: form.location });
      if (form.ends_at) qs.set("ends_at", new Date(form.ends_at).toISOString());
      if (event) qs.set("exclude_id", event.id);
      if (form.location_ids.length) qs.set("location_ids", form.location_ids.join(","));
      if (form.ministry_ids.length) qs.set("ministry_ids", form.ministry_ids.join(","));
      api.get<Conflict[]>(`/api/events/conflicts?${qs}`).then(setConflicts).catch(() => setConflicts([]));
    }, 500);
    return () => clearTimeout(t);
  }, [open, form.starts_at, form.ends_at, form.location, form.location_ids, form.ministry_ids]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.starts_at) {
      toast({ title: "Preencha título, data e hora", variant: "destructive" });
      return;
    }
    if (form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      toast({ title: "O término deve ser depois do início", variant: "destructive" });
      return;
    }
    const offsets = parseOffsets(form.offsets);
    if (form.custom_offsets && !offsets.length) {
      toast({ title: "Informe ao menos uma antecedência", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_public: form.is_public,
      group_jid: form.group_jid,
      reminder_offsets: form.custom_offsets ? offsets : null,
      ministry_ids: form.ministry_ids,
      location_ids: form.location_ids,
    };
    try {
      const saved = event
        ? await api.patch<EventItem>(`/api/events/${event.id}`, body)
        : await api.post<EventItem>("/api/events", body);
      toast(
        saved.status === "pending"
          ? { title: "Enviado para aprovação", description: "Os administradores foram avisados." }
          : { title: event ? "Evento atualizado" : "Evento criado" }
      );
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Editar evento" : "Novo evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Início *</Label>
              <Input id="starts_at" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Término</Label>
              <Input id="ends_at" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Locais</Label>
            <ChipSelect
              options={locations.filter((l) => l.active || form.location_ids.includes(l.id))}
              value={form.location_ids}
              onChange={(ids) => setForm({ ...form, location_ids: ids })}
              empty="Nenhum local cadastrado (o admin cadastra em Locais)"
            />
            <Input
              id="location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder={locations.length ? "Observação do local (opcional)" : "Local"}
            />
          </div>
          <div className="space-y-2">
            <Label>Ministérios envolvidos</Label>
            <ChipSelect
              options={ministries}
              value={form.ministry_ids}
              onChange={(ids) => setForm({ ...form, ministry_ids: ids })}
              empty="Nenhum ministério cadastrado (o admin cadastra em Ministérios)"
            />
            <p className="text-xs text-muted-foreground">Os grupos desses ministérios também recebem os lembretes.</p>
          </div>

          {conflicts.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm space-y-1">
              <p className="flex items-center gap-2 font-medium text-warning">
                <AlertTriangle className="w-4 h-4" />
                Possível conflito de agenda
              </p>
              {conflicts.map((c) => (
                <p key={c.id} className="text-xs text-muted-foreground">
                  {c.reason}: <b className="text-foreground">{c.title}</b> — {format(new Date(c.starts_at), "dd/MM HH:mm")}
                  {c.ends_at ? ` às ${format(new Date(c.ends_at), "HH:mm")}` : ""}
                  {c.location ? ` · ${c.location}` : ""}
                </p>
              ))}
              <p className="text-xs text-muted-foreground">Você pode salvar mesmo assim.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Grupo extra do WhatsApp</Label>
            <Select value={form.group_jid || "none"} onValueChange={(v) => setForm({ ...form, group_jid: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {config.groups.filter((g) => g.id !== config.group_jid).map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O grupo principal ({groupName(config.group_jid)}) sempre recebe. Use para avisar mais um grupo.
            </p>
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Lembretes personalizados</p>
                <p className="text-xs text-muted-foreground">
                  {form.custom_offsets ? "Só para este evento" : `Padrão: ${config.offsets.map(whenLabel).join(", ")}`}
                </p>
              </div>
              <Switch checked={form.custom_offsets} onCheckedChange={(v) => setForm({ ...form, custom_offsets: v })} />
            </div>
            {form.custom_offsets && (
              <div className="space-y-1">
                <Input value={form.offsets} onChange={(e) => setForm({ ...form, offsets: e.target.value })} placeholder="30, 7, 1, 0" />
                <p className="text-xs text-muted-foreground">Dias antes, separados por vírgula (0 = no dia).</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Mostrar no calendário público</p>
              <p className="text-xs text-muted-foreground">Os lembretes no grupo são enviados de qualquer forma</p>
            </div>
            <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
          </div>
          {event && (
            <p className="text-xs text-muted-foreground">Se mudar a data, os lembretes deste evento serão enviados novamente.</p>
          )}
          {needsApproval && (!event || event.status !== "approved") && (
            <p className="text-xs rounded-md bg-muted p-3">
              Este evento será enviado para <b>aprovação dos administradores</b> antes de entrar na agenda e nos lembretes.
            </p>
          )}
          {needsApproval && event?.status === "approved" && (
            <p className="text-xs text-muted-foreground">Mudar data, horário ou locais envia o evento para nova aprovação.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
