import { useEffect, useState } from "react";
import { Bell, Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface AdminNotification {
  id: string;
  type: string;
  user_name: string | null;
  user_email: string | null;
  company: string | null;
  phone: string | null;
  read: boolean;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: AdminNotification[]; total: number }>(
        `/api/notifications/admin?page=${page}&limit=${PAGE_SIZE}`
      );
      setNotifications(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotifications(); }, [page]);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/admin/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Notificações</h1>
        <p className="text-sm text-muted-foreground mt-1">{notifications.filter(n => !n.read).length} não lidas</p>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma notificação ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {notifications.map((n) => (
              <div key={n.id} className={`flex items-start justify-between px-5 py-4 hover:bg-muted/20 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
                <div className="flex items-start gap-3">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{n.user_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{n.company || "—"} · {n.user_email || "—"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {n.type === "onboarding_complete" ? "Onboarding concluído" : "Suporte"}
                      {" · "}{new Date(n.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                {!n.read && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(n.id)} className="text-xs shrink-0">
                    <Check className="w-3 h-3 mr-1" /> Lida
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{total} notificações</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
