import { useEffect, useMemo, useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CalendarDays, Copy, LayoutGrid, ListOrdered, Sparkles, UserPlus, Users } from "lucide-react";
import { cap } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Ministry, RosterEntry } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RosterMember } from "@/components/events/RosterBuilderDialog";

interface OverviewEvent {
  id: string;
  title: string;
  starts_at: string;
  status: string;
  ministries: { id: string; name: string; color: string | null }[];
  roster: RosterEntry[];
}

interface Props {
  events: OverviewEvent[];
  ministries: Ministry[];
  members: (RosterMember & { user_id?: string | null })[];
  userId?: string;
  userMinistryIds?: string[];
  period: string;
  periods: { value: string; label: string }[];
  onPeriod: (v: string) => void;
  /** Abre o modal de escala já no evento e na área */
  onEdit?: (eventId: string, ministryId: string) => void;
  canEditMinistry: (id: string) => boolean;
}

type Mode = "dates" | "grid";
const AREA_KEY = "roster:area";
const MODE_KEY = "roster:area-mode";

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k) || "";
    } catch {
      return "";
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* sem armazenamento */
    }
  },
};

const dayName = (d: Date) => (isToday(d) ? "Hoje" : isTomorrow(d) ? "Amanhã" : cap(format(d, "EEEE", { locale: ptBR })));
const firstName = (n: string) => n.split(" ")[0];

