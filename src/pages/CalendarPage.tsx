import { useEffect, useMemo, useState } from "react";
import { cap } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameYear,
  isToday,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, ListChecks, Loader2, Lock, MapPin, Pencil, Repeat } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIES, EventItem, STATUS_LABEL, canManageEvent, categoryOf, eventColor, locationLabel } from "@/lib/events";
import EventRosterPanel from "@/components/events/EventRosterPanel";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_PER_DAY = 3;
const NO_CATEGORY = "__none";

/** Semanas completas (domingo a sábado) que cobrem o mês */
const monthGrid = (month: Date) =>
  eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });

export default function CalendarPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "year">("month");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [hidden, setHidden] = useState<string[]>([]);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [dayList, setDayList] = useState<Date | null>(null);

  useEffect(() => {
    api.get<EventItem[]>("/api/events")
      .then((data) => setEvents((data || []).filter((e) => e.status !== "rejected")))
      .catch((error: any) => toast({ title: "Erro ao carregar eventos", description: error.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () => events.filter((e) => !hidden.includes(e.category || NO_CATEGORY)),
    [events, hidden]
  );

  // Eventos por dia (chave yyyy-MM-dd), já ordenados
  const byDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of [...visible].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))) {
      const k = format(new Date(e.starts_at), "yyyy-MM-dd");
      map.set(k, [...(map.get(k) || []), e]);
    }
    return map;
  }, [visible]);
  const eventsOn = (day: Date) => byDay.get(format(day, "yyyy-MM-dd")) || [];

  const count = visible.filter((e) =>
    view === "month" ? isSameMonth(new Date(e.starts_at), cursor) : isSameYear(new Date(e.starts_at), cursor)
  ).length;

  const toggleCategory = (value: string) =>
    setHidden((h) => (h.includes(value) ? h.filter((x) => x !== value) : [...h, value]));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const chipStyle = (ev: EventItem) => {
    const color = eventColor(ev);
    return ev.status !== "pending" && color ? { backgroundColor: `${color}26`, color } : undefined;
  };

  const eventChip = (ev: EventItem) => (
    <button
      key={ev.id}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(ev);
      }}
      title={ev.status === "pending" ? `${ev.title} (aguardando aprovação)` : ev.title}
      className={`w-full text-left truncate rounded px-1.5 py-0.5 text-[11px] leading-tight transition-opacity hover:opacity-80 ${
        ev.status === "pending" ? "border border-dashed border-warning/70 text-warning" : eventColor(ev) ? "" : "bg-primary/15 text-primary"
      }`}
      style={chipStyle(ev)}
    >
      <span className="font-semibold">{format(new Date(ev.starts_at), "HH:mm")}</span> {ev.title}
    </button>
  );

  const dot = (ev: EventItem, size = "w-1.5 h-1.5") => (
    <span key={ev.id} className={`${size} rounded-full`} style={{ backgroundColor: eventColor(ev) || "hsl(var(--primary))" }} />
  );

  const monthView = (
    <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground uppercase">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(cursor).map((day) => {
          const list = eventsOn(day);
          const inMonth = isSameMonth(day, cursor);
          return (
            <div
              key={day.toISOString()}
              onClick={() => list.length && setDayList(day)}
              className={`min-h-[72px] sm:min-h-[110px] border-b border-r border-border p-1 sm:p-1.5 space-y-1 ${
                inMonth ? "" : "bg-muted/30"
              } ${list.length ? "cursor-pointer" : ""}`}
            >
              <div className="flex justify-center sm:justify-start">
                <span
                  className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday(day) ? "bg-primary text-primary-foreground font-semibold" : inMonth ? "text-foreground" : "text-muted-foreground/60"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              {/* Celular: pontos coloridos por evento */}
              {list.length > 0 && <div className="flex justify-center gap-0.5 sm:hidden">{list.slice(0, 3).map((ev) => dot(ev))}</div>}
              <div className="hidden sm:block space-y-0.5">
                {list.slice(0, MAX_PER_DAY).map(eventChip)}
                {list.length > MAX_PER_DAY && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDayList(day);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground px-1.5"
                  >
                    +{list.length - MAX_PER_DAY} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const yearView = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 12 }, (_, i) => addMonths(startOfYear(cursor), i)).map((m) => {
        const n = visible.filter((e) => isSameMonth(new Date(e.starts_at), m)).length;
        return (
          <div key={m.toISOString()} className="rounded-lg border border-border bg-card p-3 shadow-card">
            <button
              className="w-full flex items-center justify-between mb-2 hover:text-primary"
              onClick={() => {
                setCursor(m);
                setView("month");
              }}
            >
              <span className="text-sm font-medium capitalize">{format(m, "MMMM", { locale: ptBR })}</span>
              {n > 0 && <span className="text-xs text-muted-foreground">{n} evento{n === 1 ? "" : "s"}</span>}
            </button>
            <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground mb-1">
              {WEEKDAYS.map((d) => <span key={d}>{d[0]}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {monthGrid(m).map((day) => {
                const list = isSameMonth(day, m) ? eventsOn(day) : [];
                return (
                  <button
                    key={day.toISOString()}
                    disabled={!list.length}
                    onClick={() => setDayList(day)}
                    title={list.map((e) => e.title).join("\n") || undefined}
                    className={`relative h-7 text-[11px] rounded flex flex-col items-center justify-center ${
                      !isSameMonth(day, m) ? "invisible" : ""
                    } ${isToday(day) ? "ring-1 ring-primary" : ""} ${list.length ? "font-semibold hover:bg-muted cursor-pointer" : "text-muted-foreground"}`}
                    style={list.length ? { backgroundColor: `${eventColor(list[0]) || "#2563eb"}22` } : undefined}
                  >
                    {format(day, "d")}
                    {list.length > 0 && <span className="flex gap-px absolute bottom-0.5">{list.slice(0, 3).map((ev) => dot(ev, "w-1 h-1"))}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const used = new Set(events.map((e) => e.category || NO_CATEGORY));
  const legend = [...CATEGORIES.filter((c) => used.has(c.value)), ...(used.has(NO_CATEGORY) ? [{ value: NO_CATEGORY, label: "Sem categoria", color: "" }] : [])];

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Calendário</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {count === 0 ? "Nenhum evento" : `${count} evento${count === 1 ? "" : "s"}`} {view === "month" ? "neste mês" : "neste ano"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-md border border-border p-0.5">
            {(["month", "year"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-sm rounded ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {v === "month" ? "Mês" : "Ano"}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => setCursor(startOfMonth(new Date()))}>Hoje</Button>
          <Button variant="ghost" size="icon" title="Anterior" onClick={() => setCursor(view === "month" ? subMonths(cursor, 1) : subYears(cursor, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Próximo" onClick={() => setCursor(view === "month" ? addMonths(cursor, 1) : addYears(cursor, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-lg font-medium min-w-[120px]">
            {view === "month" ? cap(format(cursor, "MMMM 'de' yyyy", { locale: ptBR })) : format(cursor, "yyyy")}
          </span>
        </div>
      </div>

      {legend.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {legend.map((c) => (
            <button
              key={c.value}
              onClick={() => toggleCategory(c.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
                hidden.includes(c.value) ? "border-border text-muted-foreground line-through opacity-60" : "border-border"
              }`}
              title={hidden.includes(c.value) ? "Mostrar" : "Esconder"}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color || "hsl(var(--primary))" }} />
              {c.label}
            </button>
          ))}
        </div>
      )}

      {view === "month" ? monthView : yearView}

      {/* Eventos de um dia */}
      <Dialog open={!!dayList} onOpenChange={(o) => !o && setDayList(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {dayList && cap(format(dayList, "EEEE, dd 'de' MMMM", { locale: ptBR }))}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            {dayList &&
              eventsOn(dayList).map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => {
                    setDayList(null);
                    setSelected(ev);
                  }}
                  className="w-full text-left rounded-md border border-border px-3 py-2 hover:border-primary/40 transition-colors flex gap-2"
                >
                  <span className="w-1 rounded-full shrink-0" style={{ backgroundColor: eventColor(ev) || "hsl(var(--primary))" }} />
                  <span>
                    <span className="block text-sm font-medium">{ev.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {format(new Date(ev.starts_at), "HH:mm")}
                      {locationLabel(ev) ? ` · ${locationLabel(ev)}` : ""}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detalhes do evento */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {categoryOf(selected.category) && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                    style={{ backgroundColor: `${categoryOf(selected.category)!.color}22`, color: categoryOf(selected.category)!.color }}
                  >
                    {categoryOf(selected.category)!.label}
                  </span>
                )}
                <p className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span>
                    {cap(format(new Date(selected.starts_at), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }))}
                    {selected.ends_at && ` até ${format(new Date(selected.ends_at), "HH:mm")}`}
                  </span>
                </p>
                {locationLabel(selected) && (
                  <p className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    {locationLabel(selected)}
                  </p>
                )}
                {selected.ministries.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selected.ministries.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
                        {m.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />}
                        {m.name}
                      </span>
                    ))}
                  </div>
                )}
                {selected.tasks_total > 0 && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <ListChecks className="w-4 h-4 shrink-0" />
                    Checklist: {selected.tasks_done} de {selected.tasks_total} itens concluídos
                  </p>
                )}
                {selected.series_id && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Repeat className="w-4 h-4 shrink-0" />
                    Evento que se repete
                  </p>
                )}
                {selected.status === "pending" && (
                  <Badge variant="outline" className="text-warning border-warning/40">{STATUS_LABEL.pending}</Badge>
                )}
                {selected.description && (
                  <p className="whitespace-pre-line text-muted-foreground border-t border-border pt-3">
                    {selected.description}
                  </p>
                )}
                {!selected.is_public && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" />
                    Não aparece no calendário público
                  </Badge>
                )}
                <EventRosterPanel eventId={selected.id} canEdit={user?.role === "admin" || user?.role === "agenda"} />
              </div>
              {canManageEvent(user, selected) && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => navigate("/admin/agenda")}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar na Agenda
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
