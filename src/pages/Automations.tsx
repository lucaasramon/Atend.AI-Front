import { Zap, Play, Pause, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { mockClients } from "@/data/mockData";

const workflows = mockClients.filter(c => c.status === "active").map(c => ({
  id: c.id,
  name: `WF-${c.company.replace(/\s/g, "")}`,
  client: c.company,
  status: c.whatsappStatus === "online" ? "active" as const : "inactive" as const,
  lastRun: "2026-03-06 14:30",
  executions: Math.floor(Math.random() * 500) + 100,
}));

export default function Automations() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Automações</h1>
        <p className="text-sm text-muted-foreground mt-1">Workflows n8n vinculados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((wf) => (
          <div key={wf.id} className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md gradient-primary flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-card-foreground font-mono">{wf.name}</p>
                  <p className="text-xs text-muted-foreground">{wf.client}</p>
                </div>
              </div>
              <StatusBadge status={wf.status} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Último run: {wf.lastRun}</span>
              <span>{wf.executions} execuções</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs">
                {wf.status === "active" ? <><Pause className="w-3 h-3 mr-1" />Pausar</> : <><Play className="w-3 h-3 mr-1" />Iniciar</>}
              </Button>
              <Button variant="ghost" size="sm">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
