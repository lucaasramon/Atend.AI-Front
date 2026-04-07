import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface ClientNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.get<ClientNotification[]>("/api/notifications/client");
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    try {
      await api.patch("/api/notifications/client/mark-read", {});
      await loadNotifications();
    } catch (error) {
      console.error("Error marking read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const typeColors: Record<string, string> = {
    info: "bg-blue-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-destructive",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              <Check className="w-3 h-3 mr-1" /> Marcar lidas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação</p>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`px-4 py-3 border-b border-border last:border-0 ${!n.read ? "bg-muted/30" : ""}`}>
                <div className="flex items-start gap-2">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeColors[n.type] || typeColors.info}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatTime(n.created_at)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
