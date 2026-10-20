import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Clock, Loader2, MapPin, Ticket, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { cap } from "@/lib/utils";
import { FormField, maskPhone } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PublicForm {
  title: string;
  description: string | null;
  event_title: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  state: "open" | "closed" | "ended";
  closes_at: string | null;
  capacity: number | null;
  spots_left: number | null;
  fields: FormField[];
}

/** Formulário público (sem login) de inscrição em um evento */
export default function EventSignupPage() {
  const { slug = "" } = useParams();
  const [info, setInfo] = useState<PublicForm | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ status: string; updated: boolean } | null>(null);

  useEffect(() => {
    api.get<PublicForm>(`/api/public/forms/${encodeURIComponent(slug)}`).then(setInfo).catch((e: Error) => setLoadError(e.message));
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const r = await api.post<{ status: string; updated: boolean }>(`/api/public/forms/${encodeURIComponent(slug)}`, { name, whatsapp, answers, website });
      setDone(r);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loadError) {
    return <Shell><p className="text-center text-muted-foreground py-6">{loadError}</p></Shell>;
  }
  if (!info) {
    return <Shell><div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></Shell>;
  }

  const start = new Date(info.starts_at);
  const header = (
    <div className="space-y-2 text-sm">
      <h1 className="text-xl font-semibold text-center">{info.title}</h1>
      {info.title !== info.event_title && <p className="text-center text-muted-foreground">{info.event_title}</p>}
      <div className="rounded-lg bg-muted p-3 space-y-1.5">
        <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary shrink-0" />{cap(format(start, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR }))}</p>
        {info.location && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary shrink-0" />{info.location}</p>}
        {info.spots_left !== null && info.state === "open" && (
          <p className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary shrink-0" />
            {info.spots_left > 0 ? `${info.spots_left} vaga(s) restante(s)` : "Vagas esgotadas — inscreva-se na lista de espera"}
          </p>
        )}
        {info.closes_at && info.state === "open" && (
          <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary shrink-0" />Inscrições até {format(new Date(info.closes_at), "dd/MM 'às' HH:mm")}</p>
        )}
      </div>
      {info.description && <p className="text-muted-foreground whitespace-pre-line">{info.description}</p>}
    </div>
  );

  if (done) {
    const waitlist = done.status === "waitlist";
    return (
      <Shell>
        {header}
        <div className="text-center space-y-3 pt-6">
          <CheckCircle2 className={`w-14 h-14 mx-auto ${waitlist ? "text-warning" : "text-success"}`} />
          <h2 className="text-lg font-semibold">
            {waitlist ? "Você está na lista de espera" : done.updated ? "Inscrição atualizada!" : "Inscrição confirmada!"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {waitlist ? "As vagas acabaram. Se alguém desistir, você entra automaticamente." : "Te esperamos lá! 🙌"}
          </p>
        </div>
      </Shell>
    );
  }

  if (info.state !== "open") {
    return (
      <Shell>
        {header}
        <div className="text-center space-y-2 pt-6">
          <XCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="font-medium">Inscrições encerradas</p>
        </div>
      </Shell>
    );
  }

  const setAnswer = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));

  return (
    <Shell>
      {header}
      <form onSubmit={submit} className="space-y-4 pt-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo *</Label>
          <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wa">WhatsApp *</Label>
          <Input id="wa" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="(11) 98765-4321" value={whatsapp} onChange={(e) => setWhatsapp(maskPhone(e.target.value))} required />
        </div>

        {info.fields.map((f) => (
          <div key={f.id} className="space-y-2">
            <Label htmlFor={f.id}>{f.label}{f.required && " *"}</Label>
            {f.type === "textarea" ? (
              <Textarea id={f.id} rows={3} value={answers[f.id] || ""} onChange={(e) => setAnswer(f.id, e.target.value)} required={f.required} />
            ) : f.type === "select" ? (
              <Select value={answers[f.id] || undefined} onValueChange={(v) => setAnswer(f.id, v)}>
                <SelectTrigger id={f.id}><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            ) : f.type === "yesno" ? (
              <div className="flex gap-2">
                {["Sim", "Não"].map((v) => (
                  <Button key={v} type="button" className="flex-1" variant={answers[f.id] === v ? "default" : "outline"} onClick={() => setAnswer(f.id, v)}>{v}</Button>
                ))}
              </div>
            ) : (
              <Input
                id={f.id}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                inputMode={f.type === "number" ? "numeric" : undefined}
                value={answers[f.id] || ""}
                onChange={(e) => setAnswer(f.id, e.target.value)}
                required={f.required}
              />
            )}
          </div>
        ))}

        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden />

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={sending}>
          {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {info.spots_left === 0 ? "Entrar na lista de espera" : "Fazer inscrição"}
        </Button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="pb-2 items-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Ticket className="w-6 h-6 text-primary" />
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
