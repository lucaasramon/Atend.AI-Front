import { Users, MessageSquare, Zap, DollarSign, AlertTriangle, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import { mockClients, mockMessageData, mockErrorLogs } from "@/data/mockData";

export default function Dashboard() {
  const activeClients = mockClients.filter((c) => c.status === "active").length;
  const totalMessages = mockClients.reduce((sum, c) => sum + c.messagesThisMonth, 0);
  const totalTokens = mockClients.reduce((sum, c) => sum + c.tokensUsed, 0);
  const estimatedCost = (totalTokens / 1000000) * 2.5; // rough estimate

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da infraestrutura</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Clientes Ativos"
          value={activeClients}
          subtitle={`${mockClients.length} total`}
          icon={Users}
          variant="primary"
          trend={{ value: 12, positive: true }}
        />
        <MetricCard
          title="Mensagens (Mês)"
          value={totalMessages.toLocaleString("pt-BR")}
          icon={MessageSquare}
          variant="success"
          trend={{ value: 8, positive: true }}
        />
        <MetricCard
          title="Automações Ativas"
          value={activeClients}
          subtitle="n8n workflows"
          icon={Zap}
          variant="default"
        />
        <MetricCard
          title="Custo Estimado"
          value={`R$ ${estimatedCost.toFixed(2)}`}
          subtitle="tokens OpenAI"
          icon={DollarSign}
          variant="warning"
          trend={{ value: 15, positive: false }}
        />
      </div>

      {/* Chart + Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-medium text-card-foreground mb-4">Volume de Mensagens</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={mockMessageData}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(190, 90%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(190, 90%, 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="recvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(145, 65%, 42%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(145, 65%, 42%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
              <XAxis dataKey="date" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(220, 18%, 10%)",
                  border: "1px solid hsl(220, 14%, 18%)",
                  borderRadius: "8px",
                  color: "hsl(210, 20%, 92%)",
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="sent" stroke="hsl(190, 90%, 50%)" fill="url(#sentGrad)" name="Enviadas" />
              <Area type="monotone" dataKey="received" stroke="hsl(145, 65%, 42%)" fill="url(#recvGrad)" name="Recebidas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Error Logs */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-medium text-card-foreground">Últimos Alertas</h2>
          </div>
          <div className="space-y-3">
            {mockErrorLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-md bg-muted/50 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{log.type}</span>
                  <StatusBadge status={log.severity === "danger" ? "blocked" : "warning"} label={log.severity === "danger" ? "Crítico" : "Alerta"} />
                </div>
                <p className="text-xs text-card-foreground">{log.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{log.client} · {log.timestamp}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Client Health Overview */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium text-card-foreground">Saúde dos Clientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs text-muted-foreground font-medium">Cliente</th>
                <th className="text-left py-2 text-xs text-muted-foreground font-medium">Status</th>
                <th className="text-left py-2 text-xs text-muted-foreground font-medium">WhatsApp</th>
                <th className="text-left py-2 text-xs text-muted-foreground font-medium">Mensagens</th>
                <th className="text-left py-2 text-xs text-muted-foreground font-medium">Risco Ban</th>
              </tr>
            </thead>
            <tbody>
              {mockClients.map((client) => (
                <tr key={client.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3">
                    <div>
                      <p className="text-card-foreground font-medium">{client.company}</p>
                      <p className="text-xs text-muted-foreground">{client.name}</p>
                    </div>
                  </td>
                  <td className="py-3"><StatusBadge status={client.status} /></td>
                  <td className="py-3"><StatusBadge status={client.whatsappStatus} /></td>
                  <td className="py-3 text-card-foreground">{client.messagesThisMonth.toLocaleString("pt-BR")}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            client.riskScore > 60 ? "bg-destructive" : client.riskScore > 30 ? "bg-warning" : "bg-success"
                          }`}
                          style={{ width: `${client.riskScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{client.riskScore}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
