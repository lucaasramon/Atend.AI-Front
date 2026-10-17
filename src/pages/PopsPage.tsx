import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ClipboardList, History, Link2, Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Ministry } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PopRun {
  id: string;
  run_date: string;
  checked: number[];
  sent?: boolean;
  updated_by_name?: string | null;
}

interface Pop {
  id: string;
  ministry_id: string | null;
  ministry_name: string | null;
  ministry_color: string | null;
  title: string;
  description: string | null;
  steps: string[];
  link: string | null;
  recurrence: "none" | "weekly" | "monthly";
  weekday: number | null;
  month_day: number | null;
  active: boolean;
  last_run: PopRun | null;
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const NONE = "none";
const today = () => format(new Date(), "yyyy-MM-dd");
const emptyForm = { ministry_id: "", title: "", description: "", steps: "", link: "", recurrence: "none", weekday: "1", month_day: "1", active: true };

const recurrenceLabel = (p: Pop) =>
  p.recurrence === "weekly" ? `Toda ${WEEKDAYS[p.weekday ?? 0]}` : p.recurrence === "monthly" ? `Todo dia ${p.month_day}` : "Sob demanda";

export default function PopsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canEdit = isAdmin || user?.role === "agenda";
  const [pops, setPops] = useState<Pop[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Pop | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<{ pop: Pop; runs: PopRun[] } | null>(null);

  const load = () =>
    Promise.all([api.get<Pop[]>("/api/pops").then(setPops), api.get<Ministry[]>("/api/ministries").then(setMinistries)])
      .catch((e: Error) => toast({ title: "Erro ao carregar", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const fail = (e: Error) => toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p: Pop) => {
    setEditing(p);
    setForm({
      ministry_id: p.ministry_id || "",
      title: p.title,
      description: p.description || "",
      steps: p.steps.join("\n"),
      link: p.link || "",
      recurrence: p.recurrence,
      weekday: String(p.weekday ?? 1),
      month_day: String(p.month_day ?? 1),
      active: p.active,
    });
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        steps: form.steps.split("\n").map((s) => s.trim()).filter(Boolean),
        weekday: Number(form.weekday),
        month_day: Number(form.month_day),
      };
      if (editing) await api.put(`/api/pops/${editing.id}`, body);
      else await api.post("/api/pops", body);
      toast({ title: "POP salvo" });
      setFormOpen(false);
      load();
    } catch (e: any) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Pop) => {
    if (!confirm(`Excluir o POP "${p.title}"?`)) return;
    try {
      await api.delete(`/api/pops/${p.id}`);
      load();
    } catch (e: any) {
      fail(e);
    }
  };

  /** Execução de hoje: abre se ainda não existe e marca/desmarca o passo */
  const toggleStep = async (p: Pop, index: number, on: boolean) => {
    try {
      let run = p.last_run?.run_date === today() ? p.last_run : null;
      if (!run) {
        const r = await api.post<{ id: string }>(`/api/pops/${p.id}/runs`, {});
        run = { id: r.id, run_date: today(), checked: [] };
      }
      const checked = on ? [...run.checked, index] : run.checked.filter((i) => i !== index);
      await api.patch(`/api/pops/runs/${run.id}`, { checked });
      setPops((list) => list.map((x) => (x.id === p.id ? { ...x, last_run: { ...run!, checked } } : x)));
    } catch (e: any) {
      fail(e);
    }
  };

  const sendNow = async (p: Pop) => {
    try {
      const r = await api.post<{ status: string; errors?: string[] }>(`/api/pops/${p.id}/runs`, { send: true });
      toast({
        title: r.status === "enviado" ? "POP enviado no grupo" : `Não enviado: ${r.status}`,
        description: r.errors?.join("; ") || undefined,
        variant: r.status === "enviado" ? "default" : "destructive",
      });
      load();
    } catch (e: any) {
      fail(e);
    }
  };

  const openHistory = async (p: Pop) => {
    try {
      setHistory({ pop: p, runs: await api.get<PopRun[]>(`/api/pops/${p.id}/runs`) });
    } catch (e: any) {
      fail(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">POPs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Procedimentos padrão dos ministérios. Os recorrentes são enviados no grupo do ministério no dia programado.
          </p>
        </div>
        {isAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo POP</Button>}
      </div>

      {pops.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum POP cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pops.map((p) => {
            const run = p.last_run?.run_date === today() ? p.last_run : null;
            const done = run?.checked.length || 0;
            return (
              <div key={p.id} className={`rounded-lg border border-border bg-card p-4 shadow-card space-y-3 ${p.active ? "" : "opacity-60"}`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{p.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {p.ministry_name && (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.ministry_color || "#999" }} />
                          {p.ministry_name}
                        </span>
                      )}
                      <Badge variant="outline">{recurrenceLabel(p)}</Badge>
                      {!p.active && <Badge variant="outline">Pausado</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0 -ml-2 sm:ml-0">
                    <Button size="icon" variant="ghost" title="Histórico" onClick={() => openHistory(p)}><History className="w-4 h-4" /></Button>
                    {isAdmin && (
                      <>
                        <Button size="icon" variant="ghost" title="Enviar agora no grupo" onClick={() => sendNow(p)}><Send className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" title="Excluir" onClick={() => remove(p)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </>
                    )}
                  </div>
                </div>
                {p.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{p.description}</p>}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Hoje ({format(new Date(), "dd/MM")}) — {done} de {p.steps.length}
                  </p>
                  {p.steps.map((s, i) => (
                    <label key={i} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        className="mt-0.5"
                        checked={!!run?.checked.includes(i)}
                        disabled={!canEdit}
                        onCheckedChange={(v) => toggleStep(p, i, !!v)}
                      />
                      <span className={run?.checked.includes(i) ? "line-through text-muted-foreground" : ""}>{s}</span>
                    </label>
                  ))}
                </div>
                {p.link && (
                  <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Link2 className="w-3 h-3" />Anexo
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cadastro */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar POP" : "Novo POP"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pop-title">Título *</Label>
              <Input id="pop-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Rotina semanal da mídia" />
            </div>
            <div className="space-y-2">
              <Label>Ministério</Label>
              <Select value={form.ministry_id || NONE} onValueChange={(v) => setForm({ ...form, ministry_id: v === NONE ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Geral (sem ministério)</SelectItem>
                  {ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">O POP é enviado no grupo do ministério escolhido.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pop-desc">Descrição</Label>
              <Textarea id="pop-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pop-steps">Passos (um por linha) *</Label>
              <Textarea
                id="pop-steps"
                rows={6}
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
                placeholder={"Programar posts da semana\nRevisar agenda de publicações\nResponder comentários"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pop-link">Anexo (link do Drive, PDF...)</Label>
              <Input id="pop-link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Repetição</Label>
                <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sob demanda</SelectItem>
                    <SelectItem value="weekly">Toda semana</SelectItem>
                    <SelectItem value="monthly">Todo mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.recurrence === "weekly" && (
                <div className="space-y-2">
                  <Label>Dia da semana</Label>
                  <Select value={form.weekday} onValueChange={(v) => setForm({ ...form, weekday: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d, i) => <SelectItem key={i} value={String(i)} className="capitalize">{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.recurrence === "monthly" && (
                <div className="space-y-2">
                  <Label htmlFor="pop-day">Dia do mês</Label>
                  <Input id="pop-day" type="number" min={1} max={31} value={form.month_day} onChange={(e) => setForm({ ...form, month_day: e.target.value })} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <p className="text-sm font-medium">Ativo</p>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico */}
      <Dialog open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico — {history?.pop.title}</DialogTitle>
          </DialogHeader>
          {history?.runs.length ? (
            <div className="space-y-2">
              {history.runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{format(new Date(`${r.run_date}T12:00:00`), "dd/MM/yyyy")}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.checked.length}/{history.pop.steps.length} feitos{r.updated_by_name ? ` · ${r.updated_by_name}` : ""}{r.sent ? " · enviado" : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma execução ainda.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
