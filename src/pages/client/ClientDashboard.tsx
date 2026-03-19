import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, Users, TrendingUp, Clock, Loader2, Send,
  UserCheck, AlertCircle, Smile, Frown, Meh, Activity, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RobotStatusWidget from "@/components/RobotStatusWidget";
import ExportReports from "@/components/ExportReports";
import ActivityTimeline from "@/components/ActivityTimeline";
import OnboardingTour from "@/components/OnboardingTour";

interface Lead {
  id: string;
  status: string | null;
  sentiment: string | null;
  source: string | null;
  created_at: string;
}

interface Message {
  id: string;
  from_me: boolean | null;
  created_at: string | null;
}

interface DashboardStats {
  totalLeads: number;
  activeInterruptions: number;
  templatesCount: number;
  sentMessages: number;
  receivedMessages: number;
  newLeadsToday: number;
  avgMessagesPerLead: number;
}

interface DailyVolume {
  date: string;
  enviadas: number;
  recebidas: number;
  total: number;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "hsl(145, 65%, 42%)",
  neutral: "hsl(215, 12%, 45%)",
  negative: "hsl(0, 72%, 55%)",
};

const STATUS_COLORS: Record<string, string> = {
  new: "hsl(210, 100%, 50%)",
  contacted: "hsl(38, 92%, 55%)",
  qualified: "hsl(145, 65%, 42%)",
  converted: "hsl(270, 60%, 55%)",
  lost: "hsl(0, 72%, 55%)",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  converted: "Convertido",
  lost: "Perdido",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
};

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  website: "Website",
  referral: "Indicação",
  organic: "Orgânico",
};

function buildDailyVolume(messages: Message[], days: number): DailyVolume[] {
  const result: DailyVolume[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const dayMsgs = messages.filter(m => m.created_at?.slice(0, 10) === dateStr);
    const enviadas = dayMsgs.filter(m => m.from_me).length;
    const recebidas = dayMsgs.filter(m => !m.from_me).length;
    result.push({ date: dayLabel, enviadas, recebidas, total: enviadas + recebidas });
  }
  return result;
}

