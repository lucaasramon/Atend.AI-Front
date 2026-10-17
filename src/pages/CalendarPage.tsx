import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Loader2, Lock, MapPin, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventItem, STATUS_LABEL, eventColor, locationLabel } from "@/lib/events";

type CalendarEvent = EventItem;

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_PER_DAY = 3;

export default function CalendarPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "agenda";
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [dayList, setDayList] = useState<Date | null>(null);

  useEffect(() => {
    api.get<CalendarEvent[]>("/api/events")
      .then((data) => setEvents((data || []).filter((e) => e.status !== "rejected")))
      .catch((error: any) => toast({ title: "Erro ao carregar eventos", description: error.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  // Grade de semanas completas que cobre o mês (domingo a sábado)
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
      }),
    [month]
  );

  const eventsOn = (day: Date) =>
    events
      .filter((e) => isSameDay(new Date(e.starts_at), day))
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const monthCount = events.filter((e) => isSameMonth(new Date(e.starts_at), month)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const eventChip = (ev: CalendarEvent) => (
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
      style={
        ev.status !== "pending" && eventColor(ev)
          ? { backgroundColor: `${eventColor(ev)}26`, color: eventColor(ev)! }
          : undefined
      }
    >
      <span className="font-semibold">{format(new Date(ev.starts_at), "HH:mm")}</span> {ev.title}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Calendário</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {monthCount === 0 ? "Nenhum evento neste mês" : `${monthCount} evento${monthCount === 1 ? "" : "s"} neste mês`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setMonth(startOfMonth(new Date()))}>Hoje</Button>
          <Button variant="ghost" size="icon" title="Mês anterior" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-lg font-medium capitalize min-w-[160px]">
            {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const list = eventsOn(day);
            const inMonth = isSameMonth(day, month);
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
                      isToday(day)
                        ? "bg-primary text-primary-foreground font-semibold"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/60"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                {/* Celular: só um ponto por dia com evento */}
                {list.length > 0 && (
                  <div className="flex justify-center gap-0.5 sm:hidden">
                    {list.slice(0, 3).map((ev) => (
                      <span key={ev.id} className="w-1.5 h-1.5 rounded-full bg-primary" />
                    ))}
                  </div>
                )}
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

      {/* Eventos de um dia */}
      <Dialog open={!!dayList} onOpenChange={(o) => !o && setDayList(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {dayList && format(dayList, "EEEE, dd 'de' MMMM", { locale: ptBR })}
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
                  className="w-full text-left rounded-md border border-border px-3 py-2 hover:border-primary/40 transition-colors"
                >
                  <p className="text-sm font-medium">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(ev.starts_at), "HH:mm")}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </p>
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
                <p className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span className="capitalize">
                    {format(new Date(selected.starts_at), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
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
              </div>
              {canEdit && <DialogFooter>
                <Button variant="outline" onClick={() => navigate("/admin/agenda")}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar na Agenda
                </Button>
              </DialogFooter>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
