import { useEffect, useMemo, useState } from "react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Loader2, Pencil, Plus, Send, Trash2, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EventItem, Ministry } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChipSelect from "@/components/events/ChipSelect";

interface Member {
  id: string;
  name: string;
  whatsapp: string | null;
  active: boolean;
  ministries: { id: string; name: string }[];
}

interface Area {
  id: string;
  ministry_id: string;
  ministry_name: string;
  ministry_color: string | null;
  name: string;
  pop_id: string | null;
  pop_title: string | null;
  steps_count: number;
}

interface Entry {
  id: string;
  area_id: string;
  member_id: string;
  area: string;
  ministry: string;
  ministry_color: string | null;
  member: string;
  has_whatsapp: boolean;
  checked: number[];
  steps_count: number;
  sent_at: string | null;
}

interface PopLite {
  id: string;
  title: string;
  ministry_id: string | null;
}

const NONE = "__none";

/** 558596470061 → (85) 9647-0061 */
const phone = (n: string | null) => {
  if (!n) return "sem WhatsApp";
  const d = n.replace(/^55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : n;
};

export default function RosterPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "agenda";
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [pops, setPops] = useState<PopLite[]>([]);

  const [eventId, setEventId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pick, setPick] = useState<{ area_id: string; member_id: string }>({ area_id: "", member_id: "" });

  const [memberForm, setMemberForm] = useState<{ id?: string; name: string; whatsapp: string; ministry_ids: string[] } | null>(null);
  const [areaForm, setAreaForm] = useState<{ id?: string; ministry_id: string; name: string; pop_id: string } | null>(null);

  const fail = (e: Error) => toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });

  const loadMembers = () => api.get<Member[]>("/api/members").then(setMembers);
  const loadAreas = () => api.get<Area[]>("/api/areas").then(setAreas);
  const loadEntries = (id = eventId) => (id ? api.get<Entry[]>(`/api/events/${id}/roster`).then(setEntries) : Promise.resolve(setEntries([])));

  useEffect(() => {
    Promise.all([
      api.get<EventItem[]>("/api/events").then((l) => {
        const next = l.filter((e) => e.status === "approved" && !isPast(new Date(e.starts_at)));
        setEvents(next);
        if (next[0]) setEventId(next[0].id);
      }),
      loadMembers(),
      loadAreas(),
      api.get<Ministry[]>("/api/ministries").then(setMinistries),
      api.get<PopLite[]>("/api/pops").then(setPops),
    ])
      .catch((e: Error) => toast({ title: "Erro ao carregar", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEntries().catch(() => setEntries([]));
  }, [eventId]);

  // Membros que servem no ministério da área escolhida
  const candidates = useMemo(() => {
    const area = areas.find((a) => a.id === pick.area_id);
    return members.filter((m) => m.active && (!area || m.ministries.some((x) => x.id === area.ministry_id)));
  }, [pick.area_id, members, areas]);

  const addEntry = async () => {
    if (!pick.area_id || !pick.member_id) return;
    try {
      await api.post(`/api/events/${eventId}/roster`, pick);
      setPick({ area_id: pick.area_id, member_id: "" });
      loadEntries();
    } catch (e: any) {
      fail(e);
    }
  };

  const sendEntry = async (en: Entry) => {
    try {
      await api.post(`/api/events/roster/${en.id}/send`, {});
      toast({ title: `Checklist enviado para ${en.member}` });
      loadEntries();
    } catch (e: any) {
      fail(e);
    }
  };

  const removeEntry = async (en: Entry) => {
    try {
      await api.delete(`/api/events/roster/${en.id}`);
      loadEntries();
    } catch (e: any) {
      fail(e);
    }
  };

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
      toast({ title: "Área salva" });
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

  const byArea = areas
    .map((a) => ({ area: a, list: entries.filter((e) => e.area_id === a.id) }))
    .filter((g) => g.list.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Escalas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quem serve em cada culto. Cada escalado recebe no WhatsApp o checklist da sua área na véspera e marca pelo celular.
        </p>
      </div>

      <Tabs defaultValue="escalas">
        <TabsList>
          <TabsTrigger value="escalas">Escalas</TabsTrigger>
          <TabsTrigger value="membros">Membros ({members.length})</TabsTrigger>
          <TabsTrigger value="areas">Áreas ({areas.length})</TabsTrigger>
        </TabsList>

        {/* ---------- Escalas ---------- */}
        <TabsContent value="escalas" className="space-y-4">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento aprovado pela frente.</p>
          ) : (
            <>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {format(new Date(e.starts_at), "EEE dd/MM HH:mm", { locale: ptBR })} — {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {canEdit && (
                <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
                  <Select value={pick.area_id || NONE} onValueChange={(v) => setPick({ area_id: v === NONE ? "" : v, member_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Escolha a área</SelectItem>
                      {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.ministry_name} · {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={pick.member_id || NONE} onValueChange={(v) => setPick({ ...pick, member_id: v === NONE ? "" : v })} disabled={!pick.area_id}>
                    <SelectTrigger><SelectValue placeholder="Membro" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Escolha o membro</SelectItem>
                      {candidates.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}{m.whatsapp ? "" : " (sem WhatsApp)"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={addEntry} disabled={!pick.area_id || !pick.member_id}><UserPlus className="w-4 h-4 mr-2" />Escalar</Button>
                </div>
              )}

              {byArea.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ninguém escalado neste evento ainda.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {byArea.map(({ area, list }) => (
                    <div key={area.id} className="rounded-lg border border-border bg-card p-4 shadow-card space-y-2">
                      <p className="font-medium flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: area.ministry_color || "#999" }} />
                        {area.ministry_name} · {area.name}
                      </p>
                      {list.map((en) => {
                        const total = en.steps_count || 1;
                        const done = Math.min(en.checked.length, total);
                        return (
                          <div key={en.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <span className="flex-1 min-w-[120px]">{en.member}</span>
                            <Badge variant="outline" className={done >= total ? "text-success border-success/40" : ""}>
                              {en.steps_count ? `${done}/${total}` : done ? "confirmado" : "—"}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground w-20 text-right">
                              {!en.has_whatsapp ? "sem WhatsApp" : en.sent_at ? `enviado ${format(new Date(en.sent_at), "dd/MM")}` : "a enviar"}
                            </span>
                            {canEdit && (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Enviar checklist agora" disabled={!en.has_whatsapp} onClick={() => sendEntry(en)}>
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Tirar da escala" onClick={() => removeEntry(en)}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ---------- Membros ---------- */}
        <TabsContent value="membros" className="space-y-4">
          {canEdit && !memberForm && (
            <Button onClick={() => setMemberForm({ name: "", whatsapp: "", ministry_ids: [] })}><Plus className="w-4 h-4 mr-2" />Novo membro</Button>
          )}
          {memberForm && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Nome" autoFocus />
                <Input value={memberForm.whatsapp} onChange={(e) => setMemberForm({ ...memberForm, whatsapp: e.target.value })} placeholder="WhatsApp (85) 9 9999-9999" inputMode="tel" />
              </div>
              <ChipSelect options={ministries} value={memberForm.ministry_ids} onChange={(v) => setMemberForm({ ...memberForm, ministry_ids: v })} empty="Cadastre os ministérios primeiro" />
              <div className="flex gap-2">
                <Button onClick={saveMember}><Check className="w-4 h-4 mr-2" />Salvar</Button>
                <Button variant="ghost" onClick={() => setMemberForm(null)}><X className="w-4 h-4 mr-2" />Cancelar</Button>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {members.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum membro cadastrado.</p>}
            {members.map((m) => (
              <div key={m.id} className={`flex items-center gap-3 px-4 py-2.5 ${m.active ? "" : "opacity-50"}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{phone(m.whatsapp)} · {m.ministries.map((x) => x.name).join(", ") || "sem ministério"}</p>
                </div>
                {canEdit && (
                  <>
                    <Switch
                      checked={m.active}
                      title={m.active ? "Ativo" : "Inativo"}
                      onCheckedChange={(v) => api.patch(`/api/members/${m.id}`, { active: v }).then(loadMembers).catch(fail)}
                    />
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => setMemberForm({ id: m.id, name: m.name, whatsapp: m.whatsapp || "", ministry_ids: m.ministries.map((x) => x.id) })}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => confirm(`Excluir ${m.name}?`) && api.delete(`/api/members/${m.id}`).then(loadMembers).catch(fail)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ---------- Áreas ---------- */}
        <TabsContent value="areas" className="space-y-4">
          {canEdit && !areaForm && (
            <Button onClick={() => setAreaForm({ ministry_id: "", name: "", pop_id: "" })}><Plus className="w-4 h-4 mr-2" />Nova área</Button>
          )}
          {areaForm && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={areaForm.ministry_id || NONE} onValueChange={(v) => setAreaForm({ ...areaForm, ministry_id: v === NONE ? "" : v })} disabled={!!areaForm.id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Ministério</SelectItem>
                    {ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} placeholder="Área (ex.: Vocal, Câmera, Recepção)" />
              </div>
              <Select value={areaForm.pop_id || NONE} onValueChange={(v) => setAreaForm({ ...areaForm, pop_id: v === NONE ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem checklist (só confirma presença)</SelectItem>
                  {pops.map((p) => <SelectItem key={p.id} value={p.id}>POP: {p.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">O checklist da área vem do POP escolhido (cadastre em POPs).</p>
              <div className="flex gap-2">
                <Button onClick={saveArea}><Check className="w-4 h-4 mr-2" />Salvar</Button>
                <Button variant="ghost" onClick={() => setAreaForm(null)}><X className="w-4 h-4 mr-2" />Cancelar</Button>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {areas.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma área cadastrada.</p>}
            {areas.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.ministry_color || "#999" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.ministry_name} · {a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.pop_title ? `POP: ${a.pop_title} (${a.steps_count} passos)` : "Sem checklist"}</p>
                </div>
                {canEdit && (
                  <>
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => setAreaForm({ id: a.id, ministry_id: a.ministry_id, name: a.name, pop_id: a.pop_id || "" })}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => confirm(`Excluir a área ${a.name}?`) && api.delete(`/api/areas/${a.id}`).then(loadAreas).catch(fail)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
