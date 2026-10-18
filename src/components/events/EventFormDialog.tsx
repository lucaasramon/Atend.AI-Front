import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Loader2, Repeat } from "lucide-react";
import {
  MAX_OCCURRENCES,
  NTH_LABEL,
  RepeatFreq,
  RepeatSpec,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
  describeRepeat,
  occurrenceAt,
  repeatDates,
  weekdayOf,
} from "@/lib/recurrence";
import { cap } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, Conflict, EventItem, Location, Ministry, ReminderConfig, whenLabel } from "@/lib/events";
import OffsetPicker from "./OffsetPicker";
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
  // Lembretes: padrão, dias escolhidos ou nenhum
  reminder_mode: "default" as "default" | "custom" | "off",
  offset_days: [] as number[],
  ministry_ids: [] as string[],
  location_ids: [] as string[],
  category: "",
  // Repetição (só no cadastro): quando ativa, as datas vêm destes parâmetros
  repeat: "none" as "none" | RepeatFreq,
  rep_start_date: "",
  rep_until: "",
  rep_start_time: "19:00",
  rep_end_time: "",
  rep_interval: 1,
  rep_weekdays: [] as number[],
  rep_month_day: 1,
  rep_nth: 1,
  rep_weekday: 0,
};

const REPEATS: { value: "none" | RepeatFreq; label: string }[] = [
  { value: "none", label: "Não se repete" },
  { value: "weekly", label: "Semanal (escolher os dias da semana)" },
  { value: "monthly_day", label: "Mensal, no mesmo dia (ex.: todo dia 10)" },
  { value: "monthly_nth", label: "Mensal, por semana (ex.: toda 1ª sexta)" },
];

