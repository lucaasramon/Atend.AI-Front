import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Power, PauseCircle, PlayCircle, Bot, Wifi, WifiOff, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

type RobotStatus = "online" | "paused" | "offline";

interface Interruption {
  id: string;
  remote_jid: string;
  contact_name: string | null;
  reason: string | null;
  paused_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export default function RobotStatusWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<RobotStatus>("online");
  const [profileStatus, setProfileStatus] = useState<string>("active");
  const [interruptions, setInterruptions] = useState<Interruption[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const [profile, ints] = await Promise.all([
        api.get<{ status: string }>("/api/profiles/me"),
        api.get<Interruption[]>("/api/robot/interruptions"),
      ]);

      const pStatus = profile.status || "active";
      setProfileStatus(pStatus);
      setInterruptions(ints || []);

      if (pStatus === "blocked" || pStatus === "inactive") {
        setStatus("offline");
      } else if (ints.length > 0) {
        setStatus("paused");
      } else {
        setStatus("online");
      }
    } catch (error) {
      console.error("Error loading robot status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15_000);
    return () => clearInterval(interval);
  }, [user]);

  const handleResumeAll = async () => {
    setToggling(true);
    try {
      await api.patch("/api/robot/interruptions/resume-all", {});
      toast({ title: "Robô retomado! ✅", description: "Todas as pausas foram encerradas." });
      await loadData();
    } catch {
      toast({ title: "Erro ao retomar", variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const handleResumeOne = async (id: string) => {
    try {
      await api.patch(`/api/robot/interruptions/${id}`, { is_active: false });
      toast({ title: "Pausa encerrada ✅" });
      await loadData();
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    online: {
      label: "Online",
      description: "Robô ativo e respondendo mensagens",
      icon: Wifi,
      color: "text-emerald-500",
      bgPulse: "bg-emerald-500",
      badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    paused: {
      label: `Pausado (${interruptions.length})`,
      description: `${interruptions.length} conversa(s) pausada(s)`,
      icon: PauseCircle,
      color: "text-amber-500",
      bgPulse: "bg-amber-500",
      badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    offline: {
      label: "Offline",
      description: profileStatus === "blocked" ? "Conta bloqueada pelo admin" : "Robô desativado",
      icon: WifiOff,
      color: "text-destructive",
      bgPulse: "bg-destructive",
      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <>
      <Card className="border-border overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cfg.color} bg-card border border-border`}>
                  <Bot className="w-5 h-5" />
                </div>
                <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ${cfg.bgPulse} border-2 border-card ${status === "online" ? "animate-pulse" : ""}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">Robô WhatsApp</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.badgeClass}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {cfg.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{cfg.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status === "paused" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setShowDetails(true)} className="text-xs">
                    <Clock className="w-3 h-3 mr-1" /> Detalhes
                  </Button>
                  <Button size="sm" onClick={handleResumeAll} disabled={toggling} className="text-xs">
                    {toggling ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <PlayCircle className="w-3 h-3 mr-1" />}
                    Retomar tudo
                  </Button>
                </>
              )}
              {status === "offline" && (
                <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                  <Power className="w-3 h-3 mr-1" /> Contate o suporte
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-amber-500" />
              Conversas Pausadas
            </DialogTitle>
            <DialogDescription>
              O robô está pausado nestas conversas. Você pode retomar individualmente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2 max-h-64 overflow-y-auto">
            {interruptions.map((int) => (
              <div key={int.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{int.contact_name || int.remote_jid}</p>
                  <p className="text-xs text-muted-foreground">
                    {int.reason === "manual" ? "Pausa manual" : int.reason || "Sem motivo"}
                    {int.expires_at && ` · Expira: ${new Date(int.expires_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleResumeOne(int.id)} className="text-xs text-primary">
                  <PlayCircle className="w-4 h-4 mr-1" /> Retomar
                </Button>
              </div>
            ))}
            {interruptions.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhuma conversa pausada</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
