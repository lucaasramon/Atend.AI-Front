import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { RosterEntry } from "@/lib/events";
import { cap } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface RosterMember {
  id: string;
  name: string;
  whatsapp: string | null;
  active: boolean;
  is_user: boolean;
  church_role: string | null;
  ministries: { id: string; name: string; color: string | null }[];
}

export interface ServiceFunction {
  id: string;
  ministry_id: string;
  name: string;
  pop_title: string | null;
  steps_count: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: { id: string; title: string; starts_at: string }[];
  /** Áreas em que a pessoa logada pode montar escala */
  ministries: { id: string; name: string; color: string | null }[];
  members: RosterMember[];
  functions: ServiceFunction[];
  initial?: { eventId?: string; ministryId?: string };
  onSaved: () => void;
}

type Pick = { task: string; area_id: string | null };

export default function RosterBuilderDialog({ open, onOpenChange, events, ministries, members, functions, initial, onSaved }: Props) {
  const { toast } = useToast();
  const [eventId, setEventId] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const [picked, setPicked] = useState<Record<string, Pick>>({});
  const [existing, setExisting] = useState(0);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEventId(initial?.eventId || "");
    setMinistryId(initial?.ministryId || (ministries.length === 1 ? ministries[0].id : ""));
    setSearch("");
    setShowAll(false);
  }, [open]);

  // Carrega a escala que já existe para essa área nesse evento (para editar)
  useEffect(() => {
    if (!open || !eventId || !ministryId) {
      setPicked({});
      setExisting(0);
      return;
    }
    setLoadingExisting(true);
    api.get<RosterEntry[]>(`/api/events/${eventId}/roster`)
      .then((list) => {
        const mine = list.filter((r) => r.ministry_id === ministryId);
        setExisting(mine.length);
        setPicked(Object.fromEntries(mine.map((r) => [r.member_id, { task: r.task || r.area || "", area_id: r.area_id }])));
      })
      .catch(() => setPicked({}))
      .finally(() => setLoadingExisting(false));
  }, [open, eventId, ministryId]);

  const ministryFunctions = functions.filter((f) => f.ministry_id === ministryId);
  const listId = `funcs-${ministryId}`;

  const people = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => m.active || picked[m.id])
      .filter((m) => showAll || picked[m.id] || m.ministries.some((x) => x.id === ministryId))
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .sort((a, b) => Number(!!picked[b.id]) - Number(!!picked[a.id]) || a.name.localeCompare(b.name, "pt-BR"));
  }, [members, ministryId, showAll, search, picked]);

  const toggle = (id: string) =>
    setPicked((p) => {
      const next = { ...p };
      if (next[id]) delete next[id];
      else next[id] = { task: "", area_id: null };
      return next;
    });

  const setTask = (id: string, task: string) => {
    const fn = ministryFunctions.find((f) => f.name.toLowerCase() === task.trim().toLowerCase());
    setPicked((p) => ({ ...p, [id]: { task, area_id: fn?.id || null } }));
  };

  const selectAll = () =>
    setPicked((p) => ({ ...Object.fromEntries(people.map((m) => [m.id, p[m.id] || { task: "", area_id: null }])), ...p }));

  const save = async () => {
    if (!eventId || !ministryId) {
      toast({ title: "Escolha o evento e a área", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const entries = Object.entries(picked).map(([member_id, v]) => ({ member_id, task: v.task, area_id: v.area_id }));
      await api.put(`/api/events/${eventId}/roster/ministry/${ministryId}`, { entries });
      toast({ title: entries.length ? `Escala salva: ${entries.length} pessoa(s)` : "Escala da área removida do evento" });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const count = Object.keys(picked).length;
  const ready = eventId && ministryId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" />{existing ? "Editar escala" : "Criar escala"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Evento *</Label>
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
            </div>
            <div className="space-y-2">
              <Label>Área *</Label>
              <Select value={ministryId || undefined} onValueChange={setMinistryId}>
                <SelectTrigger><SelectValue placeholder="Escolha a área" /></SelectTrigger>
                <SelectContent>
                  {ministries.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color || "#999" }} />
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!ready ? (
            <p className="text-sm text-muted-foreground rounded-md bg-muted p-3">Escolha o evento e a área para montar a escala.</p>
          ) : loadingExisting ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar pessoa" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                  <Switch checked={showAll} onCheckedChange={setShowAll} />
                  Pessoas de outras áreas
                </label>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span><b className="text-foreground">{count}</b> pessoa(s) na escala</span>
                {people.length > 0 && <button className="text-primary hover:underline" onClick={selectAll}>Marcar todos da lista</button>}
              </div>

              <datalist id={listId}>
                {ministryFunctions.map((f) => <option key={f.id} value={f.name} />)}
              </datalist>

              <div className="rounded-md border border-border divide-y divide-border max-h-[45dvh] overflow-y-auto">
                {people.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">
                    Ninguém nesta área. Ligue "Pessoas de outras áreas" ou cadastre membros na aba Membros.
                  </p>
                )}
                {people.map((m) => {
                  const on = !!picked[m.id];
                  return (
                    <div key={m.id} className={`px-3 py-2 space-y-1.5 ${on ? "bg-primary/5" : ""}`}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox checked={on} onCheckedChange={() => toggle(m.id)} />
                        <span className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{m.name}</span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {[m.church_role, m.ministries.map((x) => x.name).join(", ") || "sem área", m.whatsapp ? null : "sem WhatsApp"].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </label>
                      {on && (
                        <div className="pl-7">
                          <Input
                            className="h-8 text-sm"
                            list={listId}
                            placeholder="O que vai fazer (ex.: Vocal, Teclado, Câmera 1)"
                            value={picked[m.id].task}
                            onChange={(e) => setTask(m.id, e.target.value)}
                          />
                          {picked[m.id].area_id && (
                            <p className="text-[11px] text-success mt-0.5">
                              Recebe o checklist de "{ministryFunctions.find((f) => f.id === picked[m.id].area_id)?.name}" no WhatsApp
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {ministryFunctions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Sugestões de função desta área: {ministryFunctions.map((f) => f.name).join(", ")}. Quem tiver uma função com POP recebe o checklist dela.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!ready || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar escala
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
