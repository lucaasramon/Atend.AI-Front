import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, ListChecks, Loader2, Plus, Trash2, User } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ChecklistTemplate, EventItem, EventTask, Person } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  event: EventItem | null;
  canEdit: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

const FREE = "__free";
const NONE = "__none";

export default function EventChecklistDialog({ event, canEdit, onOpenChange, onChanged }: Props) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<EventTask[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [freeNameFor, setFreeNameFor] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    setTasks(null);
    api.get<EventTask[]>(`/api/events/${event.id}/tasks`).then(setTasks).catch(() => setTasks([]));
    if (canEdit) {
      api.get<Person[]>("/api/events/people").then(setPeople).catch(() => setPeople([]));
      api.get<ChecklistTemplate[]>("/api/events/checklist-templates").then(setTemplates).catch(() => setTemplates([]));
    }
  }, [event?.id]);

  const fail = (e: Error) => toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });

  const update = async (task: EventTask, patch: Record<string, unknown>) => {
    try {
      const t = await api.patch<EventTask>(`/api/events/tasks/${task.id}`, patch);
      setTasks((list) => list!.map((x) => (x.id === t.id ? t : x)));
      onChanged();
    } catch (e: any) {
      fail(e);
    }
  };

  const add = async () => {
    if (!newTitle.trim() || !event) return;
    try {
      const t = await api.post<EventTask>(`/api/events/${event.id}/tasks`, { title: newTitle });
      setTasks((list) => [...(list || []), t]);
      setNewTitle("");
      onChanged();
    } catch (e: any) {
      fail(e);
    }
  };

  const remove = async (task: EventTask) => {
    try {
      await api.delete(`/api/events/tasks/${task.id}`);
      setTasks((list) => list!.filter((x) => x.id !== task.id));
      onChanged();
    } catch (e: any) {
      fail(e);
    }
  };

  const applyTemplate = async (templateId: string) => {
    if (!event) return;
    try {
      setTasks(await api.post<EventTask[]>(`/api/events/${event.id}/tasks/from-template`, { template_id: templateId }));
      toast({ title: "Modelo aplicado", description: "Defina os responsáveis de cada item." });
      onChanged();
    } catch (e: any) {
      fail(e);
    }
  };

  const assigneeValue = (t: EventTask) => (t.assignee_id ? t.assignee_id : t.assignee_name ? FREE : NONE);
  const done = tasks?.filter((t) => t.done).length || 0;

  return (
    <Dialog open={!!event} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Checklist — {event?.title}
          </DialogTitle>
        </DialogHeader>

        {!tasks ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            {tasks.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{done} de {tasks.length} concluídas</span>
                  <span>{Math.round((done / tasks.length) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-success transition-all" style={{ width: `${(done / tasks.length) * 100}%` }} />
                </div>
              </div>
            )}

            {tasks.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa ainda.</p>}

            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="rounded-md border border-border p-2.5 space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      className="mt-0.5"
                      checked={t.done}
                      disabled={!canEdit}
                      onCheckedChange={(v) => update(t, { done: !!v })}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                      {!canEdit && (
                        <p className="text-xs text-muted-foreground">
                          {t.assignee_full_name || t.assignee_name || "Sem responsável"}
                          {t.due_date && ` · prazo ${format(new Date(`${t.due_date}T12:00:00`), "dd/MM")}`}
                        </p>
                      )}
                      {t.done && t.done_by_name && <p className="text-[11px] text-success">Feito por {t.done_by_name}</p>}
                    </div>
                    {canEdit && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Excluir tarefa" onClick={() => remove(t)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {canEdit && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {freeNameFor === t.id || assigneeValue(t) === FREE ? (
                          <Input
                            className="h-8 text-xs"
                            defaultValue={t.assignee_name || ""}
                            placeholder="Nome do responsável (apague para escolher da lista)"
                            autoFocus={freeNameFor === t.id}
                            onBlur={(e) => {
                              setFreeNameFor(null);
                              if (e.target.value !== (t.assignee_name || "")) update(t, { assignee_id: "", assignee_name: e.target.value });
                            }}
                          />
                        ) : (
                          <Select
                            value={assigneeValue(t)}
                            onValueChange={(v) => {
                              if (v === FREE) setFreeNameFor(t.id);
                              else update(t, { assignee_id: v === NONE ? "" : v, assignee_name: "" });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>Sem responsável</SelectItem>
                              {people.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}{p.has_whatsapp ? " 📱" : ""}</SelectItem>
                              ))}
                              <SelectItem value={FREE}>Outra pessoa (digitar nome)…</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={t.due_date || ""}
                          onChange={(e) => update(t, { due_date: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {canEdit && (
              <div className="space-y-3 border-t border-border pt-3">
                <div className="flex gap-2">
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && add()}
                    placeholder="Nova tarefa (ex.: Buffet, Som, Blusas)"
                  />
                  <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
                </div>
                {templates.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    Usar modelo:
                    {templates.map((tpl) => (
                      <Button key={tpl.id} size="sm" variant="outline" onClick={() => applyTemplate(tpl.id)}>
                        {tpl.name} ({tpl.items.length})
                      </Button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  📱 = recebe lembrete no WhatsApp 2 dias antes e no dia do prazo.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