function buildLeadsByDay(leads: Lead[], days: number) {
  const result: { date: string; leads: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    result.push({
      date: dayLabel,
      leads: leads.filter(l => l.created_at?.slice(0, 10) === dateStr).length,
    });
  }
  return result;
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const map: Record<string, number> = {};
  items.forEach(item => {
    const k = key(item);
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7" | "14" | "30">("7");

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const [leadsRes, interruptionsRes, templatesRes, messagesRes] = await Promise.all([
          supabase.from("leads").select("id, status, sentiment, source, created_at").eq("tenant_id", user.id),
          supabase.from("robot_interruptions").select("*", { count: "exact", head: true }).eq("tenant_id", user.id).eq("is_active", true),
          supabase.from("response_templates").select("*", { count: "exact", head: true }).eq("tenant_id", user.id),
          supabase.from("messages").select("id, from_me, created_at").eq("tenant_id", user.id),
        ]);

        const allLeads = (leadsRes.data || []) as Lead[];
        const allMessages = (messagesRes.data || []) as Message[];
        const sent = allMessages.filter(m => m.from_me).length;
        const received = allMessages.filter(m => !m.from_me).length;

        const today = new Date().toISOString().slice(0, 10);
        const newToday = allLeads.filter(l => l.created_at?.slice(0, 10) === today).length;

        setLeads(allLeads);
        setMessages(allMessages);
        setStats({
          totalLeads: allLeads.length,
          activeInterruptions: interruptionsRes.count || 0,
          templatesCount: templatesRes.count || 0,
          sentMessages: sent,
          receivedMessages: received,
          newLeadsToday: newToday,
          avgMessagesPerLead: allLeads.length > 0 ? Math.round(allMessages.length / allLeads.length) : 0,
        });
      } catch (error) {
        console.error("Error loading dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const days = parseInt(period);
  const dailyVolume = buildDailyVolume(messages, days);
  const leadsByDay = buildLeadsByDay(leads, days);

  const totalVolume = dailyVolume.reduce((s, d) => s + d.total, 0);
  const prevPeriodMessages = messages.filter(m => {
    if (!m.created_at) return false;
    const d = new Date(m.created_at);
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days * 2);
    const end = new Date(now);
    end.setDate(end.getDate() - days);
    return d >= start && d < end;
  }).length;
  const volumeTrend = prevPeriodMessages > 0
    ? Math.round(((totalVolume - prevPeriodMessages) / prevPeriodMessages) * 100)
    : 0;

  // Distributions
  const statusDist = groupBy(leads, l => l.status || "new");
  const sentimentDist = groupBy(leads, l => l.sentiment || "neutral");
  const sourceDist = groupBy(leads, l => l.source || "whatsapp");

  const statusData = Object.entries(statusDist).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value,
    color: STATUS_COLORS[key] || "hsl(210, 12%, 60%)",
  }));

  const sentimentData = Object.entries(sentimentDist).map(([key, value]) => ({
    name: SENTIMENT_LABELS[key] || key,
    value,
    color: SENTIMENT_COLORS[key] || "hsl(215, 12%, 45%)",
  }));

  const sourceData = Object.entries(sourceDist).map(([key, value]) => ({
    name: SOURCE_LABELS[key] || key,
    value,
    color: STATUS_COLORS[Object.keys(STATUS_COLORS)[Object.keys(sourceDist).indexOf(key)] || "new"] || "hsl(210, 100%, 50%)",
  }));

  const resolutionRate = stats && stats.totalLeads > 0
    ? Math.round(((stats.totalLeads - stats.activeInterruptions) / stats.totalLeads) * 100)
    : 0;

  const sentimentIcon = (sentimentDist["positive"] || 0) >= (sentimentDist["negative"] || 0) ? Smile : Frown;

  const kpiCards = [
    {
      label: "Total de Leads",
      value: stats?.totalLeads || 0,
      icon: Users,
      sub: `+${stats?.newLeadsToday || 0} hoje`,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Mensagens Enviadas",
      value: stats?.sentMessages || 0,
      icon: Send,
      sub: `${stats?.avgMessagesPerLead || 0} msg/lead`,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Mensagens Recebidas",
      value: stats?.receivedMessages || 0,
      icon: MessageSquare,
      sub: volumeTrend >= 0 ? `↑ ${volumeTrend}% vs período anterior` : `↓ ${Math.abs(volumeTrend)}% vs período anterior`,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Pausas Ativas",
      value: stats?.activeInterruptions || 0,
      icon: Clock,
      sub: "Atendimentos pausados",
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Taxa de Resolução",
      value: `${resolutionRate}%`,
      icon: TrendingUp,
      sub: resolutionRate >= 80 ? "Excelente" : resolutionRate >= 50 ? "Bom" : "Precisa melhorar",
      color: resolutionRate >= 80 ? "text-success" : resolutionRate >= 50 ? "text-warning" : "text-destructive",
      bg: resolutionRate >= 80 ? "bg-success/10" : resolutionRate >= 50 ? "bg-warning/10" : "bg-destructive/10",
    },
    {
      label: "Sentimento Geral",
      value: `${sentimentDist["positive"] || 0} positivos`,
      icon: sentimentIcon,
      sub: `${sentimentDist["negative"] || 0} negativos`,
      color: (sentimentDist["positive"] || 0) >= (sentimentDist["negative"] || 0) ? "text-success" : "text-destructive",
      bg: (sentimentDist["positive"] || 0) >= (sentimentDist["negative"] || 0) ? "bg-success/10" : "bg-destructive/10",
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium text-card-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs text-muted-foreground">
            {entry.name}: <span className="font-semibold text-card-foreground">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  };

  const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-medium">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Robot Status */}
      <RobotStatusWidget />

      <OnboardingTour />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Acompanhe o desempenho do seu atendimento</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportReports />
          <Tabs value={period} onValueChange={(v) => setPeriod(v as "7" | "14" | "30")}>
            <TabsList>
              <TabsTrigger value="7">7 dias</TabsTrigger>
              <TabsTrigger value="14">14 dias</TabsTrigger>
              <TabsTrigger value="30">30 dias</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-card-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
              <p className={`text-[10px] mt-1 ${kpi.color} opacity-80`}>{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1: Message Volume + Leads Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Volume de Mensagens</CardTitle>
            <CardDescription>Enviadas vs recebidas nos últimos {days} dias</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyVolume.some(d => d.total > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dailyVolume}>
                  <defs>
                    <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(145, 65%, 42%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(145, 65%, 42%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="enviadas" stroke="hsl(210, 100%, 50%)" fill="url(#gradSent)" strokeWidth={2} name="Enviadas" />
                  <Area type="monotone" dataKey="recebidas" stroke="hsl(145, 65%, 42%)" fill="url(#gradReceived)" strokeWidth={2} name="Recebidas" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Novos Leads por Dia</CardTitle>
            <CardDescription>Captação nos últimos {days} dias</CardDescription>
          </CardHeader>
          <CardContent>
            {leadsByDay.some(d => d.leads > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={leadsByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="leads" fill="hsl(210, 100%, 50%)" radius={[4, 4, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Status Funnel + Sentiment + Source */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funil de Leads</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 && leads.length > 0 ? (
              <div className="space-y-3 pt-2">
                {statusData
                  .sort((a, b) => b.value - a.value)
                  .map((item) => (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-semibold text-card-foreground">{item.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(item.value / leads.length) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sentimento</CardTitle>
            <CardDescription>Análise de sentimento dos leads</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {sentimentData.length > 0 && leads.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={PieLabel}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {sentimentData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Origem dos Leads</CardTitle>
            <CardDescription>De onde vêm seus leads</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 && leads.length > 0 ? (
              <div className="space-y-3 pt-2">
                {sourceData
                  .sort((a, b) => b.value - a.value)
                  .map((item, i) => {
                    const colors = [
                      "hsl(210, 100%, 50%)",
                      "hsl(145, 65%, 42%)",
                      "hsl(38, 92%, 55%)",
                      "hsl(270, 60%, 55%)",
                    ];
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: colors[i % colors.length] }}
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-card-foreground">{item.value}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              {Math.round((item.value / leads.length) * 100)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Resumo de Atividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryItem
              label="Total de Conversas"
              value={stats?.totalLeads || 0}
              trend={volumeTrend}
            />
            <SummaryItem
              label="Mensagens Trocadas"
              value={(stats?.sentMessages || 0) + (stats?.receivedMessages || 0)}
              trend={volumeTrend}
            />
            <SummaryItem
              label="Média msg/lead"
              value={stats?.avgMessagesPerLead || 0}
            />
            <SummaryItem
              label="Templates Ativos"
              value={stats?.templatesCount || 0}
            />
          </div>
        </CardContent>
      </Card>
      {/* Activity Timeline */}
      <ActivityTimeline />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">
        As métricas serão exibidas conforme seu robô processar conversas.
      </p>
    </div>
  );
}

function SummaryItem({ label, value, trend }: { label: string; value: number | string; trend?: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-lg font-bold text-card-foreground">{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={`flex items-center text-xs font-medium ${trend > 0 ? "text-success" : "text-destructive"}`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}
