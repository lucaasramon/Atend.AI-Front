import { useEffect, useState } from "react";
import { cap } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, ClipboardList, Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface Info {
  member: string;
  event: string;
  starts_at: string;
  location: string | null;
  ministry: string;
  area: string;
  pop_title: string | null;
  steps: string[];
  checked: number[];
}

export default function MemberChecklist() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Link inválido.");
      return;
    }
    api.get<Info>(`/api/roster/checklist?token=${encodeURIComponent(token)}`).then(setInfo).catch((e: Error) => setError(e.message));
  }, [token]);

  const save = async (checked: number[]) => {
    if (!info) return;
    setInfo({ ...info, checked });
    setSaving(true);
    try {
      await api.patch("/api/roster/checklist", { token, checked });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (i: number, on: boolean) => save(on ? [...info!.checked, i] : info!.checked.filter((x) => x !== i));
  const allDone = !!info && info.steps.length > 0 && info.checked.length >= info.steps.length;
  const confirmed = !!info && info.steps.length === 0 && info.checked.includes(0);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {allDone || confirmed ? <CheckCircle2 className="w-6 h-6 text-success" /> : <ClipboardList className="w-6 h-6 text-primary" />}
          </div>
          <h1 className="text-xl font-semibold">{info ? `Olá, ${info.member.split(" ")[0]}!` : "Seu checklist"}</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive text-center">{error}</p>
          ) : !info ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p className="font-medium">{info.event}</p>
                <p className="text-muted-foreground">
                  {cap(format(new Date(info.starts_at), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR }))}
                </p>
                {info.location && <p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{info.location}</p>}
                <p>🎯 {info.ministry} · <b>{info.area}</b></p>
              </div>

              {info.steps.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{info.pop_title || "Checklist"} — {info.checked.length}/{info.steps.length}</p>
                  {info.steps.map((s, i) => (
                    <label key={i} className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                      <Checkbox className="mt-0.5" checked={info.checked.includes(i)} onCheckedChange={(v) => toggle(i, !!v)} />
                      <span className={`text-sm ${info.checked.includes(i) ? "line-through text-muted-foreground" : ""}`}>{s}</span>
                    </label>
                  ))}
                  {allDone && <p className="text-sm text-success text-center">Tudo pronto! Obrigado por servir. 🙏</p>}
                </div>
              ) : confirmed ? (
                <p className="text-sm text-success text-center">Presença confirmada. Obrigado! 🙏</p>
              ) : (
                <Button className="w-full" onClick={() => save([0])}>Confirmo minha presença</Button>
              )}
              {saving && <p className="text-xs text-muted-foreground text-center">Salvando…</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
