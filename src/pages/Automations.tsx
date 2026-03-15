import { useEffect, useState } from "react";
import { Zap, Loader2, Users, Globe } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";

interface ClientWorkflow {
  id: string;
  company: string;
  full_name: string;
  plan: string;
  status: string;
  whatsapp_number: string | null;
  webhook_url: string | null;
}

export default function Automations() {
  const [clients, setClients] = useState<ClientWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, company, full_name, plan, status, whatsapp_number, webhook_url")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setClients(data || []);
      } catch (error) {
        console.error("Error loading automations:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Automações</h1>
        <p className="text-sm text-muted-foreground mt-1">Workflows vinculados aos clientes</p>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum cliente cadastrado ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div key={client.id} className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md gradient-primary flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{client.company || "Sem empresa"}</p>
                    <p className="text-xs text-muted-foreground">{client.full_name}</p>
                  </div>
                </div>
                <StatusBadge status={client.status === "active" ? "active" : "inactive"} />
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  Plano: <span className="text-foreground font-medium">{client.plan}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  WhatsApp: {client.whatsapp_number || "Não configurado"}
                </div>
                {client.webhook_url && (
                  <div className="truncate">
                    Webhook: <span className="font-mono">{client.webhook_url}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
