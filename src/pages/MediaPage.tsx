import { useEffect, useMemo, useState } from "react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Clapperboard, Link2, Loader2, Pencil, Plus, Sparkles, Trash2, User, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EventItem, Person } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Status = "todo" | "doing" | "review" | "done";

interface Demand {
  id: string;
  title: string;
  type: string;
  event_id: string | null;
  event_title: string | null;
  is_group: boolean;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_full_name: string | null;
  due_at: string;
  status: Status;
  briefing: string | null;
  links: string | null;
}

const TYPES: Record<string, string> = {
  captacao: "Captação",
  gravacao: "Gravação",
  post: "Post",
  arte: "Arte",
  video: "Vídeo",
  transmissao: "Transmissão",
  outro: "Outro",
};

const COLUMNS: { status: Status; label: string }[] = [
  { status: "todo", label: "A fazer" },
  { status: "doing", label: "Em produção" },
  { status: "review", label: "Em revisão" },
  { status: "done", label: "Entregue" },
];

const NONE = "__none";
const FREE = "__free";
const emptyForm = {
  title: "", type: "post", event_id: "", is_group: false, assignee_id: "", assignee_name: "",
  due_at: "", status: "todo" as Status, briefing: "", links: "",
};

export default function MediaPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "agenda";
  const [demands, setDemands] = useState<Demand[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filter, setFilter] = useState<"all" | "group" | "individual" | "mine">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Demand | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [freeName, setFreeName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [genEvent, setGenEvent] = useState("");

  const load = () => api.get<Demand[]>("/api/media").then(setDemands).catch(() => setDemands([]));

  useEffect(() => {
    load();
    api.get<Person[]>("/api/events/people").then(setPeople).catch(() => setPeople([]));
    api.get<EventItem[]>("/api/events").then((l) => setEvents(l.filter((e) => e.status !== "rejected" && !isPast(new Date(e.starts_at))))).catch(() => {});
  }, []);

  const visible = useMemo(
    () =>
      (demands || []).filter((d) =>
        filter === "group" ? d.is_group : filter === "individual" ? !d.is_group : filter === "mine" ? d.assignee_id === user?.id : true
      ),
    [demands, filter]
  );

  const fail = (e: Error) => toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFreeName(false);
    setFormOpen(true);
  };

  const openEdit = (d: Demand) => {
    setEditing(d);
    setForm({
      title: d.title, type: d.type, event_id: d.event_id || "", is_group: d.is_group,
      assignee_id: d.assignee_id || "", assignee_name: d.assignee_name || "",
      due_at: format(new Date(d.due_at), "yyyy-MM-dd'T'HH:mm"), status: d.status,
      briefing: d.briefing || "", links: d.links || "",
    });
    setFreeName(!!d.assignee_name && !d.assignee_id);
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.due_at) {
      toast({ title: "Informe o título e o prazo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        due_at: new Date(form.due_at).toISOString(),
        assignee_id: form.is_group || freeName ? "" : form.assignee_id,
        assignee_name: form.is_group || !freeName ? "" : form.assignee_name,
      };
      if (editing) await api.patch(`/api/media/${editing.id}`, body);
      else await api.post("/api/media", body);
      toast({ title: editing ? "Demanda atualizada" : "Demanda criada" });
      setFormOpen(false);
      load();
    } catch (e: any) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };

  const move = async (d: Demand, status: Status) => {
    try {
      await api.patch(`/api/media/${d.id}`, { status });
      setDemands((list) => list!.map((x) => (x.id === d.id ? { ...x, status } : x)));
    } catch (e: any) {
      fail(e);
    }
  };

  const remove = async (d: Demand) => {
    if (!confirm(`Excluir "${d.title}"?`)) return;
    try {
      await api.delete(`/api/media/${d.id}`);
      load();
    } catch (e: any) {
      fail(e);
    }
  };

  const generate = async () => {
    if (!genEvent) return;
    try {
      await api.post(`/api/media/from-event/${genEvent}`, {});
      toast({ title: "Demandas geradas", description: "Ajuste prazos e responsáveis em cada uma." });
      setGenOpen(false);
      setGenEvent("");
      load();
    } catch (e: any) {
      fail(e);
    }
  };

  if (!demands) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const card = (d: Demand) => {
    const late = d.status !== "done" && isPast(new Date(d.due_at));
    return (
      <div key={d.id} className="rounded-md border border-border bg-background p-3 space-y-2 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Badge variant="secondary" className="mb-1">{TYPES[d.type] || d.type}</Badge>
            <p className="font-medium leading-snug">{d.title}</p>
          </div>
          {canEdit && (
            <div className="flex shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => openEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Excluir" onClick={() => remove(d)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
          )}
        </div>
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p className={`flex items-center gap-1 ${late ? "text-destructive font-medium" : ""}`}>
            <CalendarClock className="w-3 h-3" />
            {format(new Date(d.due_at), "EEE dd/MM HH:mm", { locale: ptBR })}{late && " · atrasada"}
          </p>
          <p className="flex items-center gap-1">
            {d.is_group ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
            {d.is_group ? "Equipe da mídia" : d.assignee_full_name || d.assignee_name || "Sem responsável"}
          </p>
          {d.event_title && <p className="truncate">📅 {d.event_title}</p>}
        </div>
        {d.briefing && <p className="text-xs whitespace-pre-line line-clamp-3">{d.briefing}</p>}
        {d.links && (
          <div className="flex flex-wrap gap-2">
            {d.links.split("\n").filter(Boolean).map((l, i) => (
              <a key={i} href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Link2 className="w-3 h-3" />Anexo {i + 1}
              </a>
            ))}
          </div>
        )}
        {canEdit && (
          <Select value={d.status} onValueChange={(v) => move(d, v as Status)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLUMNS.map((c) => <SelectItem key={c.status} value={c.status}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Mídia</h1>
          <p className="text-sm text-muted-foreground mt-1">Prazos e demandas da equipe de mídia (do grupo e individuais)</p>
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setGenOpen(true)}><Sparkles className="w-4 h-4 mr-2" />Gerar de um evento</Button>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nova demanda</Button>
          </div>
        )}
      </div>

      <div className="inline-flex rounded-md border border-border p-0.5 text-sm">
        {([
          ["all", "Todas"],
          ["group", "Do grupo"],
          ["individual", "Individuais"],
          ["mine", "Minhas"],
        ] as const).map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} className={`px-3 py-1 rounded ${filter === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {demands.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clapperboard className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nenhuma demanda ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const list = visible.filter((d) => d.status === col.status);
            return (
              <div key={col.status} className="rounded-lg border border-border bg-card p-3 space-y-2 shadow-card">
                <p className="text-sm font-medium flex items-center justify-between">
                  {col.label}
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </p>
                {list.map(card)}
              </div>
            );
          })}
        </div>
      )}

      {/* Cadastro */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar demanda" : "Nova demanda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="m-title">Título *</Label>
              <Input id="m-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Posts da conferência" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-due">Prazo *</Label>
                <Input id="m-due" type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Evento relacionado</Label>
              <Select value={form.event_id || NONE} onValueChange={(v) => setForm({ ...form, event_id: v === NONE ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{format(new Date(e.starts_at), "dd/MM")} — {e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Demanda do grupo</p>
                <p className="text-xs text-muted-foreground">O lembrete vai para o grupo do ministério de Mídia</p>
              </div>
              <Switch checked={form.is_group} onCheckedChange={(v) => setForm({ ...form, is_group: v })} />
            </div>
            {!form.is_group && (
              <div className="space-y-2">
                <Label>Responsável</Label>
                {freeName ? (
                  <div className="flex gap-2">
                    <Input value={form.assignee_name} onChange={(e) => setForm({ ...form, assignee_name: e.target.value })} placeholder="Nome (sem acesso ao sistema)" />
                    <Button variant="ghost" onClick={() => setFreeName(false)}>Lista</Button>
                  </div>
                ) : (
                  <Select
                    value={form.assignee_id || NONE}
                    onValueChange={(v) => (v === FREE ? setFreeName(true) : setForm({ ...form, assignee_id: v === NONE ? "" : v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem responsável</SelectItem>
                      {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.has_whatsapp ? " 📱" : ""}</SelectItem>)}
                      <SelectItem value={FREE}>Outra pessoa (digitar nome)…</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">📱 = recebe a demanda e os lembretes no WhatsApp.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="m-brief">Briefing</Label>
              <Textarea
                id="m-brief"
                rows={4}
                value={form.briefing}
                onChange={(e) => setForm({ ...form, briefing: e.target.value })}
                placeholder="Textos, datas, informações e referências para criar a arte..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-links">Links / anexos (um por linha)</Label>
              <Textarea id="m-links" rows={2} value={form.links} onChange={(e) => setForm({ ...form, links: e.target.value })} placeholder="https://drive.google.com/..." />
            </div>
            {editing && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => <SelectItem key={c.status} value={c.status}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gerar de um evento */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar demandas de um evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Cria o pacote padrão da mídia: arte (21 dias antes), posts (14 dias), stories (1 dia), captação e gravação (no dia) e entrega do vídeo (3 dias depois).
            </p>
            <Select value={genEvent || NONE} onValueChange={(v) => setGenEvent(v === NONE ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Escolha o evento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Escolha o evento</SelectItem>
                {events.map((e) => <SelectItem key={e.id} value={e.id}>{format(new Date(e.starts_at), "dd/MM")} — {e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancelar</Button>
            <Button onClick={generate} disabled={!genEvent}>Gerar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
