import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, TrendingUp, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const stats = [
  { label: "Atendimentos Hoje", value: "47", icon: MessageSquare, change: "+12%" },
  { label: "Leads Capturados", value: "128", icon: Users, change: "+8%" },
  { label: "Taxa de Resolução", value: "94%", icon: TrendingUp, change: "+3%" },
  { label: "Tempo Médio", value: "2.3 min", icon: Clock, change: "-15%" },
];

const chartData = [
  { date: "01 Mar", atendimentos: 42, leads: 12 },
  { date: "02 Mar", atendimentos: 55, leads: 18 },
  { date: "03 Mar", atendimentos: 38, leads: 9 },
  { date: "04 Mar", atendimentos: 62, leads: 22 },
  { date: "05 Mar", atendimentos: 48, leads: 15 },
  { date: "06 Mar", atendimentos: 71, leads: 28 },
];

export default function ClientDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Acompanhe o desempenho do seu atendimento</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-5 h-5 text-primary" />
                <span className={`text-xs font-medium ${s.change.startsWith("+") ? "text-success" : "text-primary"}`}>
                  {s.change}
                </span>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atendimentos & Leads (últimos 7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="atendimentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leads" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
