import { useState, useEffect } from "react";
import { Users, Zap, CheckCircle2, Clock, AlertTriangle, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  company: string | null;
  plan: string;
  whatsapp_number: string | null;
  status: string;
  created_at: string;
  onboarding_completed: boolean;
}

interface AdminNotification {
  id: string;
  type: string;
  user_name: string | null;
  company: string | null;
  read: boolean;
  created_at: string;
}

function getLast7Days() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

export default function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profilesRes, notificationsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, company, plan, whatsapp_number, status, created_at, onboarding_completed")
          .order("created_at", { ascending: false }),
        supabase
          .from("admin_notifications")
          .select("id, type, user_name, company, read, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
      if (notificationsRes.data) setNotifications(notificationsRes.data);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeClients = profiles.filter((p) => (p as any).status !== "blocked").length;
  const completedOnboarding = profiles.filter((p) => p.onboarding_completed).length;
  const pendingOnboarding = profiles.filter((p) => !p.onboarding_completed).length;
  const newLast7 = profiles.filter(
    (p) => new Date(p.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  // Chart: registrations + notifications per day
  const days = getLast7Days();
  const chartData = days.map((day) => ({
    date: day.slice(5).replace("-", "/"),
    cadastros: profiles.filter((p) => p.created_at.startsWith(day)).length,
    notificacoes: notifications.filter((n) => n.created_at.startsWith(day)).length,
  }));

  const planCounts = profiles.reduce<Record<string, number>>((acc, p) => {
    acc[p.plan] = (acc[p.plan] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da infraestrutura</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Clientes"
          value={profiles.length}
          subtitle={`${activeClients} ativos`}
          icon={Users}
          variant="primary"
        />
        <MetricCard
          title="Onboarding Completo"
          value={completedOnboarding}
          subtitle={`${pendingOnboarding} pendentes`}
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          title="Novos (7 dias)"
          value={newLast7}
          subtitle="registros recentes"
          icon={Zap}
          variant="default"
        />
        <MetricCard
          title="Notificações"
          value={notifications.filter((n) => !n.read).length}
          subtitle="não lidas"
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Chart + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-medium text-card-foreground mb-4">Cadastros e Notificações (7 dias)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="cadastrosGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(190, 90%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(190, 90%, 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="notifGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(145, 65%, 42%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(145, 65%, 42%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
              <XAxis dataKey="date" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(220, 18%, 10%)",
                  border: "1px solid hsl(220, 14%, 18%)",
                  borderRadius: "8px",
                  color: "hsl(210, 20%, 92%)",
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="cadastros" stroke="hsl(190, 90%, 50%)" fill="url(#cadastrosGrad)" name="Cadastros" />
              <Area type="monotone" dataKey="notificacoes" stroke="hsl(145, 65%, 42%)" fill="url(#notifGrad)" name="Notificações" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Notifications */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-medium text-card-foreground">Últimas Notificações</h2>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma notificação ainda</p>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="p-3 rounded-md bg-muted/50 border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {n.type === "onboarding_complete" ? "ONBOARDING" : "SUPORTE"}
                    </span>
                    {!n.read && <span className="text-[10px] text-primary font-semibold">NOVO</span>}
                  </div>
                  <p className="text-xs text-card-foreground">{n.user_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.company || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Overview Table */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium text-card-foreground">Visão Geral dos Clientes</h2>
        </div>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente cadastrado ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">Cliente</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">Plano</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">Onboarding</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {profiles.slice(0, 8).map((profile) => (
                  <tr key={profile.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3">
                      <div>
                        <p className="text-card-foreground font-medium">{profile.company || "—"}</p>
                        <p className="text-xs text-muted-foreground">{profile.full_name || "—"}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-xs font-mono text-primary capitalize">{profile.plan}</span>
                    </td>
                    <td className="py-3">
                      <StatusBadge
                        status={(profile as any).status === "blocked" ? "blocked" : "active"}
                        label={(profile as any).status === "blocked" ? "Bloqueado" : "Ativo"}
                      />
                    </td>
                    <td className="py-3">
                      <StatusBadge
                        status={profile.onboarding_completed ? "online" : "warning"}
                        label={profile.onboarding_completed ? "Completo" : "Pendente"}
                      />
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-muted-foreground font-mono">
                        {profile.whatsapp_number || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Plan distribution */}
        {Object.keys(planCounts).length > 0 && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            {Object.entries(planCounts).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground capitalize">{plan}: <strong className="text-foreground">{count}</strong></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