const today = () => format(new Date(), "yyyy-MM-dd");
const plusMonths = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setMonth(d.getMonth() + n);
  return format(d, "yyyy-MM-dd");
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
  // Quem não é admin só escolhe entre as suas áreas
  const isAdminUser = user?.role === "admin";
  const myMinistries = isAdminUser ? ministries : ministries.filter((m) => user?.ministry_ids?.includes(m.id));

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
            ...emptyForm,
            title: event.title,
            description: event.description || "",
            location: event.location || "",
            starts_at: toLocalInput(event.starts_at),
            ends_at: toLocalInput(event.ends_at),
            is_public: event.is_public,
            group_jid: event.group_jid || "",
            reminder_mode: event.reminders_off ? "off" : event.reminder_offsets?.length ? "custom" : "default",
            offset_days: event.reminder_offsets?.length ? [...event.reminder_offsets] : [...config.offsets],
            ministry_ids: event.ministries.map((m) => m.id),
            location_ids: event.locations.map((l) => l.id),
            category: event.category || "",
          }
        : {
            ...emptyForm,
            offset_days: [...config.offsets],
            // Com uma área só, já vem marcada
            ministry_ids: !isAdminUser && user?.ministry_ids?.length === 1 ? [...user.ministry_ids] : [],
          }
    );
  }, [open, event]);

  // ---------- Repetição ----------
  const repeating = !event && form.repeat !== "none";
  const spec: RepeatSpec | null = repeating
    ? {
        freq: form.repeat as RepeatFreq,
        start_date: form.rep_start_date,
        until: form.rep_until,
        start_time: form.rep_start_time,
        end_time: form.rep_end_time || null,
        interval: form.rep_interval,
        weekdays: form.rep_weekdays,
        month_day: form.rep_month_day,
        nth: form.rep_nth,
        weekday: form.rep_weekday,
      }
    : null;
  const repDates = useMemo(() => (spec ? repeatDates(spec) : []), [JSON.stringify(spec)]);
  const firstOccurrence = spec && repDates.length ? occurrenceAt(repDates[0], spec.start_time, spec.end_time) : null;

  /** Ao escolher um tipo de repetição, preenche os parâmetros a partir da data já digitada (ou de hoje) */
  const chooseRepeat = (value: "none" | RepeatFreq) => {
    if (value === "none") return setForm({ ...form, repeat: "none" });
    const base = form.starts_at || `${today()}T${form.rep_start_time}`;
    const day = base.slice(0, 10);
    const dayNum = Number(day.slice(8, 10));
    setForm({
      ...form,
      repeat: value,
      rep_start_date: form.rep_start_date || day,
      rep_until: form.rep_until || plusMonths(day, 3),
      rep_start_time: base.slice(11, 16) || form.rep_start_time,
      rep_end_time: form.rep_end_time || (form.ends_at ? form.ends_at.slice(11, 16) : ""),
      rep_weekdays: form.rep_weekdays.length ? form.rep_weekdays : [weekdayOf(day)],
      rep_month_day: dayNum,
      rep_nth: dayNum > 28 ? 5 : Math.ceil(dayNum / 7),
      rep_weekday: weekdayOf(day),
    });
  };

  const toggleWeekday = (d: number) =>
    setForm({
      ...form,
      rep_weekdays: form.rep_weekdays.includes(d) ? form.rep_weekdays.filter((x) => x !== d) : [...form.rep_weekdays, d],
    });

  // Início/término efetivos (na repetição, a 1ª data gerada)
  const effStart = firstOccurrence ? firstOccurrence.starts_at : form.starts_at ? new Date(form.starts_at).toISOString() : "";
  const effEnd = firstOccurrence ? firstOccurrence.ends_at : form.ends_at ? new Date(form.ends_at).toISOString() : null;

  // Confere conflitos de horário/local enquanto o formulário é preenchido
  useEffect(() => {
    if (!open || !effStart) {
      setConflicts([]);
      return;
    }
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ starts_at: effStart, location: form.location });
      if (effEnd) qs.set("ends_at", effEnd);
      if (event) qs.set("exclude_id", event.id);
      if (form.location_ids.length) qs.set("location_ids", form.location_ids.join(","));
      if (form.ministry_ids.length) qs.set("ministry_ids", form.ministry_ids.join(","));
      api.get<Conflict[]>(`/api/events/conflicts?${qs}`).then(setConflicts).catch(() => setConflicts([]));
    }, 500);
    return () => clearTimeout(t);
  }, [open, effStart, effEnd, form.location, form.location_ids, form.ministry_ids]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Preencha o título", variant: "destructive" });
      return;
    }
    if (repeating) {
      if (!form.rep_start_date || !form.rep_until || !form.rep_start_time) {
        toast({ title: "Preencha a primeira data, até quando e o horário", variant: "destructive" });
        return;
      }
      if (form.repeat === "weekly" && !form.rep_weekdays.length) {
        toast({ title: "Escolha pelo menos um dia da semana", variant: "destructive" });
        return;
      }
      if (!repDates.length) {
        toast({ title: "Nenhuma data nesse período", description: "Confira a primeira data, a data final e os dias escolhidos.", variant: "destructive" });
        return;
      }
    } else {
      if (!form.starts_at) {
        toast({ title: "Preencha a data e a hora de início", variant: "destructive" });
        return;
      }
      if (form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
        toast({ title: "O término deve ser depois do início", variant: "destructive" });
        return;
      }
    }
    if (!isAdminUser && !form.ministry_ids.some((id) => user?.ministry_ids?.includes(id))) {
      toast({ title: "Escolha a área do evento", description: "Você só pode criar eventos das suas áreas.", variant: "destructive" });
      return;
    }
    if (form.reminder_mode === "custom" && !form.offset_days.length) {
      toast({ title: "Informe ao menos uma antecedência", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      category: form.category || null,
      ...(spec ? { repeat: spec } : {}),
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      starts_at: effStart,
      ends_at: effEnd,
      is_public: form.is_public,
      group_jid: form.group_jid,
      reminder_offsets: form.reminder_mode === "custom" ? form.offset_days : null,
      reminders_off: form.reminder_mode === "off",
      ministry_ids: form.ministry_ids,
      location_ids: form.location_ids,
    };
    try {
      const saved = event
        ? await api.patch<EventItem & { series_count?: number }>(`/api/events/${event.id}`, body)
        : await api.post<EventItem & { series_count?: number }>("/api/events", body);
      const many = (saved.series_count || 1) > 1 ? `${saved.series_count} datas criadas. ` : "";
      toast(
        saved.status === "pending"
          ? { title: "Enviado para aprovação", description: `${many}Os administradores foram avisados.` }
          : { title: event ? "Evento atualizado" : "Evento criado", description: many || undefined }
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
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={form.category || "none"} onValueChange={(v) => setForm({ ...form, category: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!event && (
            <div className="space-y-2">
              <Label>Repetição</Label>
              <Select value={form.repeat} onValueChange={(v) => chooseRepeat(v as "none" | RepeatFreq)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPEATS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!repeating ? (
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
          ) : (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-4">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <Repeat className="w-4 h-4" />
                Como o evento se repete
              </p>

              {form.repeat === "weekly" && (
                <>
                  <div className="space-y-2">
                    <Label>Dias da semana *</Label>
                    <div className="grid grid-cols-7 gap-1">
                      {WEEKDAYS_SHORT.map((d, i) => {
                        const on = form.rep_weekdays.includes(i);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleWeekday(i)}
                            title={WEEKDAYS_LONG[i]}
                            className={`h-9 rounded-md border text-xs font-medium transition-colors ${
                              on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select value={String(form.rep_interval)} onValueChange={(v) => setForm({ ...form, rep_interval: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Toda semana</SelectItem>
                        <SelectItem value="2">A cada 2 semanas (quinzenal)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {form.repeat === "monthly_day" && (
                <div className="space-y-2">
                  <Label>Dia do mês *</Label>
                  <Select value={String(form.rep_month_day)} onValueChange={(v) => setForm({ ...form, rep_month_day: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>Todo dia {d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.rep_month_day > 28 && (
                    <p className="text-xs text-muted-foreground">Nos meses que não têm o dia {form.rep_month_day}, usa o último dia do mês.</p>
                  )}
                </div>
              )}

              {form.repeat === "monthly_nth" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Semana do mês *</Label>
                    <Select value={String(form.rep_nth)} onValueChange={(v) => setForm({ ...form, rep_nth: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>{NTH_LABEL[n]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dia da semana *</Label>
                    <Select value={String(form.rep_weekday)} onValueChange={(v) => setForm({ ...form, rep_weekday: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS_LONG.map((d, i) => (
                          <SelectItem key={d} value={String(i)}>{cap(d)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rep_start_time">Horário de início *</Label>
                  <Input id="rep_start_time" type="time" value={form.rep_start_time} onChange={(e) => setForm({ ...form, rep_start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rep_end_time">Horário de término</Label>
                  <Input id="rep_end_time" type="time" value={form.rep_end_time} onChange={(e) => setForm({ ...form, rep_end_time: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rep_start_date">A partir de *</Label>
                  <Input id="rep_start_date" type="date" value={form.rep_start_date} onChange={(e) => setForm({ ...form, rep_start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rep_until">Até *</Label>
                  <Input id="rep_until" type="date" min={form.rep_start_date} value={form.rep_until} onChange={(e) => setForm({ ...form, rep_until: e.target.value })} />
                </div>
              </div>

              {/* Prévia das datas */}
              {spec && (
                <div className="rounded-md bg-background/60 p-2.5 space-y-1.5">
                  <p className="text-xs font-medium">{describeRepeat(spec)}</p>
                  {repDates.length ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Serão criadas <b className="text-foreground">{repDates.length}</b> datas
                        {repDates.length >= MAX_OCCURRENCES && ` (limite de ${MAX_OCCURRENCES})`}:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {repDates.slice(0, 8).map((d) => (
                          <span key={d} className="rounded border border-border px-1.5 py-0.5 text-[11px]">
                            {format(new Date(`${d}T12:00:00`), "EEE dd/MM", { locale: ptBR })}
                          </span>
                        ))}
                        {repDates.length > 8 && (
                          <span className="text-[11px] text-muted-foreground px-1">
                            … até {format(new Date(`${repDates[repDates.length - 1]}T12:00:00`), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-destructive">Nenhuma data nesse período. Confira as datas e os dias escolhidos.</p>
                  )}
                </div>
              )}
            </div>
          )}
          {event?.series_id && (
            <p className="text-xs text-muted-foreground">🔁 Este evento faz parte de uma série. A edição vale só para esta data.</p>
          )}
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
            <Label>{isAdminUser ? "Áreas / ministérios envolvidos" : "Área do evento *"}</Label>
            <ChipSelect
              options={myMinistries}
              value={form.ministry_ids}
              onChange={(ids) => setForm({ ...form, ministry_ids: ids })}
              empty={
                isAdminUser
                  ? "Nenhum ministério cadastrado (cadastre em Ministérios)"
                  : "Seu usuário ainda não tem área. Peça a um administrador para incluir em Usuários."
              }
            />
            {!isAdminUser && event && event.ministries.some((m) => !user?.ministry_ids?.includes(m.id)) && (
              <p className="text-xs text-muted-foreground">
                Também neste evento (de outras áreas): {event.ministries.filter((m) => !user?.ministry_ids?.includes(m.id)).map((m) => m.name).join(", ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {isAdminUser ? "" : "Você só pode criar eventos das suas áreas. "}Os grupos dessas áreas também recebem os lembretes.
            </p>
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

          <div className="space-y-3 rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Lembretes no WhatsApp</p>
              <p className="text-xs text-muted-foreground">Com quantos dias de antecedência o robô avisa nos grupos</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {([
                ["default", "Padrão"],
                ["custom", "Escolher os dias"],
                ["off", "Não lembrar"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setForm({ ...form, reminder_mode: mode })}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    form.reminder_mode === mode ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.reminder_mode === "default" && (
              <p className="text-xs text-muted-foreground">
                Usa o padrão da agenda: {config.offsets.map(whenLabel).join(", ") || "nenhum"}.
              </p>
            )}
            {form.reminder_mode === "custom" && (
              <OffsetPicker value={form.offset_days} onChange={(d) => setForm({ ...form, offset_days: d })} />
            )}
            {form.reminder_mode === "off" && (
              <p className="text-xs text-muted-foreground">
                O robô não manda lembretes deste evento{repeating ? " (em nenhuma das datas)" : ""}. Ele continua no calendário e nos resumos do mês e da semana.
              </p>
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
