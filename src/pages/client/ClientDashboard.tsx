import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, TrendingUp, Clock, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  totalLeads: number;
  activeInterruptions: number;
  templatesCount: number;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      try {
        const [leadsRes, interruptionsRes, templatesRes] = await Promise.all([
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("tenant_id", user.id),
          supabase.from("robot_interruptions").select("*", { count: "exact", head: true }).eq("tenant_id", user.id).eq("is_active", true),
          supabase.from("response_templates").select("*", { count: "exact", head: true }).eq("tenant_id", user.id),
        ]);

        setStats({
          totalLeads: leadsRes.count || 0,
          activeInterruptions: interruptionsRes.count || 0,
          templatesCount: templatesRes.count || 0,
        });
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

  const statCards = [
    { label: "Total de Leads", value: String(stats?.totalLeads || 0), icon: Users, change: "" },
    { label: "Pausas Ativas", value: String(stats?.activeInterruptions || 0), icon: Clock, change: "" },
    { label: "Templates Criados", value: String(stats?.templatesCount || 0), icon: MessageSquare, change: "" },
    { label: "Taxa de Resolução", value: "—", icon: TrendingUp, change: "" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Acompanhe o desempenho do seu atendimento</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-5 h-5 text-primary" />
                {s.change && (
                  <span className={`text-xs font-medium ${s.change.startsWith("+") ? "text-success" : "text-primary"}`}>
                    {s.change}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As métricas de atendimentos e mensagens serão exibidas aqui conforme seu robô processar conversas.
            Configure seu robô via o onboarding para começar a receber dados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
