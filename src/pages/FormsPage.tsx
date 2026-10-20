import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpCircle, ClipboardPen, Download, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import { cap } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EventItem, canManageEvent } from "@/lib/events";
import { EventForm, Registration, downloadCsv, eventFormUrl, formatPhone, waLink } from "@/lib/forms";
import PageHeader from "@/components/PageHeader";
import ShareLink from "@/components/forms/ShareLink";
import RegistrationFormDialog from "@/components/forms/RegistrationFormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FormSummary {
  id: string;
  event_id: string;
  slug: string;
  title: string | null;
  is_open: boolean;
  capacity: number | null;
  event_title: string;
  starts_at: string;
  confirmed: number;
  waitlist: number;
  can_edit: boolean;
}

interface Detail {
  form: EventForm | null;
  registrations: Registration[];
  can_edit: boolean;
}

const REFRESH_MS = 10_000;

export default function FormsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const selected = params.get("event") || "";
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ eventId?: string; form?: EventForm | null } | null>(null);
  const [toDelete, setToDelete] = useState<"form" | Registration | null>(null);

  const loadForms = () => api.get<FormSummary[]>("/api/events/forms").then(setForms).catch(() => setForms([]));
  const loadDetail = (eventId = selected) =>
    eventId ? api.get<Detail>(`/api/events/${eventId}/form`).then(setDetail).catch(() => setDetail(null)) : Promise.resolve();

  useEffect(() => {
    loadForms();
    api.get<EventItem[]>("/api/events").then(setEvents).catch(() => {});
  }, []);

  // Inscritos atualizam sozinhos enquanto a tela está aberta
  useEffect(() => {
    setDetail(null);
    setSearch("");
    if (!selected) return;
    loadDetail(selected);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDetail(selected);
        loadForms();
      }
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [selected]);

  // Veio da Agenda (?event=…&criar=1): abre a criação já com o evento escolhido
  useEffect(() => {
    if (params.get("criar") && selected && detail && !detail.form && detail.can_edit) {
      setEditor({ eventId: selected, form: null });
      params.delete("criar");
      setParams(params, { replace: true });
    }
  }, [detail]);

  const select = (eventId: string) => setParams(eventId ? { event: eventId } : {});

  // Eventos futuros sem formulário que a pessoa pode editar
  const available = useMemo(
    () => events.filter((e) => e.status !== "rejected" && !isPast(new Date(e.starts_at)) && !e.form_id && canManageEvent(user, e)),
    [events, user]
  );
  const allEvents = useMemo(() => events.map((e) => ({ id: e.id, title: e.title, starts_at: e.starts_at })), [events]);
  const current = forms?.find((f) => f.event_id === selected);
  const ev = events.find((e) => e.id === selected);
  const form = detail?.form || null;

  const regs = (detail?.registrations || []).filter((r) => {
    const q = search.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.whatsapp.includes(q.replace(/\D/g, "") || "§");
  });
  const confirmed = regs.filter((r) => r.status === "confirmed");
  const waitlist = regs.filter((r) => r.status === "waitlist");

  const afterSave = (eventId: string) => {
    loadForms();
    api.get<EventItem[]>("/api/events").then(setEvents).catch(() => {});
    if (eventId === selected) loadDetail(eventId);
    else select(eventId);
  };

  const toggleOpen = async (open: boolean) => {
    if (!form) return;
    try {
      await api.put(`/api/events/${form.event_id}/form`, { ...form, is_open: open });
      toast({ title: open ? "Inscrições abertas" : "Inscrições fechadas" });
      loadDetail();
      loadForms();
    } catch (e: any) {
      toast({ title: "Não foi possível alterar", description: e.message, variant: "destructive" });
    }
  };

  const setStatus = async (r: Registration, status: Registration["status"]) => {
    try {
      await api.patch(`/api/events/form-registrations/${r.id}`, { status });
      loadDetail();
      loadForms();
    } catch (e: any) {
      toast({ title: "Não foi possível alterar", description: e.message, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      if (toDelete === "form") {
        await api.delete(`/api/events/${selected}/form`);
        toast({ title: "Formulário excluído" });
        select("");
        afterSave("");
      } else {
        await api.delete(`/api/events/form-registrations/${toDelete.id}`);
        toast({ title: `${toDelete.name} saiu da lista` });
        loadDetail();
        loadForms();
      }
    } catch (e: any) {
      toast({ title: "Não foi possível excluir", description: e.message, variant: "destructive" });
    } finally {
      setToDelete(null);
    }
  };

  const exportCsv = () => {
    if (!form || !detail) return;
    const fs = form.fields;
    downloadCsv(`inscricoes-${(current?.event_title || "evento").replace(/\W+/g, "-").toLowerCase()}.csv`, [
      ["#", "Nome", "WhatsApp", ...fs.map((f) => f.label), "Situação", "Inscrito em"],
      ...detail.registrations.map((r, i) => [
        i + 1, r.name, formatPhone(r.whatsapp), ...fs.map((f) => r.answers[f.id]),
        r.status === "confirmed" ? "Confirmado" : "Lista de espera", format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
      ]),
    ]);
  };

  const row = (r: Registration, i: number) => (
    <div key={r.id} className="flex items-start gap-3 px-3 py-2.5">
      <span className="text-xs text-muted-foreground w-6 pt-0.5 text-right shrink-0">{i + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{r.name}</p>
        <p className="text-xs text-muted-foreground">
          <a href={waLink(r.whatsapp)} target="_blank" rel="noreferrer" className="hover:text-primary">{formatPhone(r.whatsapp)}</a>
          {" · "}{format(new Date(r.created_at), "dd/MM HH:mm")}
        </p>
        {form && form.fields.some((f) => r.answers[f.id]) && (
          <p className="text-xs mt-1 space-x-3">
            {form.fields.filter((f) => r.answers[f.id]).map((f) => (
              <span key={f.id} className="inline-block"><span className="text-muted-foreground">{f.label}:</span> {r.answers[f.id]}</span>
            ))}
          </p>
        )}
      </div>
      {detail?.can_edit && (
        <div className="flex shrink-0">
          {r.status === "waitlist" && (
            <Button size="icon" variant="ghost" title="Confirmar (passar da lista de espera)" onClick={() => setStatus(r, "confirmed")}>
              <ArrowUpCircle className="w-4 h-4 text-success" />
            </Button>
          )}
          <Button size="icon" variant="ghost" title="Remover inscrição" onClick={() => setToDelete(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inscrições"
        description="Formulários de inscrição dos eventos. Compartilhe o link e acompanhe quem se inscreve."
        actions={<Button onClick={() => setEditor({})}><Plus className="w-4 h-4 mr-2" />Criar formulário</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Formulários */}
        <div className="space-y-2">
          {forms === null ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : forms.length === 0 ? (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">Nenhum formulário ainda. Clique em "Criar formulário" e escolha o evento.</CardContent></Card>
          ) : (
            forms.map((f) => {
              const past = isPast(new Date(f.starts_at));
              return (
                <button
                  key={f.id}
                  onClick={() => select(f.event_id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    f.event_id === selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  } ${past ? "opacity-60" : ""}`}
                >
                  <p className="text-sm font-medium truncate">{f.title || f.event_title}</p>
                  <p className="text-xs text-muted-foreground">{cap(format(new Date(f.starts_at), "EEE dd/MM HH:mm", { locale: ptBR }))}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Badge variant="secondary" className="text-[11px]"><Users className="w-3 h-3 mr-1" />{f.confirmed}{f.capacity ? `/${f.capacity}` : ""}</Badge>
                    {f.waitlist > 0 && <Badge variant="outline" className="text-[11px]">+{f.waitlist} espera</Badge>}
                    <Badge variant="outline" className={`text-[11px] ${f.is_open && !past ? "text-success border-success/40" : "text-muted-foreground"}`}>
                      {past ? "Encerrado" : f.is_open ? "Aberto" : "Fechado"}
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detalhe */}
        <div>
          {!selected ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
              <ClipboardPen className="w-8 h-8 mx-auto mb-2 text-primary" />
              Escolha um formulário ao lado para ver o link e a lista de inscritos.
            </CardContent></Card>
          ) : !detail ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !form ? (
            <Card><CardContent className="p-6 space-y-3 text-center">
              <p className="font-medium">{ev?.title}</p>
              <p className="text-sm text-muted-foreground">Este evento ainda não tem formulário de inscrição.</p>
              {detail.can_edit && <Button onClick={() => setEditor({ eventId: selected, form: null })}><Plus className="w-4 h-4 mr-2" />Criar formulário</Button>}
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold">{form.title || current?.event_title || ev?.title}</h2>
                    {current && <p className="text-sm text-muted-foreground">{cap(format(new Date(current.starts_at), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR }))}</p>}
                  </div>
                  {detail.can_edit && (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={form.is_open} onCheckedChange={toggleOpen} />{form.is_open ? "Aberto" : "Fechado"}
                      </label>
                      <Button size="sm" variant="outline" onClick={() => setEditor({ eventId: selected, form })}><Pencil className="w-4 h-4 mr-1" />Editar</Button>
                      <Button size="icon" variant="ghost" title="Excluir formulário" onClick={() => setToDelete("form")}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  )}
                </div>

                <ShareLink
                  url={eventFormUrl(form.slug)}
                  message={`📝 Inscrições abertas: *${form.title || current?.event_title || ""}*. Faça a sua inscrição pelo link:`}
                  qrName={`inscricao-${form.slug}`}
                />

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-xl font-semibold">{form.confirmed}</p>
                    <p className="text-[11px] text-muted-foreground">Confirmados</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-xl font-semibold">{form.capacity ? Math.max(0, form.capacity - form.confirmed) : "∞"}</p>
                    <p className="text-[11px] text-muted-foreground">Vagas livres</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-xl font-semibold">{form.waitlist}</p>
                    <p className="text-[11px] text-muted-foreground">Lista de espera</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Buscar inscrito" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <Button variant="outline" onClick={exportCsv} disabled={!detail.registrations.length}><Download className="w-4 h-4 mr-2" />Planilha</Button>
                </div>

                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <RefreshCw className="w-3 h-3" />A lista atualiza sozinha a cada {REFRESH_MS / 1000} segundos.
                </p>

                {detail.registrations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Ninguém se inscreveu ainda. Compartilhe o link acima.</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-1.5">Confirmados ({confirmed.length})</p>
                      <div className="rounded-md border border-border divide-y divide-border">
                        {confirmed.length ? confirmed.map(row) : <p className="p-3 text-sm text-muted-foreground">Nenhum.</p>}
                      </div>
                    </div>
                    {waitlist.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1.5">Lista de espera ({waitlist.length})</p>
                        <div className="rounded-md border border-border divide-y divide-border">{waitlist.map(row)}</div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <RegistrationFormDialog
        open={!!editor}
        onOpenChange={(o) => !o && setEditor(null)}
        events={editor?.eventId ? allEvents : available.map((e) => ({ id: e.id, title: e.title, starts_at: e.starts_at }))}
        eventId={editor?.eventId}
        form={editor?.form}
        onSaved={afterSave}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toDelete === "form" ? "Excluir o formulário?" : "Remover esta inscrição?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete === "form"
                ? `O link para de funcionar e a lista com ${detail?.registrations.length || 0} inscrito(s) é apagada. Baixe a planilha antes, se precisar.`
                : toDelete && `${toDelete.name} sai da lista.${toDelete.status === "confirmed" && form?.waitlist ? " O primeiro da lista de espera passa para confirmado." : ""}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              {toDelete === "form" ? "Excluir formulário" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
