import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDown, ArrowUp, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cap } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { EventForm, FIELD_PRESETS, FIELD_TYPE_LABEL, FieldType, FormField } from "@/lib/forms";
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
  /** Eventos que podem receber formulário (para escolher ao criar) */
  events: { id: string; title: string; starts_at: string }[];
  /** Evento já escolhido (editar, ou criar a partir da Agenda) */
  eventId?: string;
  form?: EventForm | null;
  onSaved: (eventId: string) => void;
}

const newId = () => Math.random().toString(36).slice(2, 10);

/** datetime-local ↔ ISO */
const toLocalInput = (iso: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "");

/** Criar ou editar o formulário de inscrição de um evento */
export default function RegistrationFormDialog({ open, onOpenChange, events, eventId: fixedEvent, form, onSaved }: Props) {
  const { toast } = useToast();
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEventId(fixedEvent || "");
    setTitle(form?.title || "");
    setDescription(form?.description || "");
    setCapacity(form?.capacity ? String(form.capacity) : "");
    setClosesAt(toLocalInput(form?.closes_at || null));
    setIsOpen(form ? form.is_open : true);
    setFields(form?.fields || []);
  }, [open]);

  const event = events.find((e) => e.id === eventId);
  const update = (i: number, patch: Partial<FormField>) => setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: -1 | 1) =>
    setFields((fs) => {
      const next = [...fs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  const addField = (f: Omit<FormField, "id">) => setFields((fs) => [...fs, { ...f, id: newId() }]);

  const save = async () => {
    if (!eventId) return toast({ title: "Escolha o evento", variant: "destructive" });
    const bad = fields.find((f) => !f.label.trim() || (f.type === "select" && f.options.filter(Boolean).length < 2));
    if (bad) {
      return toast({
        title: "Confira as perguntas",
        description: bad.label.trim() ? `"${bad.label}" precisa de pelo menos 2 opções.` : "Há uma pergunta sem texto.",
        variant: "destructive",
      });
    }
    setSaving(true);
    try {
      await api.put(`/api/events/${eventId}/form`, {
        title,
        description,
        capacity: capacity ? Number(capacity) : null,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        is_open: isOpen,
        fields: fields.map((f) => ({ ...f, options: f.options.map((o) => o.trim()).filter(Boolean) })),
      });
      toast({ title: form ? "Formulário salvo" : "Formulário criado", description: form ? undefined : "Agora é só compartilhar o link." });
      onOpenChange(false);
      onSaved(eventId);
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form ? "Editar formulário de inscrição" : "Criar formulário de inscrição"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Evento *</Label>
            {fixedEvent ? (
              <p className="text-sm rounded-md bg-muted px-3 py-2">
                {event ? `${cap(format(new Date(event.starts_at), "EEE dd/MM HH:mm", { locale: ptBR }))} — ${event.title}` : "Evento selecionado"}
              </p>
            ) : (
              <Select value={eventId || undefined} onValueChange={setEventId}>
                <SelectTrigger><SelectValue placeholder="Escolha o evento" /></SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {cap(format(new Date(e.starts_at), "EEE dd/MM HH:mm", { locale: ptBR }))} — {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!fixedEvent && events.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum evento futuro sem formulário que você possa editar.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Título do formulário</Label>
              <Input placeholder={event?.title || "Igual ao do evento"} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Limite de vagas</Label>
              <Input type="number" min={1} placeholder="Sem limite" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Recado para quem vai se inscrever</Label>
            <Textarea rows={2} placeholder="Ex.: Valor R$ 150, pagamento na secretaria até dia 10." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-2">
              <Label>Encerrar inscrições em</Label>
              <Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Vazio = até a hora do evento.</p>
            </div>
            <label className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer">
              <Switch checked={isOpen} onCheckedChange={setIsOpen} />
              <span className="text-sm">{isOpen ? "Inscrições abertas" : "Inscrições fechadas"}</span>
            </label>
          </div>
          {capacity && (
            <p className="text-xs text-muted-foreground">Quando as {capacity} vagas acabarem, as próximas pessoas entram na lista de espera e sobem sozinhas se alguém sair.</p>
          )}

          <div className="space-y-2">
            <Label>Perguntas</Label>
            <div className="rounded-md border border-border divide-y divide-border">
              {["Nome completo", "WhatsApp"].map((l) => (
                <div key={l} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Lock className="w-3.5 h-3.5" />{l} <span className="text-[11px]">(sempre pedido)</span>
                </div>
              ))}
              {fields.map((f, i) => (
                <div key={f.id} className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Pergunta" value={f.label} onChange={(e) => update(i, { label: e.target.value })} />
                    <div className="flex shrink-0">
                      <Button type="button" size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} title="Subir"><ArrowUp className="w-4 h-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" disabled={i === fields.length - 1} onClick={() => move(i, 1)} title="Descer"><ArrowDown className="w-4 h-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))} title="Remover"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={f.type} onValueChange={(v) => update(i, { type: v as FieldType })}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(FIELD_TYPE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={f.required} onCheckedChange={(v) => update(i, { required: v })} />Obrigatória
                    </label>
                  </div>
                  {f.type === "select" && (
                    <Input
                      className="h-8 text-xs"
                      placeholder="Opções separadas por vírgula (ex.: P, M, G)"
                      value={f.options.join(", ")}
                      onChange={(e) => update(i, { options: e.target.value.split(",").map((o) => o.trimStart()) })}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="outline" onClick={() => addField({ label: "", type: "text", options: [], required: false })}>
                <Plus className="w-4 h-4 mr-1" />Nova pergunta
              </Button>
              {FIELD_PRESETS.filter((p) => !fields.some((f) => f.label === p.label)).map((p) => (
                <Button key={p.label} type="button" size="sm" variant="ghost" className="text-xs h-8" onClick={() => addField(p)}>
                  + {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !eventId}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{form ? "Salvar" : "Criar formulário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
