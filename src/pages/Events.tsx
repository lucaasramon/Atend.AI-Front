import { useEffect, useMemo, useState } from "react";
import { format, startOfDay, subDays, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Send,
  MapPin,
  Clock,
  Settings2,
  Lock,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { EventItem, Group, ReminderConfig, eventOffsets, parseOffsets, whenLabel } from "@/lib/events";
import EventFormDialog from "@/components/events/EventFormDialog";

interface Preview {
  offset_days: number;
  send_at: string;
  message: string;
}

type Settings = Record<string, string>;

interface RobotGroup extends Group {
  allowed: boolean;
  is_default: boolean;
}

export default function Events() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canEdit = user?.role === "admin" || user?.role === "agenda";
  const [events, setEvents] = useState<EventItem[]>([]);
  const [config, setConfig] = useState<ReminderConfig>({ enabled: false, offsets: [], group_jid: "", groups: [] });
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [summaryPreview, setSummaryPreview] = useState<{ title: string; text: string | null } | null>(null);

  const [toDelete, setToDelete] = useState<EventItem | null>(null);
  const [preview, setPreview] = useState<{ event: EventItem; items: Preview[] } | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Settings>({});
  const [running, setRunning] = useState(false);

  const [groupsOpen, setGroupsOpen] = useState(false);
  const [robotGroups, setRobotGroups] = useState<RobotGroup[] | null>(null);
  const [allowedDraft, setAllowedDraft] = useState<string[]>([]);
  const [savingGroups, setSavingGroups] = useState(false);

  const offsets = config.offsets;
  const groupName = (jid?: string | null) =>
    (jid && config.groups.find((g) => g.id === jid)?.subject) || jid || "—";

  const load = async () => {
    try {
      const [ev, cfg] = await Promise.all([
        api.get<EventItem[]>("/api/events"),
        api.get<ReminderConfig>("/api/events/config"),
      ]);
      setEvents(ev || []);
      setConfig(cfg);
      // Configurações completas (texto da mensagem etc.) só para admin
      if (isAdmin) {
        const st = await api.get<{ key: string; value: string }[]>("/api/settings");
        setSettings(Object.fromEntries((st || []).map((r) => [r.key, r.value ?? ""])));
      }
    } catch (error: any) {
      toast({ title: "Erro ao carregar agenda", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Lembretes que ainda vão sair, em ordem de data
  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    const rows: { event: EventItem; offset: number; date: Date }[] = [];
    for (const ev of events) {
      const start = new Date(ev.starts_at);
      if (start <= new Date()) continue;
      const done = new Set(ev.reminders.map((r) => r.offset_days));
      const pending = eventOffsets(ev, offsets).filter((off) => !done.has(off));
      // Antecedências já vencidas viram um único envio hoje (o backend pula as demais)
      const overdue = pending.filter((off) => subDays(startOfDay(start), off) <= today);
      if (overdue.length) rows.push({ event: ev, offset: Math.min(...overdue), date: today });
      for (const off of pending.filter((o) => !overdue.includes(o))) {
        rows.push({ event: ev, offset: off, date: subDays(startOfDay(start), off) });
      }
    }
    return rows.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 10);
  }, [events, offsets]);

  const futureEvents = events.filter((e) => new Date(e.starts_at) > new Date());
  const pastEvents = events.filter((e) => new Date(e.starts_at) <= new Date()).reverse();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (ev: EventItem) => {
    setEditing(ev);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/events/${toDelete.id}`);
      toast({ title: "Evento excluído" });
      setToDelete(null);
      load();
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const openPreview = async (ev: EventItem) => {
    try {
      const items = await api.get<Preview[]>(`/api/events/${ev.id}/preview`);
      setPreview({ event: ev, items });
    } catch (error: any) {
      toast({ title: "Erro ao gerar prévia", description: error.message, variant: "destructive" });
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await api.post<{ sent: number; skipped: number; errors: string[] }>("/api/events/reminders/run", {});
      toast({
        title: r.sent ? `${r.sent} lembrete(s) enviado(s) ao grupo` : "Nenhum lembrete pendente para hoje",
        description: r.errors.length ? r.errors.join("\n") : undefined,
        variant: r.errors.length ? "destructive" : "default",
      });
      load();
    } catch (error: any) {
      toast({ title: "Erro ao rodar lembretes", description: error.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const openGroups = async () => {
    setGroupsOpen(true);
    setRobotGroups(null);
    try {
      const list = await api.get<RobotGroup[]>("/api/events/groups");
      setRobotGroups(list);
      setAllowedDraft(list.filter((g) => g.allowed).map((g) => g.id));
    } catch (error: any) {
      toast({ title: "Erro ao listar grupos", description: error.message, variant: "destructive" });
      setGroupsOpen(false);
    }
  };

  const saveGroups = async () => {
    setSavingGroups(true);
    try {
      await api.put("/api/events/allowed-groups", { groups: allowedDraft });
      toast({ title: "Grupos atualizados" });
      setGroupsOpen(false);
      load();
    } catch (error: any) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
    } finally {
      setSavingGroups(false);
    }
  };

  const openSettings = () => {
    setSettingsForm({
      reminders_enabled: settings.reminders_enabled || "false",
      reminders_group_jid: settings.reminders_group_jid || "",
      reminders_offsets: settings.reminders_offsets || "30,21,14,10,7,3,1,0",
      reminders_template: settings.reminders_template || "",
      summary_monthly_enabled: settings.summary_monthly_enabled || "true",
      summary_weekly_enabled: settings.summary_weekly_enabled || "true",
    });
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    if (!parseOffsets(settingsForm.reminders_offsets).length) {
      toast({ title: "Informe ao menos uma antecedência", variant: "destructive" });
      return;
    }
    try {
      await api.put("/api/settings", settingsForm);
      toast({ title: "Configuração salva" });
      setSettingsOpen(false);
      load();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  };

  const openSummaryPreview = async (kind: "weekly" | "monthly") => {
    try {
      const r = await api.get<{ text: string | null }>(`/api/events/summaries/preview?kind=${kind}`);
      setSummaryPreview({ title: kind === "weekly" ? "Resumo desta semana" : "Resumo deste mês", text: r.text });
    } catch (error: any) {
      toast({ title: "Erro ao gerar prévia", description: error.message, variant: "destructive" });
    }
  };

  const reminderBadges = (ev: EventItem) => {
    const start = new Date(ev.starts_at);
    return eventOffsets(ev, offsets).map((off) => {
      const rec = ev.reminders.find((r) => r.offset_days === off);
      const date = subDays(startOfDay(start), off);
      if (rec?.status === "sent")
        return <Badge key={off} className="bg-success/15 text-success border-success/30" variant="outline">{whenLabel(off)} · enviado</Badge>;
      if (rec?.status === "skipped")
        return <Badge key={off} variant="outline" className="text-muted-foreground line-through">{whenLabel(off)}</Badge>;
      if (start <= new Date())
        return <Badge key={off} variant="outline" className="text-muted-foreground">{whenLabel(off)} · não enviado</Badge>;
      return <Badge key={off} variant="outline">{whenLabel(off)} · {format(date, "dd/MM")}</Badge>;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const enabled = config.enabled;
  const groupChoices = config.groups;

  const renderEvent = (ev: EventItem) => (
    <div key={ev.id} className="rounded-lg border border-border bg-card p-4 shadow-card space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-card-foreground">{ev.title}</p>
            {!ev.is_public && (
              <Badge variant="outline" className="gap-1"><Lock className="w-3 h-3" />Privado</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(ev.starts_at), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>}
            <span>Grupo: {groupName(ev.group_jid || config.group_jid)}</span>
          </div>
          {ev.description && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{ev.description}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" title="Prévia da mensagem" onClick={() => openPreview(ev)}><Eye className="w-4 h-4" /></Button>
          {canEdit && (
            <>
              <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(ev)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" title="Excluir" onClick={() => setToDelete(ev)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">{reminderBadges(ev)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Eventos do calendário e lembretes automáticos no grupo do WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={openGroups}><Users className="w-4 h-4 mr-2" />Grupos</Button>
              <Button variant="outline" onClick={openSettings}><Settings2 className="w-4 h-4 mr-2" />Configurar</Button>
              <Button variant="outline" onClick={runNow} disabled={running}>
                {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Rodar agora
              </Button>
            </>
          )}
          {canEdit && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo evento</Button>}
        </div>
      </div>

      {/* Status do robô */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-card flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${enabled ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
          Lembretes {enabled ? "ligados" : "desligados"}
        </span>
        <span className="text-muted-foreground">Grupo: <span className="text-foreground">{groupName(config.group_jid)}</span></span>
        <span className="text-muted-foreground">Antecedências: <span className="text-foreground">{offsets.map(whenLabel).join(", ") || "—"}</span></span>
        <span className="text-muted-foreground">Envio diário às 08:00</span>
      </div>

      {/* Próximos lembretes */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Próximos lembretes</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum lembrete agendado.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {upcoming.map(({ event, offset, date }) => {
              const days = differenceInCalendarDays(new Date(event.starts_at), date);
              return (
                <div key={`${event.id}-${offset}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">{format(date, "dd/MM/yyyy")}</span>
                  <span className="flex-1 truncate text-foreground">{event.title}</span>
                  <Badge variant="outline">{days === 0 ? "É hoje!" : `Faltam ${days} dia${days === 1 ? "" : "s"}`}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Eventos */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Próximos eventos</h2>
        {futureEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum evento agendado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{futureEvents.map(renderEvent)}</div>
        )}
      </div>

      {pastEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Eventos passados</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-70">{pastEvents.slice(0, 10).map(renderEvent)}</div>
        </div>
      )}

      {/* Criar / editar */}
      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} event={editing} config={config} onSaved={load} />

      {/* Prévia */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mensagens de “{preview?.event.title}”</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {preview?.items.map((p) => (
              <div key={p.offset_days} className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {whenLabel(p.offset_days)} · {format(new Date(p.send_at), "dd/MM/yyyy 'às' HH:mm")}
                </p>
                <pre className="whitespace-pre-wrap font-sans text-sm rounded-md bg-muted p-3">{p.message}</pre>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Configuração */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar lembretes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <p className="text-sm font-medium">Enviar lembretes automaticamente</p>
              <Switch
                checked={settingsForm.reminders_enabled === "true"}
                onCheckedChange={(v) => setSettingsForm({ ...settingsForm, reminders_enabled: v ? "true" : "false" })}
              />
            </div>
            <div className="space-y-2">
              <Label>Grupo padrão</Label>
              <Select
                value={settingsForm.reminders_group_jid || undefined}
                onValueChange={(v) => setSettingsForm({ ...settingsForm, reminders_group_jid: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                <SelectContent>
                  {groupChoices.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Somente grupos liberados para o robô aparecem aqui.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offsets">Antecedências (dias, separados por vírgula)</Label>
              <Input
                id="offsets"
                value={settingsForm.reminders_offsets || ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, reminders_offsets: e.target.value })}
                placeholder="30,21,14,10,7,3,1,0"
              />
              <p className="text-xs text-muted-foreground">0 = no dia do evento. Cada evento pode ter as suas próprias.</p>
            </div>
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium">Resumos automáticos no grupo padrão</p>
              {([
                ["summary_monthly_enabled", "Resumo do mês, todo dia 1º", "monthly"],
                ["summary_weekly_enabled", "Resumo da semana, toda segunda-feira", "weekly"],
              ] as const).map(([key, label, kind]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{label}</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openSummaryPreview(kind)}>Prévia</Button>
                    <Switch
                      checked={settingsForm[key] !== "false"}
                      onCheckedChange={(v) => setSettingsForm({ ...settingsForm, [key]: v ? "true" : "false" })}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Texto da mensagem</Label>
              <Textarea
                id="template"
                rows={6}
                value={settingsForm.reminders_template || ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, reminders_template: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Variáveis: {"{titulo} {data} {hora} {local} {descricao} {quando}"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
            <Button onClick={saveSettings}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prévia do resumo */}
      <Dialog open={!!summaryPreview} onOpenChange={(o) => !o && setSummaryPreview(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{summaryPreview?.title}</DialogTitle>
          </DialogHeader>
          {summaryPreview?.text ? (
            <pre className="whitespace-pre-wrap font-sans text-sm rounded-md bg-muted p-3">{summaryPreview.text}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum evento no período — nesse caso o resumo não é enviado.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Grupos liberados */}
      <Dialog open={groupsOpen} onOpenChange={setGroupsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grupos que podem receber lembretes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Estes são os grupos em que o robô está. Só os marcados aparecem para escolha nos eventos.
          </p>
          {!robotGroups ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : robotGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">O robô ainda não está em nenhum grupo.</p>
          ) : (
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {robotGroups.map((g) => {
                const checked = allowedDraft.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className={`flex items-center gap-3 rounded-md border border-border px-3 py-2 ${g.is_default ? "opacity-80" : "cursor-pointer hover:border-primary/40"}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={g.is_default}
                      onCheckedChange={(v) =>
                        setAllowedDraft(v ? [...allowedDraft, g.id] : allowedDraft.filter((id) => id !== g.id))
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.subject}</p>
                      {g.size !== undefined && <p className="text-xs text-muted-foreground">{g.size} participantes</p>}
                    </div>
                    {g.is_default && <Badge variant="outline">Padrão</Badge>}
                  </label>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Para um grupo novo aparecer aqui, adicione o número do robô nele pelo WhatsApp.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupsOpen(false)}>Cancelar</Button>
            <Button onClick={saveGroups} disabled={!robotGroups || savingGroups}>
              {savingGroups && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.title}” será removido do calendário e nenhum lembrete será mais enviado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
