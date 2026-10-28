// Gráficos dos Cadastros na tela Início (só admin e pastores)
import { useEffect, useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { MARITAL_LABEL, Relation } from "@/lib/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NeighborhoodMap, { MapPoint } from "@/components/NeighborhoodMap";

interface Row { relation: Relation; key: string | boolean | null; n: number; years?: number; lat?: number | null; lng?: number | null }
interface Stats {
  age: Row[]; gender: Row[]; marital: Row[]; baptized: Row[];
  how_found: Row[]; neighborhood: Row[]; interests: Row[]; monthly: Row[];
  locating: number; // bairros ainda sendo procurados no mapa
}
type Filter = "all" | Relation;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "member", label: "Membros" },
  { value: "regular", label: "Frequentadores" },
  { value: "visitor", label: "Visitantes" },
];
const RELATIONS: { key: Relation; label: string; color: string }[] = [
  { key: "member", label: "Membros", color: "var(--viz-member)" },
  { key: "regular", label: "Frequentadores", color: "var(--viz-regular)" },
  { key: "visitor", label: "Visitantes", color: "var(--viz-visitor)" },
];
const AGE_BANDS = [
  { key: "child", label: "Crianças", range: "0–11" },
  { key: "teen", label: "Adolescentes", range: "12–17" },
  { key: "young", label: "Jovens", range: "18–29" },
  { key: "adult", label: "Adultos", range: "30–59" },
  { key: "senior", label: "Idosos", range: "60+" },
];
const NONE = "hsl(var(--muted-foreground) / 0.35)";
const tooltipStyle = {
  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8,
  color: "hsl(var(--popover-foreground))", fontSize: 12,
};
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/** Soma as linhas do filtro por chave */
function tally(rows: Row[], f: Filter) {
  const m = new Map<string, number>();
  for (const r of rows) if (f === "all" || r.relation === f) m.set(String(r.key), (m.get(String(r.key)) || 0) + r.n);
  return m;
}
/** Maiores primeiro; o que passar de `max` vira "Outros" */
function ranked(m: Map<string, number>, max: number, label = (k: string) => k) {
  const all = [...m].filter(([k]) => k !== "null").sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ label: label(k), n }));
  if (all.length <= max) return all;
  return [...all.slice(0, max - 1), { label: "Outros", n: all.slice(max - 1).reduce((s, x) => s + x.n, 0) }];
}

