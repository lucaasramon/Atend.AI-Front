import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, Eye, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Step {
  level: number;
  user: string | null;
  sent: boolean;
  sent_at: string;
  deadline: string;
  confirmed_at: string | null;
}

interface Chain {
  event_id: string;
  ministry_id: string;
  title: string;
  starts_at: string;
  ministry: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
  level: number;
  deadline: string;
  steps: Step[];
}

const LEVEL = { 1: "Líder", 2: "Pastor responsável", 3: "Administradores" } as Record<number, string>;

export default function AcksPage() {
  const { toast } = useToast();
  const [chains, setChains] = useState<Chain[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [hours, setHours] = useState("48");
  const [showPast, setShowPast] = useState(false);

  const load = () =>
    api.get<Chain[]>(`/api/acks${showPast ? "?all=1" : ""}`).then(setChains).catch(() => setChains([]));

  useEffect(() => {
    load();
  }, [showPast]);

  useEffect(() => {
    api.get<{ key: string; value: string }[]>("/api/settings").then((rows) => {
      const get = (k: string) => rows.find((r) => r.key === k)?.value;
      setEnabled(get("ack_enabled") !== "false");
      setHours(get("ack_hours") || "48");
    });
  }, []);

  const saveSettings = async (patch: Record<string, string>) => {
    try {
      await api.put("/api/settings", patch);
      toast({ title: "Configuração salva" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const escalateNow = async () => {
    try {
      const r = await api.post<{ escalated: number }>("/api/acks/escalate", {});
      toast({ title: r.escalated ? `${r.escalated} confirmação(ões) escalada(s)` : "Nada vencido agora" });
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (!chains) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pending = chains.filter((c) => !c.confirmed_at).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Confirmações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Líderes confirmam que viram os eventos do seu ministério. Sem confirmação no prazo, o pastor responsável é avisado; depois, os administradores.
          </p>
        </div>
        <Button variant="outline" onClick={escalateNow}><RefreshCw className="w-4 h-4 mr-2" />Verificar prazos agora</Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-card flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <label className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); saveSettings({ ack_enabled: v ? "true" : "false" }); }} />
          Pedir confirmação aos líderes
        </label>
        <label className="flex items-center gap-2">
          Prazo de cada nível:
          <Input className="w-20 h-8" type="number" min={1} value={hours} onChange={(e) => setHours(e.target.value)} onBlur={() => saveSettings({ ack_hours: hours })} />
          horas
        </label>
        <label className="flex items-center gap-2 text-muted-foreground">
          <Switch checked={showPast} onCheckedChange={setShowPast} />
          Mostrar eventos passados
        </label>
        <span className="text-muted-foreground">{pending} aguardando confirmação</span>
      </div>

      {chains.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nenhuma confirmação pedida ainda.</p>
          <p className="text-xs mt-1">Elas são criadas quando um evento aprovado tem ministérios com líder cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chains.map((c) => {
            const overdue = !c.confirmed_at && new Date(c.deadline) < new Date();
            return (
              <div key={`${c.event_id}-${c.ministry_id}`} className="rounded-lg border border-border bg-card p-4 shadow-card space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {format(new Date(c.starts_at), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })} · {c.ministry}
                    </p>
                  </div>
                  {c.confirmed_at ? (
                    <Badge variant="outline" className="text-success border-success/40 gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" />Confirmado por {c.confirmed_by}
                    </Badge>
                  ) : overdue ? (
                    <Badge variant="outline" className="text-destructive border-destructive/40 gap-1 w-fit">
                      <ShieldAlert className="w-3 h-3" />Prazo vencido ({LEVEL[c.level]})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-warning border-warning/40 gap-1 w-fit">
                      <Clock className="w-3 h-3" />Aguardando {LEVEL[c.level].toLowerCase()} · {formatDistanceToNow(new Date(c.deadline), { locale: ptBR, addSuffix: true })}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {c.steps.map((s, i) => (
                    <span key={i} className={`rounded-full border px-2 py-0.5 ${s.confirmed_at ? "border-success/40 text-success" : "border-border text-muted-foreground"}`}>
                      {LEVEL[s.level]}: {s.user || "—"}
                      {s.confirmed_at ? " ✓" : s.sent ? "" : " (sem WhatsApp)"}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
