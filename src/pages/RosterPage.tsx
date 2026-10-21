import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Check, Loader2, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Ministry, RosterEntry, groupRoster } from "@/lib/events";
import { cap } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChipSelect from "@/components/events/ChipSelect";
import RosterGroups from "@/components/events/RosterGroups";
import AreaRosterView from "@/components/events/AreaRosterView";
import RosterBuilderDialog, { RosterMember, ServiceFunction } from "@/components/events/RosterBuilderDialog";
import PageHeader from "@/components/PageHeader";

interface OverviewEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  status: string;
  ministries: { id: string; name: string; color: string | null }[];
  roster: RosterEntry[];
}

interface Area extends ServiceFunction {
  ministry_name: string;
  ministry_color: string | null;
  pop_id: string | null;
}

interface PopLite {
  id: string;
  title: string;
}

const NONE = "__none";
const PERIODS = [
  { value: "14", label: "Próximas 2 semanas" },
  { value: "28", label: "Próximas 4 semanas" },
  { value: "90", label: "Próximos 3 meses" },
];

/** 558596470061 → (85) 9647-0061 */
const phone = (n: string | null) => {
  if (!n) return "sem WhatsApp";
  const d = n.replace(/^55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : n;
};

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return "Hoje";
  if (isTomorrow(d)) return "Amanhã";
  return cap(format(d, "EEEE", { locale: ptBR }));
};

