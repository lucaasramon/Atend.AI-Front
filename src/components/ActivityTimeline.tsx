import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, MessageSquare, PauseCircle, PlayCircle, Settings, Clock, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ActivityEvent {
  id: string;
  type: "lead_created" | "message_sent" | "message_received" | "interruption_started" | "interruption_ended";
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  lead_created: { icon: UserPlus, color: "text-primary", bg: "bg-primary/10" },
  message_sent: { icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  message_received: { icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-500/10" },
  interruption_started: { icon: PauseCircle, color: "text-amber-600", bg: "bg-amber-500/10" },
  interruption_ended: { icon: PlayCircle, color: "text-emerald-600", bg: "bg-emerald-500/10" },
};

export default function ActivityTimeline() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const now = new Date();
        const since = new Date(now);
        since.setDate(since.getDate() - 30);
        const sinceStr = since.toISOString();

        const [leadsRes, msgsRes, intRes] = await Promise.all([
          supabase.from("leads").select("id, name, created_at").eq("tenant_id", user.id).gte("created_at", sinceStr).order("created_at", { ascending: false }).limit(50),
          supabase.from("messages").select("id, from_me, remote_jid, created_at").eq("tenant_id", user.id).gte("created_at", sinceStr).order("created_at", { ascending: false }).limit(100),
          supabase.from("robot_interruptions").select("id, contact_name, remote_jid, is_active, paused_at, created_at").eq("tenant_id", user.id).gte("created_at", sinceStr).order("created_at", { ascending: false }).limit(50),
        ]);

        const allEvents: ActivityEvent[] = [];

        (leadsRes.data || []).forEach(l => {
          allEvents.push({
            id: `lead-${l.id}`,
            type: "lead_created",
            description: `Novo lead: ${l.name}`,
            timestamp: l.created_at,
          });
        });

        (msgsRes.data || []).forEach(m => {
          allEvents.push({
            id: `msg-${m.id}`,
            type: m.from_me ? "message_sent" : "message_received",
            description: m.from_me ? `Mensagem enviada para ${m.remote_jid}` : `Mensagem recebida de ${m.remote_jid}`,
            timestamp: m.created_at || "",
          });
        });

        (intRes.data || []).forEach(i => {
          allEvents.push({
            id: `int-${i.id}`,
            type: i.is_active ? "interruption_started" : "interruption_ended",
            description: i.is_active ? `Robô pausado para ${i.contact_name || i.remote_jid}` : `Robô retomado para ${i.contact_name || i.remote_jid}`,
            timestamp: i.paused_at,
          });
        });

        allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setEvents(allEvents);
      } catch (error) {
        console.error("Error loading activity:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const displayed = events.slice(0, limit);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Histórico de Atividades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade nos últimos 30 dias</p>
        ) : (
          <div className="space-y-1">
            {displayed.map((event, i) => {
              const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.lead_created;
              const Icon = cfg.icon;
              return (
                <div key={event.id} className="flex items-start gap-3 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{event.description}</p>
                    <p className="text-[11px] text-muted-foreground">{formatTime(event.timestamp)}</p>
                  </div>
                </div>
              );
            })}
            {events.length > limit && (
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setLimit(l => l + 20)}>
                <ChevronDown className="w-4 h-4 mr-1" /> Ver mais
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
