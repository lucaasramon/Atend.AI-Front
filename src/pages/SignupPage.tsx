import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { HOW_FOUND, MARITAL_LABEL, RELATION_OPTIONS, Relation, maskPhone } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Ministry {
  id: string;
  name: string;
  color: string | null;
}

const EMPTY = {
  relation: "" as Relation | "",
  name: "",
  birth_date: "",
  whatsapp: "",
  email: "",
  gender: "",
  marital_status: "",
  neighborhood: "",
  baptized: "" as "" | "yes" | "no",
  how_found: "",
  wants_contact: false,
  interests: [] as string[],
  notes: "",
  consent: false,
  website: "", // campo invisível contra robôs
};

/** Formulário público (sem login): cadastro de membros, frequentadores e visitantes */
export default function SignupPage() {
  const [form, setForm] = useState(EMPTY);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ updated: boolean } | null>(null);
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    api.get<{ ministries: Ministry[] }>("/api/public/signup").then((r) => setMinistries(r.ministries)).catch(() => {});
  }, []);

  const visitor = form.relation === "visitor";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.relation) return setError("Diga se você é visitante, frequenta ou é membro.");
    if (!form.consent) return setError("Marque que concorda com o uso dos dados pela igreja.");
    setSending(true);
    try {
      const r = await api.post<{ updated: boolean }>("/api/public/signup", {
        ...form,
        baptized: form.baptized === "" ? null : form.baptized === "yes",
      });
      setDone({ updated: r.updated });
      window.scrollTo(0, 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <Shell>
        <div className="text-center space-y-3 py-6">
          <CheckCircle2 className="w-14 h-14 text-success mx-auto" />
          <h2 className="text-xl font-semibold">{done.updated ? "Cadastro atualizado!" : "Cadastro enviado!"}</h2>
          <p className="text-muted-foreground">
            {visitor
              ? "Que alegria ter você com a gente! 🙌 Seja muito bem-vindo(a)."
              : "Obrigado! Seus dados chegaram para a liderança da igreja. 🙏"}
          </p>
          <Button variant="outline" onClick={() => { setForm(EMPTY); setDone(null); }}>Fazer outro cadastro</Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label>Você é *</Label>
          <div className="grid gap-2">
            {RELATION_OPTIONS.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => set({ relation: o.value })}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  form.relation === o.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                }`}
              >
                <span className="block font-medium text-sm">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nome completo *</Label>
          <Input id="name" autoComplete="name" value={form.name} onChange={(e) => set({ name: e.target.value })} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birth">Data de nascimento *</Label>
            <Input id="birth" type="date" max={new Date().toISOString().slice(0, 10)} value={form.birth_date} onChange={(e) => set({ birth_date: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa">WhatsApp *</Label>
            <Input id="wa" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="(11) 98765-4321" value={form.whatsapp} onChange={(e) => set({ whatsapp: maskPhone(e.target.value) })} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Sexo</Label>
            <Select value={form.gender || undefined} onValueChange={(v) => set({ gender: v })}>
              <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado civil</Label>
            <Select value={form.marital_status || undefined} onValueChange={(v) => set({ marital_status: v })}>
              <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
              <SelectContent>
                {Object.entries(MARITAL_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bairro">Bairro / cidade</Label>
          <Input id="bairro" value={form.neighborhood} onChange={(e) => set({ neighborhood: e.target.value })} />
        </div>

        {visitor ? (
          <>
            <div className="space-y-2">
              <Label>Como conheceu a igreja?</Label>
              <Select value={form.how_found || undefined} onValueChange={(v) => set({ how_found: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>
                  {HOW_FOUND.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
              <Checkbox checked={form.wants_contact} onCheckedChange={(v) => set({ wants_contact: !!v })} className="mt-0.5" />
              <span className="text-sm">Gostaria que alguém da igreja entrasse em contato comigo</span>
            </label>
          </>
        ) : form.relation ? (
          <div className="space-y-2">
            <Label>Você é batizado(a)?</Label>
            <div className="flex gap-2">
              {(["yes", "no"] as const).map((v) => (
                <Button key={v} type="button" variant={form.baptized === v ? "default" : "outline"} className="flex-1" onClick={() => set({ baptized: v })}>
                  {v === "yes" ? "Sim" : "Não"}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {ministries.length > 0 && (
          <div className="space-y-2">
            <Label>Gostaria de servir em algum ministério?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ministries.map((m) => {
                const on = form.interests.includes(m.id);
                return (
                  <label key={m.id} className={`flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer ${on ? "border-primary bg-primary/5" : "border-border"}`}>
                    <Checkbox
                      checked={on}
                      onCheckedChange={(v) => set({ interests: v ? [...form.interests, m.id] : form.interests.filter((x) => x !== m.id) })}
                    />
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color || "#999" }} />
                    {m.name}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Pedido de oração ou observação</Label>
          <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>

        {/* Invisível para pessoas; robôs costumam preencher */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set({ website: e.target.value })} className="hidden" aria-hidden />

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={form.consent} onCheckedChange={(v) => set({ consent: !!v })} className="mt-0.5" />
          <span className="text-xs text-muted-foreground">
            Concordo que a igreja guarde estes dados e entre em contato comigo pelo WhatsApp para assuntos da igreja. *
          </span>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={sending}>
          {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enviar cadastro
        </Button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Cadastro da igreja</h1>
          <p className="text-sm text-muted-foreground">Preencha seus dados para a gente te conhecer melhor.</p>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
