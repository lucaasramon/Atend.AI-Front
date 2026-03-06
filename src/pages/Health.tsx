import { AlertTriangle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { mockErrorLogs } from "@/data/mockData";

const services = [
  { name: "n8n Server", status: "online" as const, latency: "45ms", uptime: "99.8%" },
  { name: "Evolution API", status: "online" as const, latency: "120ms", uptime: "99.2%" },
  { name: "OpenAI API", status: "warning" as const, latency: "380ms", uptime: "98.5%" },
  { name: "PostgreSQL", status: "online" as const, latency: "12ms", uptime: "99.9%" },
];

export default function Health() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Saúde & Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitoramento da infraestrutura</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />Atualizar
        </Button>
      </div>

      {/* Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((svc) => (
          <div key={svc.name} className="rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-card-foreground">{svc.name}</span>
              {svc.status === "online" ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : svc.status === "warning" ? (
                <AlertTriangle className="w-4 h-4 text-warning" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Latência: {svc.latency}</span>
              <span>Uptime: {svc.uptime}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Logs */}
      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <h2 className="text-sm font-medium text-card-foreground">Log de Erros</h2>
        </div>
        <div className="divide-y divide-border/50">
          {mockErrorLogs.map((log) => (
            <div key={log.id} className="px-5 py-3 hover:bg-muted/20 transition-colors flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full shrink-0 ${log.severity === "danger" ? "bg-destructive" : "bg-warning"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-primary">{log.type}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{log.client}</span>
                </div>
                <p className="text-sm text-card-foreground truncate">{log.message}</p>
              </div>
              <span className="text-xs text-muted-foreground font-mono shrink-0">{log.timestamp}</span>
              <StatusBadge status={log.severity === "danger" ? "blocked" : "warning"} label={log.severity === "danger" ? "Crítico" : "Alerta"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