export default function ChurchStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    api.get<Stats>("/api/home/stats").then(setStats).catch(() => setError(true));
  }, []);

  const v = useMemo(() => {
    if (!stats) return null;
    const of = (rows: Row[]) => rows.filter((r) => filter === "all" || r.relation === filter);
    const gender = tally(stats.gender, filter);
    const total = [...gender.values()].reduce((s, n) => s + n, 0);
    const ages = of(stats.age);
    const withAge = ages.reduce((s, r) => s + r.n, 0);
    const bands = tally(stats.age, filter);
    const baptized = tally(stats.baptized, filter);
    // Bairros com posição no mapa (mesmo bairro em vínculos diferentes vira um ponto só)
    const spots = new Map<string, MapPoint>();
    let unplaced = 0;
    for (const r of of(stats.neighborhood)) {
      if (r.lat == null || r.lng == null) { unplaced += r.n; continue; }
      const k = String(r.key).toLowerCase();
      const s = spots.get(k);
      if (s) s.n += r.n;
      else spots.set(k, { label: String(r.key), n: r.n, lat: r.lat, lng: r.lng });
    }
    const months = Array.from({ length: 12 }, (_, i) => subMonths(new Date(), 11 - i));
    const monthly = months.map((d) => {
      const key = format(d, "yyyy-MM");
      const row: Record<string, string | number> = { month: format(d, "MMM", { locale: ptBR }).replace(".", "") };
      for (const r of RELATIONS) row[r.key] = stats.monthly.find((m) => m.key === key && m.relation === r.key)?.n || 0;
      return row;
    });
    return {
      total,
      avgAge: withAge ? Math.round(ages.reduce((s, r) => s + (r.years || 0), 0) / withAge) : null,
      women: gender.get("F") || 0,
      gender: [
        { label: "Mulheres", n: gender.get("F") || 0, color: "var(--viz-female)" },
        { label: "Homens", n: gender.get("M") || 0, color: "var(--viz-male)" },
        { label: "Não informado", n: gender.get("null") || 0, color: NONE },
      ],
      bands: AGE_BANDS.map((b) => ({ ...b, n: bands.get(b.key) || 0 })),
      withAge,
      baptized: [
        { label: "Batizados", n: baptized.get("true") || 0, color: "hsl(var(--primary))" },
        { label: "Não batizados", n: baptized.get("false") || 0, color: "hsl(var(--primary) / 0.35)" },
        { label: "Não informado", n: baptized.get("null") || 0, color: NONE },
      ],
      marital: ranked(tally(stats.marital, filter), 5, (k) => MARITAL_LABEL[k] || k),
      howFound: ranked(tally(stats.how_found, filter), 6),
      neighborhood: ranked(tally(stats.neighborhood, filter), 8),
      spots: [...spots.values()],
      unplaced,
      interests: ranked(tally(stats.interests, filter), 8),
      monthly,
      series: RELATIONS.filter((r) => filter === "all" || r.key === filter),
    };
  }, [stats, filter]);

  if (error) return null;

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-2 flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Perfil da igreja</CardTitle>
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${filter === f.value ? "bg-card shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!v ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : v.total === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Ainda não há cadastros {filter === "all" ? "" : "neste grupo "}para mostrar.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Tile value={String(v.total)} label="Pessoas cadastradas" />
              <Tile value={v.avgAge === null ? "—" : `${v.avgAge} anos`} label="Idade média" />
              <Tile value={`${pct(v.bands[0].n + v.bands[1].n, v.withAge)}%`} label="Crianças e adolescentes" />
              <Tile value={`${pct(v.women, v.total)}%`} label="Mulheres" />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Chart title="Faixa etária" note={v.withAge < v.total ? `${v.total - v.withAge} sem data de nascimento` : undefined}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={v.bands} margin={{ top: 20, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" interval={0} tickLine={false} axisLine={false} height={34} tick={<AgeTick />} />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={tooltipStyle}
                      formatter={(n: number) => [`${n} (${pct(n, v.withAge)}%)`, "Pessoas"]}
                      labelFormatter={(l: string) => `${l} (${AGE_BANDS.find((b) => b.label === l)?.range} anos)`}
                    />
                    <Bar dataKey="n" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      <LabelList dataKey="n" position="top" className="fill-foreground" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Chart>

              <Chart title="Novos cadastros (12 meses)">
                <ResponsiveContainer width="100%" height={196}>
                  <BarChart data={v.monthly} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} interval={0} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} />
                    {v.series.map((s) => (
                      <Bar key={s.key} dataKey={s.key} name={s.label} stackId="r" fill={s.color} stroke="hsl(var(--card))" strokeWidth={1} maxBarSize={28} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <Legend items={v.series.map((s) => ({ label: s.label, color: s.color }))} />
              </Chart>

              <Chart title="Homens e mulheres">
                <Split items={v.gender} />
              </Chart>

              <Chart title="Batismo" note="Membros e frequentadores">
                {filter === "visitor" ? <p className="text-sm text-muted-foreground">O cadastro não pergunta batismo a visitantes.</p> : <Split items={v.baptized} />}
              </Chart>

              <div className="grid gap-5 lg:col-span-2 lg:grid-cols-3">
                <Chart title="Estado civil"><Bars items={v.marital} /></Chart>
                <Chart title="Como conheceu a igreja" note="Visitantes">
                  {filter === "member" || filter === "regular" ? <p className="text-sm text-muted-foreground">Essa pergunta só aparece para visitantes.</p> : <Bars items={v.howFound} />}
                </Chart>
                <Chart title="Querem servir em"><Bars items={v.interests} /></Chart>
              </div>
              <div className="lg:col-span-2">
                <Chart title="Onde moram" note={stats!.locating ? `Localizando ${stats!.locating} bairro${stats!.locating > 1 ? "s" : ""} no mapa…` : undefined}>
                  <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-1.5">
                      <NeighborhoodMap points={v.spots} />
                      {v.unplaced > 0 && !stats!.locating && (
                        <p className="text-[11px] text-muted-foreground">{v.unplaced} pessoa{v.unplaced > 1 ? "s" : ""} com bairro não localizado no mapa (confira a lista ao lado).</p>
                      )}
                    </div>
                    <Bars items={v.neighborhood} />
                  </div>
                </Chart>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Peças ----------

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-muted p-3 text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Chart({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function AgeTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const band = AGE_BANDS.find((b) => b.label === payload?.value);
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={11}>
      <tspan x={x} dy={12} className="fill-foreground">{band?.label}</tspan>
      <tspan x={x} dy={13} className="fill-muted-foreground">{band?.range}</tspan>
    </text>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  if (items.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />{i.label}</span>
      ))}
    </div>
  );
}

/** Partes de um todo: uma barra 100% e a lista com número e % */
function Split({ items }: { items: { label: string; n: number; color: string }[] }) {
  const shown = items.filter((i) => i.n > 0);
  const total = shown.reduce((s, i) => s + i.n, 0);
  if (!total) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  return (
    <div className="space-y-3 pt-1">
      <div className="flex h-4 gap-0.5 rounded overflow-hidden">
        {shown.map((i) => (
          <div key={i.label} title={`${i.label}: ${i.n} (${pct(i.n, total)}%)`} style={{ width: `${(i.n / total) * 100}%`, background: i.color }} />
        ))}
      </div>
      <div className="space-y-1.5">
        {shown.map((i) => (
          <div key={i.label} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: i.color }} />
            <span className="flex-1">{i.label}</span>
            <span className="font-medium tabular-nums">{i.n}</span>
            <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">{pct(i.n, total)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranking em barras horizontais com o número ao lado */
function Bars({ items }: { items: { label: string; n: number }[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  const max = Math.max(...items.map((i) => i.n));
  const total = items.reduce((s, i) => s + i.n, 0);
  return (
    <div className="space-y-2 pt-1">
      {items.map((i) => (
        <div key={i.label} className="text-sm" title={`${i.label}: ${i.n} (${pct(i.n, total)}%)`}>
          <div className="flex justify-between gap-2">
            <span className="truncate">{i.label}</span>
            <span className="font-medium tabular-nums shrink-0">{i.n}</span>
          </div>
          <div className="h-1.5 mt-1 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(i.n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