/** Escala de UMA área, organizada por data (e em quadro pessoas × datas para o líder) */
export default function AreaRosterView({ events, ministries, members, userId, userMinistryIds, period, periods, onPeriod, onEdit, canEditMinistry }: Props) {
  const { toast } = useToast();

  // Áreas com algo no período (escala ou evento da área); a da pessoa primeiro
  const areaOptions = useMemo(() => {
    const used = new Set(events.flatMap((e) => [...e.roster.map((r) => r.ministry_id), ...e.ministries.map((m) => m.id)]));
    return ministries
      .filter((m) => used.has(m.id) || userMinistryIds?.includes(m.id))
      .sort((a, b) => Number(!!userMinistryIds?.includes(b.id)) - Number(!!userMinistryIds?.includes(a.id)) || a.name.localeCompare(b.name, "pt-BR"));
  }, [events, ministries, userMinistryIds]);

  const [areaId, setAreaId] = useState(() => store.get(AREA_KEY));
  const [mode, setMode] = useState<Mode>(() => (store.get(MODE_KEY) === "grid" ? "grid" : "dates"));
  const [onlyMine, setOnlyMine] = useState(false);

  // Sem área escolhida (ou não existe mais): a primeira da pessoa, senão a primeira com escala
  useEffect(() => {
    if (areaOptions.length && !areaOptions.some((a) => a.id === areaId)) setAreaId(areaOptions[0].id);
  }, [areaOptions]);
  useEffect(() => {
    if (areaId) store.set(AREA_KEY, areaId);
  }, [areaId]);
  useEffect(() => store.set(MODE_KEY, mode), [mode]);

  const area = ministries.find((m) => m.id === areaId);
  const me = members.find((m) => m.user_id && m.user_id === userId);

  // Datas da área: eventos com escala dela ou que pertencem a ela (mesmo sem escala ainda)
  const days = useMemo(
    () =>
      events
        .filter((e) => e.roster.some((r) => r.ministry_id === areaId) || e.ministries.some((m) => m.id === areaId))
        .map((e) => ({
          ...e,
          people: e.roster
            .filter((r) => r.ministry_id === areaId)
            .sort((a, b) => (a.task || a.area || "").localeCompare(b.task || b.area || "", "pt-BR") || a.member.localeCompare(b.member, "pt-BR")),
        })),
    [events, areaId]
  );

  const shown = onlyMine && me ? days.filter((d) => d.people.some((p) => p.member_id === me.id)) : days;
  const myNext = me ? days.filter((d) => d.people.some((p) => p.member_id === me.id)) : [];

  // Quadro: pessoas da área + quem foi escalado nela
  const gridPeople = useMemo(() => {
    const ids = new Set([
      ...members.filter((m) => m.active && m.ministries.some((x) => x.id === areaId)).map((m) => m.id),
      ...days.flatMap((d) => d.people.map((p) => p.member_id)),
    ]);
    return Array.from(ids)
      .map((id) => {
        const m = members.find((x) => x.id === id);
        const name = m?.name || days.flatMap((d) => d.people).find((p) => p.member_id === id)?.member || "—";
        const count = days.filter((d) => d.people.some((p) => p.member_id === id)).length;
        return { id, name, count };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
  }, [members, days, areaId]);

  const stats = useMemo(() => {
    const withRoster = days.filter((d) => d.people.length).length;
    const top = gridPeople[0];
    return {
      dates: days.length,
      gaps: days.length - withRoster,
      people: gridPeople.filter((p) => p.count > 0).length,
      idle: gridPeople.filter((p) => p.count === 0).length,
      top: top && top.count > 1 ? top : null,
    };
  }, [days, gridPeople]);

  // Texto pronto para o grupo do WhatsApp
  const copyText = async () => {
    const lines = [`👥 *Escala — ${area?.name}*`, ""];
    for (const d of days) {
      const date = new Date(d.starts_at);
      lines.push(`📅 *${cap(format(date, "EEE dd/MM", { locale: ptBR }))} · ${format(date, "HH:mm")}* — ${d.title}`);
      if (!d.people.length) lines.push("   (sem escala ainda)");
      for (const p of d.people) lines.push(`   • ${p.member}${p.task || p.area ? ` — ${p.task || p.area}` : ""}`);
      lines.push("");
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      toast({ title: "Escala copiada", description: "Cole no grupo do WhatsApp da área." });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  if (!areaOptions.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Nenhuma área com escala ou evento no período.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Escolha da área */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {areaOptions.map((a) => {
          const on = a.id === areaId;
          return (
            <button
              key={a.id}
              onClick={() => setAreaId(a.id)}
              className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                on ? "bg-primary border-primary text-primary-foreground font-semibold shadow-sm" : "border-border bg-card hover:bg-muted"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color || "#999" }} />
              {a.name}
              {userMinistryIds?.includes(a.id) && <span className={`text-[10px] ${on ? "opacity-70" : "text-muted-foreground"}`}>minha</span>}
            </button>
          );
        })}
      </div>

      {/* Você está escalado */}
      {me && myNext.length > 0 && (
        <div className="rounded-xl bg-primary text-primary-foreground p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Sparkles className="w-6 h-6 shrink-0 hidden sm:block" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Você está escalado em {myNext.length} data{myNext.length > 1 ? "s" : ""} na {area?.name}</p>
            <p className="text-sm opacity-90 truncate">
              {myNext.slice(0, 4).map((d) => {
                const mine = d.people.find((p) => p.member_id === me.id);
                return `${cap(format(new Date(d.starts_at), "EEE dd/MM", { locale: ptBR }))}${mine?.task || mine?.area ? ` (${mine.task || mine.area})` : ""}`;
              }).join(" · ")}
              {myNext.length > 4 && " …"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium shrink-0">
            <Switch checked={onlyMine} onCheckedChange={setOnlyMine} className="data-[state=checked]:bg-primary-foreground" />Só as minhas
          </label>
        </div>
      )}

      {/* Resumo da área */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Stat label="Datas no período" value={stats.dates} />
        <Stat label="Pessoas escaladas" value={stats.people} />
        <Stat label="Datas sem escala" value={stats.gaps} warn={stats.gaps > 0} />
        <Stat
          label={stats.top ? `Mais escalado: ${firstName(stats.top.name)}` : "Ainda não serviram"}
          value={stats.top ? `${stats.top.count}×` : stats.idle}
        />
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Select value={period} onValueChange={onPeriod}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{periods.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="inline-flex rounded-md border border-border p-0.5 bg-muted">
            <button onClick={() => setMode("dates")} className={`inline-flex items-center gap-1.5 rounded px-3 text-sm ${mode === "dates" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground"}`}>
              <ListOrdered className="w-4 h-4" />Datas
            </button>
            <button onClick={() => setMode("grid")} className={`inline-flex items-center gap-1.5 rounded px-3 text-sm ${mode === "grid" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground"}`}>
              <LayoutGrid className="w-4 h-4" />Quadro
            </button>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={copyText} disabled={!days.length}><Copy className="w-4 h-4 mr-2" />Copiar escala para o WhatsApp</Button>
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Nenhuma data com {area?.name} no período.</p>
      ) : mode === "dates" ? (
        /* ---------- Datas: um cartão por dia ---------- */
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((d) => {
            const date = new Date(d.starts_at);
            const mine = me && d.people.some((p) => p.member_id === me.id);
            return (
              <div key={d.id} className={`rounded-xl border bg-card overflow-hidden flex flex-col ${mine ? "border-primary ring-2 ring-primary/40" : "border-border"}`}>
                <div className={`flex items-center gap-3 px-4 py-3 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <div className="text-center leading-none w-11 shrink-0">
                    <p className="text-[11px] uppercase font-semibold opacity-80">{format(date, "MMM", { locale: ptBR })}</p>
                    <p className="text-3xl font-bold">{format(date, "dd")}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{dayName(date)} · {format(date, "HH:mm")}</p>
                    <p className={`text-xs truncate ${mine ? "opacity-80" : "text-muted-foreground"}`}>{d.title}</p>
                  </div>
                  {mine && <Badge className="bg-primary-foreground text-[hsl(var(--primary))] hover:bg-primary-foreground shrink-0">Você</Badge>}
                </div>
                <div className="p-3 flex-1 space-y-1.5">
                  {d.people.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm text-warning py-2"><AlertTriangle className="w-4 h-4" />Ninguém escalado ainda</p>
                  ) : (
                    d.people.map((p) => {
                      const isMe = me && p.member_id === me.id;
                      return (
                        <div key={p.id} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${isMe ? "bg-primary/15" : ""}`}>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {p.member.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                          </span>
                          <span className={`text-sm flex-1 min-w-0 truncate ${isMe ? "font-semibold" : ""}`}>{p.member}</span>
                          {(p.task || p.area) && <span className="text-xs text-muted-foreground shrink-0 max-w-[45%] truncate">{p.task || p.area}</span>}
                        </div>
                      );
                    })
                  )}
                </div>
                {onEdit && canEditMinistry(areaId) && (
                  <button
                    onClick={() => onEdit(d.id, areaId)}
                    className="border-t border-border px-4 py-2 text-xs font-medium text-left hover:bg-muted flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />{d.people.length ? "Editar escala" : "Escalar pessoas"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ---------- Quadro: pessoas × datas ---------- */
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="text-sm border-collapse min-w-full">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-muted text-left font-medium px-3 py-2 min-w-[150px]">
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />Pessoa</span>
                </th>
                {days.map((d) => {
                  const date = new Date(d.starts_at);
                  return (
                    <th key={d.id} className={`px-2 py-2 text-center font-medium min-w-[72px] ${d.people.length ? "bg-muted" : "bg-warning/15"}`} title={d.title}>
                      <p className="text-[11px] uppercase text-muted-foreground">{format(date, "EEE", { locale: ptBR })}</p>
                      <p className="text-base font-bold leading-tight">{format(date, "dd/MM")}</p>
                      <p className="text-[10px] text-muted-foreground font-normal">{format(date, "HH:mm")}</p>
                    </th>
                  );
                })}
                <th className="px-3 py-2 bg-muted text-center font-medium">Vezes</th>
              </tr>
            </thead>
            <tbody>
              {gridPeople.map((person) => {
                const isMe = me && person.id === me.id;
                return (
                  <tr key={person.id} className="border-t border-border">
                    <td className={`sticky left-0 z-10 px-3 py-2 whitespace-nowrap ${isMe ? "bg-primary/15 font-semibold" : "bg-card"}`}>
                      {person.name}{isMe && <span className="text-[10px] ml-1.5 text-muted-foreground">(você)</span>}
                    </td>
                    {days.map((d) => {
                      const entry = d.people.find((p) => p.member_id === person.id);
                      return (
                        <td key={d.id} className="px-1.5 py-1.5 text-center">
                          {entry ? (
                            <span
                              className="inline-block max-w-[96px] truncate rounded-md bg-primary text-primary-foreground text-[11px] font-medium px-1.5 py-1"
                              title={entry.task || entry.area || "Escalado"}
                            >
                              {entry.task || entry.area || "✓"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex min-w-[28px] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        person.count === 0 ? "bg-muted text-muted-foreground" : person.count >= 3 ? "bg-warning/20 text-warning" : "bg-primary/20"
                      }`}>
                        {person.count}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-muted-foreground px-3 py-2 border-t border-border">
            Colunas em laranja: datas sem ninguém escalado. "Vezes" em laranja: 3 ou mais escalas no período.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${warn ? "border-warning/40 bg-warning/10" : "border-border bg-card"}`}>
      <p className={`text-2xl font-semibold ${warn ? "text-warning" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground truncate">{label}</p>
    </div>
  );
}
