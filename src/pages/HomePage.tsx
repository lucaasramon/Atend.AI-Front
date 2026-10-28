import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { differenceInCalendarDays, format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BellRing,
  Cake,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPen,
  Copy,
  HandHeart,
  Home as HomeIcon,
  Loader2,
  MapPin,
  MessageCircle,
  PartyPopper,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { cap } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { eventFormUrl, formatPhone, maskPhone, waLink } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ChurchStats from "@/components/ChurchStats";

interface Task { id: string; title: string; due_date: string | null; event_id: string; event_title: string; starts_at: string }
interface Ack { id: string; title: string; starts_at: string; ministry: string; deadline: string }
interface Roster {
  id: string; task: string | null; area: string | null; ministry: string; ministry_color: string | null; checked: number[];
  event_id: string; event_title: string; starts_at: string; location: string | null; pop_title: string | null; steps: string[];
}
interface Ev { id: string; title: string; starts_at: string; location: string | null; status: string; ministries: { name: string; color: string | null }[] }
interface Birthday { id: string; name: string; day: string; age: number }
interface OpenForm { slug: string; title: string; starts_at: string; capacity: number | null; closes_at: string | null; confirmed: number }
interface Request_ {
  id: string; kind: "prayer" | "visit"; source?: string; person_name: string; whatsapp?: string | null; address?: string | null;
  preferred_time?: string | null; details?: string | null; status: string; created_at: string; requested_by_name?: string | null;
}
interface Contact { id: string; name: string; whatsapp: string; neighborhood: string | null; how_found: string | null; notes: string | null; created_at: string }
interface HomeData {
  name: string;
  is_pastor: boolean;
  tasks: Task[];
  acks: Ack[];
  roster: Roster[];
  events: Ev[];
  birthdays: Birthday[];
  forms: OpenForm[];
  my_requests: Request_[];
  pastoral: null | {
    counts: Record<"member" | "regular" | "visitor" | "member_new" | "regular_new" | "visitor_new", number>;
    contact_pending: Contact[];
    prayers: Request_[];
    visits: Request_[];
  };
}

const when = (iso: string) => {
  const d = new Date(iso);
  const day = isToday(d) ? "Hoje" : isTomorrow(d) ? "Amanhã" : cap(format(d, "EEE dd/MM", { locale: ptBR }));
  return `${day} · ${format(d, "HH:mm")}`;
};
/** "2026-10-25" (data sem fuso) → Date local */
const localDay = (ymd: string) => {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

export default function HomePage() {
  const { toast } = useToast();
  const [data, setData] = useState<HomeData | null>(null);
  const [ask, setAsk] = useState<"prayer" | "visit" | null>(null);

  const load = () => api.get<HomeData>("/api/home").then(setData).catch((e: Error) => toast({ title: "Não foi possível carregar", description: e.message, variant: "destructive" }));
  useEffect(() => {
    load();
  }, []);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast({ title: ok });
      load();
    } catch (e: any) {
      toast({ title: "Não foi possível concluir", description: e.message, variant: "destructive" });
    }
  };

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const first = data.name.split(/[\s@]/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const pending = data.tasks.length + data.acks.length;

  return (
    <div className="space-y-6">
      {/* Saudação + pedidos */}
      <div className="rounded-xl bg-primary text-primary-foreground p-5 sm:p-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{greeting}, {first}!</h1>
          <p className="text-sm opacity-80">{cap(format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR }))}</p>
          {pending > 0 && <p className="text-sm font-medium mt-2">Você tem {pending} pendência{pending > 1 ? "s" : ""} hoje.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-primary-foreground text-[hsl(var(--primary))] hover:bg-primary-foreground/90" onClick={() => setAsk("prayer")}><HandHeart className="w-4 h-4 mr-2" />Pedir oração</Button>
          <Button className="bg-white/90 text-primary-foreground hover:bg-white" onClick={() => setAsk("visit")}><HomeIcon className="w-4 h-4 mr-2" />Solicitar visita</Button>
        </div>
      </div>

      {/* ---------- Pastoral ---------- */}
      {data.pastoral && <Pastoral data={data.pastoral} act={act} />}
      {data.is_pastor && <ChurchStats />}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pendências */}
        <Section icon={ClipboardCheck} title="Suas pendências" count={pending}>
          {pending === 0 ? (
            <Empty icon={PartyPopper} text="Tudo em dia!" />
          ) : (
            <div className="divide-y divide-border">
              {data.acks.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2.5">
                  <BellRing className="w-4 h-4 text-warning shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Confirmar ciência: {a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.ministry} · {when(a.starts_at)}</p>
                  </div>
                  <Button size="sm" onClick={() => act(() => api.post(`/api/home/acks/${a.id}/confirm`, {}), "Confirmado!")}>Confirmar</Button>
                </div>
              ))}
              {data.tasks.map((t) => {
                const days = t.due_date ? differenceInCalendarDays(localDay(t.due_date), new Date()) : null;
                return (
                  <label key={t.id} className="flex items-center gap-3 py-2.5 cursor-pointer">
                    <Checkbox onCheckedChange={() => act(() => api.post(`/api/home/tasks/${t.id}`, { done: true }), "Tarefa concluída")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.event_title} · {when(t.starts_at)}</p>
                    </div>
                    {days !== null && (
                      <Badge variant="outline" className={`text-[11px] shrink-0 ${days < 0 ? "text-destructive border-destructive/40" : days <= 2 ? "text-warning border-warning/40" : ""}`}>
                        {days < 0 ? `Atrasada ${-days}d` : days === 0 ? "Vence hoje" : `Até ${format(localDay(t.due_date!), "dd/MM")}`}
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </Section>

        {/* Próxima escala */}
        <Section icon={UsersRound} title="Sua próxima escala" action={<Link to="/admin/escalas" className="text-xs text-primary hover:underline">Escalas</Link>}>
          {data.roster.length === 0 ? (
            <Empty icon={UsersRound} text="Você não está escalado nos próximos cultos." />
          ) : (
            <div className="space-y-3">
              <RosterCard r={data.roster[0]} onChange={load} />
              {data.roster.slice(1).map((r) => (
                <p key={r.id} className="text-xs text-muted-foreground">
                  Depois: <b className="text-foreground">{when(r.starts_at)}</b> · {r.ministry}{r.task || r.area ? ` · ${r.task || r.area}` : ""}
                </p>
              ))}
            </div>
          )}
        </Section>

        {/* Próximos eventos */}
        <Section icon={CalendarDays} title="Seus próximos eventos (7 dias)" action={<Link to="/admin/calendario" className="text-xs text-primary hover:underline">Calendário</Link>}>
          {data.events.length === 0 ? (
            <Empty icon={CalendarDays} text="Nenhum evento da sua área nos próximos 7 dias." />
          ) : (
            <div className="divide-y divide-border">
              {data.events.map((e) => (
                <div key={e.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{e.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{when(e.starts_at)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {e.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</span>}
                    {e.ministries.map((m) => (
                      <span key={m.name} className="text-[11px] inline-flex items-center gap-1 text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color || "#999" }} />{m.name}
                      </span>
                    ))}
                    {e.status === "pending" && <Badge variant="outline" className="text-[10px]">Aguardando aprovação</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Aniversariantes */}
        <Section icon={Cake} title="Aniversariantes da semana" count={data.birthdays.length}>
          {data.birthdays.length === 0 ? (
            <Empty icon={Cake} text="Ninguém faz aniversário nos próximos 7 dias." />
          ) : (
            <div className="divide-y divide-border">
              {data.birthdays.map((b) => {
                const d = localDay(b.day);
                return (
                  <div key={b.id + b.day} className="flex items-center justify-between py-2">
                    <span className="text-sm">{b.name}</span>
                    <span className={`text-xs ${isToday(d) ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {isToday(d) ? "🎉 Hoje" : cap(format(d, "EEE dd/MM", { locale: ptBR }))} · {b.age} anos
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Inscrições abertas */}
        <Section icon={ClipboardPen} title="Inscrições abertas" count={data.forms.length}>
          {data.forms.length === 0 ? (
            <Empty icon={ClipboardPen} text="Nenhuma inscrição aberta agora." />
          ) : (
            <div className="divide-y divide-border">
              {data.forms.map((f) => (
                <div key={f.slug} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {when(f.starts_at)} · {f.capacity ? `${Math.max(0, f.capacity - f.confirmed)} de ${f.capacity} vagas` : `${f.confirmed} inscritos`}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" title="Copiar link" onClick={() => navigator.clipboard.writeText(eventFormUrl(f.slug)).then(() => toast({ title: "Link copiado" }))}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Enviar no WhatsApp" asChild>
                    <a href={`https://wa.me/?text=${encodeURIComponent(`📝 Inscrições abertas: *${f.title}*\n${eventFormUrl(f.slug)}`)}`} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4" /></a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Meus pedidos */}
        {data.my_requests.length > 0 && (
          <Section icon={HandHeart} title="Seus pedidos">
            <div className="divide-y divide-border">
              {data.my_requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 gap-2">
                  <span className="text-sm">{r.kind === "prayer" ? "🙏 Oração" : "🏠 Visita"} · {r.person_name}</span>
                  <Badge variant="outline" className={`text-[11px] ${r.status === "done" ? "text-success border-success/40" : ""}`}>
                    {r.status === "done" ? (r.kind === "prayer" ? "Orado" : "Visita feita") : "Recebido"}
                  </Badge>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      <RequestDialog kind={ask} onClose={() => setAsk(null)} onSent={load} />
    </div>
  );
}

// ---------- Blocos ----------

function Section({ icon: Icon, title, count, action, children }: { icon: typeof Users; title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>{title}
          {!!count && <Badge variant="secondary" className="text-[11px]">{count}</Badge>}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Icon className="w-4 h-4" />{text}</p>
  );
}

function RosterCard({ r, onChange }: { r: Roster; onChange: () => void }) {
  const { toast } = useToast();
  const [checked, setChecked] = useState<number[]>(r.checked || []);
  const toggle = async (i: number, on: boolean) => {
    const next = on ? [...checked, i] : checked.filter((x) => x !== i);
    setChecked(next);
    try {
      await api.patch(`/api/home/roster/${r.id}`, { checked: next });
      if (next.length === r.steps.length) onChange();
    } catch (e: any) {
      setChecked(checked);
      toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });
    }
  };
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{when(r.starts_at)}</p>
          <p className="text-sm">{r.event_title}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-2 py-0.5 border border-border shrink-0">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.ministry_color || "#999" }} />{r.ministry}
        </span>
      </div>
      {(r.task || r.area) && <p className="text-sm"><span className="text-muted-foreground">Sua função:</span> <b>{r.task || r.area}</b></p>}
      {r.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{r.location}</p>}
      {r.steps.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs text-muted-foreground">Checklist{r.pop_title ? ` · ${r.pop_title}` : ""} ({checked.length}/{r.steps.length})</p>
          {r.steps.map((s, i) => (
            <label key={i} className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox className="mt-0.5" checked={checked.includes(i)} onCheckedChange={(v) => toggle(i, !!v)} />
              <span className={checked.includes(i) ? "line-through text-muted-foreground" : ""}>{s}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function Pastoral({ data, act }: { data: NonNullable<HomeData["pastoral"]>; act: (fn: () => Promise<unknown>, ok: string) => void }) {
  const c = data.counts;
  const tiles: { label: string; value: number; extra: number }[] = [
    { label: "Membros", value: c.member, extra: c.member_new },
    { label: "Frequentadores", value: c.regular, extra: c.regular_new },
    { label: "Visitantes", value: c.visitor, extra: c.visitor_new },
  ];
  const requestRow = (r: Request_, doneLabel: string) => (
    <div key={r.id} className="py-2.5 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{r.person_name}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(r.created_at), "dd/MM HH:mm")} · {r.source === "cadastro" ? "pelo formulário de cadastro" : `pedido por ${r.requested_by_name || "—"}`}
            {r.whatsapp && <> · <a className="hover:text-primary" href={waLink(r.whatsapp)} target="_blank" rel="noreferrer">{formatPhone(r.whatsapp)}</a></>}
          </p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => act(() => api.post(`/api/home/requests/${r.id}/done`, {}), doneLabel)}>
          <CheckCircle2 className="w-4 h-4 mr-1.5" />{doneLabel}
        </Button>
      </div>
      {r.address && <p className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{r.address}{r.preferred_time && ` · ${r.preferred_time}`}</p>}
      {r.details && <p className="text-sm text-muted-foreground whitespace-pre-line">{r.details}</p>}
    </div>
  );

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Pastoral</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t) => (
            <Link key={t.label} to="/admin/cadastros" className="rounded-lg bg-muted p-3 text-center hover:bg-muted/70">
              <p className="text-2xl font-semibold">{t.value}</p>
              <p className="text-xs text-muted-foreground">{t.label}</p>
              {t.extra > 0 && <p className="text-[11px] text-success">+{t.extra} este mês</p>}
            </Link>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5 mb-1"><UserCheck className="w-4 h-4" />Visitantes para procurar ({data.contact_pending.length})</p>
            {data.contact_pending.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nenhum visitante esperando contato.</p>
            ) : (
              <div className="divide-y divide-border">
                {data.contact_pending.map((p) => (
                  <div key={p.id} className="py-2.5 space-y-1.5">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Cadastro em {format(new Date(p.created_at), "dd/MM")}{p.how_found && ` · ${p.how_found}`}{p.neighborhood && ` · ${p.neighborhood}`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={waLink(p.whatsapp)} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4 mr-1.5" />{formatPhone(p.whatsapp)}</a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => act(() => api.post(`/api/home/people/${p.id}/contacted`, {}), "Marcado como procurado")}>
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />Já procurei
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5 mb-1"><HandHeart className="w-4 h-4" />Pedidos de oração ({data.prayers.length})</p>
            {data.prayers.length === 0 ? <p className="text-sm text-muted-foreground py-2">Nenhum pedido aberto.</p> : <div className="divide-y divide-border">{data.prayers.map((r) => requestRow(r, "Orado"))}</div>}
          </div>
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5 mb-1"><HomeIcon className="w-4 h-4" />Pedidos de visita ({data.visits.length})</p>
            {data.visits.length === 0 ? <p className="text-sm text-muted-foreground py-2">Nenhum pedido aberto.</p> : <div className="divide-y divide-border">{data.visits.map((r) => requestRow(r, "Visita feita"))}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestDialog({ kind, onClose, onSent }: { kind: "prayer" | "visit" | null; onClose: () => void; onSent: () => void }) {
  const { toast } = useToast();
  const empty = { person_name: "", whatsapp: "", address: "", preferred_time: "", details: "" };
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (kind) setForm(empty);
  }, [kind]);

  const send = async () => {
    setSending(true);
    try {
      await api.post("/api/home/requests", { kind, ...form });
      toast({ title: kind === "prayer" ? "Pedido de oração enviado 🙏" : "Pedido de visita enviado", description: "Os pastores já podem ver." });
      onClose();
      onSent();
    } catch (e: any) {
      toast({ title: "Não foi possível enviar", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {kind === "prayer" ? <><HandHeart className="w-5 h-5 text-primary" />Pedir oração</> : <><HomeIcon className="w-5 h-5 text-primary" />Solicitar visita</>}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Só os pastores veem este pedido.</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{kind === "prayer" ? "Por quem é a oração? *" : "Quem vai receber a visita? *"}</Label>
            <Input placeholder="Você mesmo ou outra pessoa" value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp para contato</Label>
            <Input type="tel" inputMode="numeric" placeholder="(11) 98765-4321" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} />
          </div>
          {kind === "visit" && (
            <>
              <div className="space-y-1.5">
                <Label>Endereço *</Label>
                <Input placeholder="Rua, número, bairro" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Melhor dia e horário</Label>
                <Input placeholder="Ex.: sábado à tarde" value={form.preferred_time} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })} />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label>{kind === "prayer" ? "Pedido de oração *" : "Motivo da visita"}</Label>
            <Textarea rows={4} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={send} disabled={sending}>{sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enviar pedido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
