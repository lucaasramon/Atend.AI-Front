import { useEffect, useState } from "react";
import { cap } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Eye, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface Pending {
  id: string;
  title: string;
  starts_at: string;
  ministry: string;
}

export default function ConfirmAck() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [info, setInfo] = useState<{ name: string | null; pending: Pending[] } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Link inválido.");
      return;
    }
    api.get<{ name: string | null; pending: Pending[] }>(`/api/acks/info?token=${encodeURIComponent(token)}`)
      .then(setInfo)
      .catch((e: Error) => setError(e.message));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ confirmed: number }>("/api/acks/confirm", { token });
      setDone(r.confirmed);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const firstName = info?.name?.split(" ")[0];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {done !== null ? <CheckCircle2 className="w-6 h-6 text-success" /> : <Eye className="w-6 h-6 text-primary" />}
          </div>
          <h1 className="text-xl font-semibold">
            {done !== null ? "Confirmado, obrigado!" : firstName ? `Olá, ${firstName}!` : "Confirmação de leitura"}
          </h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive text-center">{error}</p>
          ) : done !== null ? (
            <p className="text-sm text-muted-foreground text-center">
              Registramos que você viu {done > 1 ? `os ${done} eventos` : "o evento"}. Pode fechar esta página.
            </p>
          ) : !info ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : info.pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">Não há nada pendente para você. Tudo já foi confirmado. ✅</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Confirme que você viu {info.pending.length > 1 ? "estes eventos" : "este evento"} na agenda:</p>
              <div className="space-y-2">
                {info.pending.map((p) => (
                  <div key={p.id} className="rounded-md border border-border px-3 py-2">
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cap(format(new Date(p.starts_at), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR }))} · {p.ministry}
                    </p>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={confirm} disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmo que vi
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
