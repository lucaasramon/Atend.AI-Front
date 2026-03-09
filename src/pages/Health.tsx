import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RobotInterruption {
  id: string;
  tenant_id: string;
  remote_jid: string;
  paused_at: string;
  reason: string | null;
  is_active: boolean;
  contact_name: string | null;
  created_at: string;
  created_by: string | null;
}

const services = [
  { name: "n8n Server", status: "online" as const, latency: "45ms", uptime: "99.8%" },
  { name: "Evolution API", status: "online" as const, latency: "120ms", uptime: "99.2%" },
  { name: "OpenAI API", status: "warning" as const, latency: "380ms", uptime: "98.5%" },
  { name: "PostgreSQL", status: "online" as const, latency: "12ms", uptime: "99.9%" },
];

export default function Health() {
  const [interruptions, setInterruptions] = useState<RobotInterruption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInterruptions();
  }, []);

  const loadInterruptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("robot_interruptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setInterruptions(data || []);
    } catch (error) {
      console.error("Error loading interruptions:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Saúde & Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitoramento da infraestrutura</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadInterruptions} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Atualizar
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

      {/* Robot Interruptions Log */}
      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-medium text-card-foreground">Interrupções de Robô</h2>
          </div>
          <span className="text-xs text-muted-foreground">{interruptions.length} registros</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : interruptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 text-success mb-3" />
            <p className="text-sm">Nenhuma interrupção registrada</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {interruptions.map((item) => (
              <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full shrink-0 ${item.is_active ? "bg-warning" : "bg-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-primary truncate">{item.remote_jid}</span>
                    {item.contact_name && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{item.contact_name}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-card-foreground truncate">
                    {item.reason || "Interrupção manual"} · por {item.created_by || "sistema"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground font-mono">
                    {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                  <StatusBadge
                    status={item.is_active ? "warning" : "offline"}
                    label={item.is_active ? "Ativo" : "Encerrado"}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
