import { useEffect, useState } from "react";
import { cap } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, Loader2, MapPin, ThumbsDown, ThumbsUp, User } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { EventItem, locationLabel } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<EventItem | null>(null);
  const [reason, setReason] = useState("");

  const load = () =>
    api
      .get<EventItem[]>("/api/events")
      .then((all) => setEvents(all.filter((e) => e.status === "pending")))
      .catch((e: Error) => toast({ title: "Erro ao carregar", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const approve = async (ev: EventItem) => {
    setBusy(ev.id);
    try {
      await api.post(`/api/events/${ev.id}/approve`, {});
      toast({ title: "Evento aprovado", description: "Já está na agenda e nos lembretes." });
      load();
    } catch (error: any) {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusy(rejecting.id);
    try {
      await api.post(`/api/events/${rejecting.id}/reject`, { reason });
      toast({ title: "Evento recusado", description: "Quem cadastrou foi avisado." });
      setRejecting(null);
      setReason("");
      load();
    } catch (error: any) {
      toast({ title: "Erro ao recusar", description: error.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

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
        <h1 className="text-2xl font-semibold text-foreground">Aprovações</h1>
        <p className="text-sm text-muted-foreground mt-1">Eventos cadastrados pela equipe que aguardam um administrador</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nada aguardando aprovação</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="rounded-lg border border-border bg-card p-4 shadow-card space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{ev.title}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {cap(format(new Date(ev.starts_at), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR }))}
                      {ev.ends_at && ` até ${format(new Date(ev.ends_at), "HH:mm")}`}
                    </span>
                    {locationLabel(ev) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{locationLabel(ev)}</span>}
                    {ev.created_by_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{ev.created_by_name}</span>}
                  </div>
                  {ev.ministries.length > 0 && (
                    <p className="text-xs text-muted-foreground">Ministérios: {ev.ministries.map((m) => m.name).join(", ")}</p>
                  )}
                  {ev.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{ev.description}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" disabled={busy === ev.id} onClick={() => setRejecting(ev)}>
                    <ThumbsDown className="w-4 h-4 mr-2" />Recusar
                  </Button>
                  <Button disabled={busy === ev.id} onClick={() => approve(ev)}>
                    {busy === ev.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                    Aprovar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar “{rejecting?.title}”?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quem cadastrou recebe o motivo no WhatsApp e pode ajustar e reenviar.</p>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional). Ex.: Templo já reservado nesse dia" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={reject} disabled={busy === rejecting?.id}>Recusar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
