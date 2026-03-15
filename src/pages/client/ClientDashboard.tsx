import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, TrendingUp, Clock, Loader2, BarChart3, Send } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  totalLeads: number;
  activeInterruptions: number;
  templatesCount: number;
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
}

interface DailyVolume {
  date: string;
  enviadas: number;
  recebidas: number;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      try {
        const [leadsRes, interruptionsRes, templatesRes, messagesRes] = await Promise.all([
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("tenant_id", user.id),
          supabase.from("robot_interruptions").select("*", { count: "exact", head: true }).eq("tenant_id", user.id).eq("is_active", true),
          supabase.from("response_templates").select("*", { count: "exact", head: true }).eq("tenant_id", user.id),
          supabase.from("messages").select("id, from_me, created_at").eq("tenant_id", user.id),
        ]);

        const messages = (messagesRes.data as any[]) || [];
        const sentMessages = messages.filter(m => m.from_me).length;
        const receivedMessages = messages.filter(m => !m.from_me).length;

        setStats({
          totalLeads: leadsRes.count || 0,
          activeInterruptions: interruptionsRes.count || 0,
          templatesCount: templatesRes.count || 0,
          totalMessages: messages.length,
          sentMessages,
          receivedMessages,
        });

        // Build daily volume for last 7 days
        const days: DailyVolume[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          const dayLabel = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          const dayMessages = messages.filter(m => m.created_at?.slice(0, 10) === dateStr);
          days.push({
            date: dayLabel,
            enviadas: dayMessages.filter(m => m.from_me).length,
            recebidas: dayMessages.filter(m => !m.from_me).length,
          });
        }
        setDailyVolume(days);
      } catch (error) {
        console.error("Error loading dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const resolutionRate = stats && stats.totalLeads > 0
    ? Math.round(((stats.totalLeads - stats.activeInterruptions) / stats.totalLeads) * 100)
    : 0;

  const statCards = [
    { label: "Total de Leads", value: String(stats?.totalLeads || 0), icon: Users },
    { label: "Mensagens Enviadas", value: String(stats?.sentMessages || 0), icon: Send },
    { label: "Mensagens Recebidas", value: String(stats?.receivedMessages || 0), icon: MessageSquare },
    { label: "Pausas Ativas", value: String(stats?.activeInterruptions || 0), icon: Clock },
    { label: "Templates", value: String(stats?.templatesCount || 0), icon: BarChart3 },
    { label: "Taxa de Resolução", value: `${resolutionRate}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Acompanhe o desempenho do seu atendimento</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Volume de Mensagens (últimos 7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyVolume.some(d => d.enviadas > 0 || d.recebidas > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="enviadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Enviadas" />
                <Bar dataKey="recebidas" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Recebidas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              As métricas serão exibidas conforme seu robô processar conversas.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