export default function RosterPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const isAdmin = user?.role === "admin";
  const canEdit = isAdmin || user?.role === "agenda";

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewEvent[]>([]);
  const [period, setPeriod] = useState("28");
  const [filterMinistries, setFilterMinistries] = useState<string[]>([]);
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [pops, setPops] = useState<PopLite[]>([]);
  const [upcoming, setUpcoming] = useState<{ id: string; title: string; starts_at: string }[]>([]);

  const [builder, setBuilder] = useState<{ eventId?: string; ministryId?: string } | null>(null);
  const [memberForm, setMemberForm] = useState<{ id?: string; name: string; whatsapp: string; ministry_ids: string[] } | null>(null);
  const [areaForm, setAreaForm] = useState<{ id?: string; ministry_id: string; name: string; pop_id: string } | null>(null);

  const fail = (e: Error) => toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });

  // Áreas em que a pessoa pode montar escala (admin: todas)
  const myMinistries = useMemo(
    () => (isAdmin ? ministries : ministries.filter((m) => user?.ministry_ids?.includes(m.id))),
    [ministries, isAdmin, user]
  );
  const canEditMinistry = (id: string) => isAdmin || !!user?.ministry_ids?.includes(id);

  const loadOverview = () => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    return api
      .get<OverviewEvent[]>(`/api/events/rosters?from=${from.toISOString()}&to=${addDays(from, Number(period)).toISOString()}`)
      .then(setOverview);
  };
  const loadMembers = () => api.get<RosterMember[]>("/api/members").then(setMembers);
  const loadAreas = () => api.get<Area[]>("/api/areas").then(setAreas);

  useEffect(() => {
    Promise.all([
      loadMembers(),
      loadAreas(),
      api.get<Ministry[]>("/api/ministries").then(setMinistries),
      api.get<PopLite[]>("/api/pops").then(setPops),
      api.get<{ id: string; title: string; starts_at: string; status: string }[]>("/api/events").then((l) =>
        setUpcoming(l.filter((e) => e.status !== "rejected" && new Date(e.starts_at) > new Date()))
      ),
    ])
      .catch((e: Error) => toast({ title: "Erro ao carregar", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOverview().catch(() => setOverview([]));
  }, [period]);

  // Link vindo da Agenda/Calendário: /admin/escalas?event=ID abre o modal desse evento
  useEffect(() => {
    const ev = params.get("event");
    if (ev && canEdit && !loading) {
      setBuilder({ eventId: ev });
      params.delete("event");
      setParams(params, { replace: true });
    }
  }, [loading]);

  const visibleEvents = overview.map((e) => ({
    ...e,
    roster: filterMinistries.length ? e.roster.filter((r) => filterMinistries.includes(r.ministry_id)) : e.roster,
  }));
  const totals = useMemo(() => {
    const people = new Set(overview.flatMap((e) => e.roster.map((r) => r.member_id)));
    const areasUsed = new Set(overview.flatMap((e) => e.roster.map((r) => r.ministry_id)));
    return { events: overview.length, withRoster: overview.filter((e) => e.roster.length).length, people: people.size, areas: areasUsed.size };
  }, [overview]);

  const saveMember = async () => {
    if (!memberForm?.name.trim()) return;
    try {
      const body = { name: memberForm.name, whatsapp: memberForm.whatsapp, ministry_ids: memberForm.ministry_ids };
      if (memberForm.id) await api.patch(`/api/members/${memberForm.id}`, body);
      else await api.post("/api/members", body);
      setMemberForm(null);
      loadMembers();
      toast({ title: "Membro salvo" });
    } catch (e: any) {
      fail(e);
    }
  };

  const saveArea = async () => {
    if (!areaForm?.name.trim() || !areaForm.ministry_id) return;
    try {
      const body = { ministry_id: areaForm.ministry_id, name: areaForm.name, pop_id: areaForm.pop_id };
      if (areaForm.id) await api.patch(`/api/areas/${areaForm.id}`, body);
      else await api.post("/api/areas", body);
      setAreaForm(null);
      loadAreas();
      toast({ title: "Função salva" });
    } catch (e: any) {
      fail(e);
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
      <PageHeader
        title="Escalas"
        description="Quem serve em cada evento, em cada área, e o que cada pessoa vai fazer."
        actions={canEdit && <Button onClick={() => setBuilder({})}><Plus className="w-4 h-4 mr-2" />Criar escala</Button>}
      />

      <Tabs defaultValue={user?.ministry_ids?.length ? "area" : "escalas"}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="area" className="flex-1 sm:flex-none">Por área</TabsTrigger>
          <TabsTrigger value="escalas" className="flex-1 sm:flex-none">Por evento</TabsTrigger>
          <TabsTrigger value="membros" className="flex-1 sm:flex-none">Membros ({members.length})</TabsTrigger>
          <TabsTrigger value="funcoes" className="flex-1 sm:flex-none">Funções ({areas.length})</TabsTrigger>
        </TabsList>

        {/* ---------- Escala de uma área, por data ---------- */}
        <TabsContent value="area">
          <AreaRosterView
            events={overview}
            ministries={ministries}
            members={members}
            userId={user?.id}
            userMinistryIds={user?.ministry_ids}
            period={period}
            periods={PERIODS}
            onPeriod={setPeriod}
            onEdit={canEdit ? (eventId, ministryId) => setBuilder({ eventId, ministryId }) : undefined}
            canEditMinistry={canEditMinistry}
          />
        </TabsContent>

        {/* ---------- Visão geral das escalas ---------- */}
        <TabsContent value="escalas" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ["Eventos no período", totals.events],
              ["Com escala", totals.withRoster],
              ["Pessoas escaladas", totals.people],
              ["Áreas servindo", totals.areas],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border border-border bg-card p-3">
                <p className="text-2xl font-semibold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1 min-w-0">
              <ChipSelect
                options={ministries.filter((m) => overview.some((e) => e.roster.some((r) => r.ministry_id === m.id)))}
                value={filterMinistries}
                onChange={setFilterMinistries}
                empty=""
              />
            </div>
          </div>

          {visibleEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum evento no período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleEvents.map((ev) => {
                const groups = groupRoster(ev.roster);
                const missing = ev.ministries.filter((m) => !groups.some((g) => g.ministry_id === m.id));
                return (
                  <div key={ev.id} className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      {/* Data */}
                      <div className="sm:w-28 shrink-0 flex sm:flex-col items-center sm:justify-center gap-2 sm:gap-0 bg-primary/10 text-primary px-4 py-2 sm:py-4">
                        <span className="text-xs font-medium uppercase">{dayLabel(ev.starts_at)}</span>
                        <span className="text-2xl font-bold leading-none">{format(new Date(ev.starts_at), "dd")}</span>
                        <span className="text-xs">{format(new Date(ev.starts_at), "MMM · HH:mm", { locale: ptBR })}</span>
                      </div>
                      {/* Escala */}
                      <div className="flex-1 min-w-0 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{ev.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {ev.roster.length ? `${ev.roster.length} pessoa(s) em ${groups.length} área(s)` : "Sem escala ainda"}
                              {ev.status === "pending" && " · aguardando aprovação"}
                            </p>
                          </div>
                          {canEdit && (
                            <Button size="sm" variant="outline" onClick={() => setBuilder({ eventId: ev.id })}>
                              <UserPlus className="w-4 h-4 mr-1" />Escalar
                            </Button>
                          )}
                        </div>
                        {groups.length > 0 && (
                          <RosterGroups
                            entries={ev.roster}
                            onEdit={canEdit ? (ministryId) => setBuilder({ eventId: ev.id, ministryId }) : undefined}
                            canEditMinistry={canEditMinistry}
                          />
                        )}
                        {missing.length > 0 && (
                          <p className="text-xs text-warning" title={missing.map((m) => m.name).join(", ")}>
                            {missing.length === 1 ? "1 área do evento sem escala" : `${missing.length} áreas do evento sem escala`}:{" "}
                            {missing.slice(0, 4).map((m) => m.name).join(", ")}
                            {missing.length > 4 && ` e mais ${missing.length - 4}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ---------- Membros ---------- */}
        <TabsContent value="membros" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Todo usuário da plataforma já aparece aqui, com as suas áreas. Cadastre abaixo quem serve mas não usa o sistema.
          </p>
          {canEdit && !memberForm && (
            <Button variant="outline" onClick={() => setMemberForm({ name: "", whatsapp: "", ministry_ids: [] })}>
              <Plus className="w-4 h-4 mr-2" />Novo membro (sem acesso ao sistema)
            </Button>
          )}
          {memberForm && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Nome" autoFocus />
                <Input value={memberForm.whatsapp} onChange={(e) => setMemberForm({ ...memberForm, whatsapp: e.target.value })} placeholder="WhatsApp (85) 9 9999-9999" inputMode="tel" />
              </div>
              <ChipSelect options={ministries} value={memberForm.ministry_ids} onChange={(v) => setMemberForm({ ...memberForm, ministry_ids: v })} empty="Cadastre as áreas em Ministérios" />
              <div className="flex gap-2">
                <Button onClick={saveMember}><Check className="w-4 h-4 mr-2" />Salvar</Button>
                <Button variant="ghost" onClick={() => setMemberForm(null)}><X className="w-4 h-4 mr-2" />Cancelar</Button>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {members.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum membro.</p>}
            {members.map((m) => (
              <div key={m.id} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${m.active ? "" : "opacity-50"}`}>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-medium flex items-center gap-2">
                    {m.name}
                    {m.is_user && <Badge variant="secondary" className="text-[10px]">Usuário</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[m.church_role, phone(m.whatsapp)].filter(Boolean).join(" · ")}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {m.ministries.map((x) => (
                      <span key={x.id} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: x.color || "#999" }} />{x.name}
                      </span>
                    ))}
                    {m.ministries.length === 0 && <span className="text-[11px] text-warning">sem área</span>}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={m.active}
                      title={m.active ? "Disponível para escalas" : "Fora das escalas"}
                      onCheckedChange={(v) => api.patch(`/api/members/${m.id}`, { active: v }).then(loadMembers).catch(fail)}
                    />
                    {m.is_user ? (
                      <span className="text-[11px] text-muted-foreground px-2">editar em Usuários</span>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => setMemberForm({ id: m.id, name: m.name, whatsapp: m.whatsapp || "", ministry_ids: m.ministries.map((x) => x.id) })}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Excluir" onClick={() => confirm(`Excluir ${m.name}?`) && api.delete(`/api/members/${m.id}`).then(loadMembers).catch(fail)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ---------- Funções de serviço ---------- */}
        <TabsContent value="funcoes" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Funções que aparecem como sugestão ao montar a escala (ex.: Vocal, Teclado, Câmera). Ligando um POP, quem estiver nessa função recebe o checklist dele no WhatsApp na véspera.
          </p>
          {canEdit && !areaForm && (
            <Button variant="outline" onClick={() => setAreaForm({ ministry_id: "", name: "", pop_id: "" })}><Plus className="w-4 h-4 mr-2" />Nova função</Button>
          )}
          {areaForm && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={areaForm.ministry_id || NONE} onValueChange={(v) => setAreaForm({ ...areaForm, ministry_id: v === NONE ? "" : v })} disabled={!!areaForm.id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Área</SelectItem>
                    {myMinistries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} placeholder="Função (ex.: Vocal, Câmera, Recepção)" />
              </div>
              <Select value={areaForm.pop_id || NONE} onValueChange={(v) => setAreaForm({ ...areaForm, pop_id: v === NONE ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem checklist (só confirma presença)</SelectItem>
                  {pops.map((p) => <SelectItem key={p.id} value={p.id}>POP: {p.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={saveArea}><Check className="w-4 h-4 mr-2" />Salvar</Button>
                <Button variant="ghost" onClick={() => setAreaForm(null)}><X className="w-4 h-4 mr-2" />Cancelar</Button>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {areas.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma função cadastrada.</p>}
            {areas.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.ministry_color || "#999" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.ministry_name} · {a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.pop_title ? `POP: ${a.pop_title} (${a.steps_count} passos)` : "Sem checklist"}</p>
                </div>
                {canEdit && canEditMinistry(a.ministry_id) && (
                  <>
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => setAreaForm({ id: a.id, ministry_id: a.ministry_id, name: a.name, pop_id: a.pop_id || "" })}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => confirm(`Excluir a função ${a.name}?`) && api.delete(`/api/areas/${a.id}`).then(loadAreas).catch(fail)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <RosterBuilderDialog
        open={!!builder}
        onOpenChange={(o) => !o && setBuilder(null)}
        events={upcoming}
        ministries={myMinistries}
        members={members}
        functions={areas}
        initial={builder || undefined}
        onSaved={loadOverview}
      />
    </div>
  );
}
