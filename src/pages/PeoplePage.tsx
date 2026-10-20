import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Cake, Check, Download, Loader2, Search, Trash2, UserPlus, UsersRound } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  GENDER_LABEL,
  MARITAL_LABEL,
  Person,
  RELATION_LABEL,
  Relation,
  ageFrom,
  downloadCsv,
  formatPhone,
  signupUrl,
  waLink,
} from "@/lib/forms";
import PageHeader from "@/components/PageHeader";
import ShareLink from "@/components/forms/ShareLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type Filter = "all" | "new" | Relation | "birthdays";

const RELATION_STYLE: Record<Relation, string> = {
  visitor: "bg-warning/15 text-warning border-warning/30",
  regular: "bg-primary/10 text-primary border-primary/30",
  member: "bg-success/15 text-success border-success/30",
};

/** "1990-05-03" → "03/05/1990" (sem fuso: é uma data, não um horário) */
const brDate = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "");

export default function PeoplePage() {
  const { toast } = useToast();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [ministries, setMinistries] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Person | null>(null);
  const [toDelete, setToDelete] = useState<Person | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get<Person[]>("/api/people").then(setPeople).catch(() => setPeople([]));
  useEffect(() => {
    load();
    api.get<{ id: string; name: string }[]>("/api/ministries").then(setMinistries).catch(() => {});
  }, []);

  const month = new Date().getMonth() + 1;
  const birthdayThisMonth = (p: Person) => !!p.birth_date && Number(p.birth_date.slice(5, 7)) === month;
  const ministryNames = (ids: string[]) => ids.map((id) => ministries.find((m) => m.id === id)?.name).filter(Boolean).join(", ");

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return (people || [])
      .filter((p) =>
        filter === "all" ? true
        : filter === "new" ? p.status === "new"
        : filter === "birthdays" ? birthdayThisMonth(p)
        : p.relation === filter
      )
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (!!digits && p.whatsapp.includes(digits)))
      .sort((a, b) => (filter === "birthdays" ? Number(a.birth_date!.slice(8, 10)) - Number(b.birth_date!.slice(8, 10)) : 0));
  }, [people, filter, search]);

  const count = (f: Filter) =>
    (people || []).filter((p) => (f === "new" ? p.status === "new" : f === "birthdays" ? birthdayThisMonth(p) : p.relation === f)).length;

  const show = async (p: Person) => {
    setOpen(p);
    if (p.status === "new") {
      const updated = await api.patch<Person>(`/api/people/${p.id}`, { status: "seen" }).catch(() => null);
      if (updated) setPeople((ps) => ps?.map((x) => (x.id === p.id ? updated : x)) || ps);
    }
  };

  const toMember = async (p: Person) => {
    setBusy(true);
    try {
      const updated = await api.post<Person>(`/api/people/${p.id}/member`, {});
      setPeople((ps) => ps?.map((x) => (x.id === p.id ? updated : x)) || ps);
      setOpen(updated);
      toast({ title: `${p.name} agora aparece nas Escalas`, description: p.interests.length ? `Áreas: ${ministryNames(p.interests)}` : "Sem área: ajuste em Escalas → Membros." });
    } catch (e: any) {
      toast({ title: "Não foi possível incluir", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/people/${toDelete.id}`);
      setPeople((ps) => ps?.filter((x) => x.id !== toDelete.id) || ps);
      setOpen(null);
      toast({ title: "Cadastro excluído" });
    } catch (e: any) {
      toast({ title: "Não foi possível excluir", description: e.message, variant: "destructive" });
    } finally {
      setToDelete(null);
    }
  };

  const exportCsv = () =>
    downloadCsv("cadastros.csv", [
      ["Nome", "Tipo", "Nascimento", "Idade", "WhatsApp", "E-mail", "Sexo", "Estado civil", "Bairro/cidade", "Batizado", "Como conheceu", "Quer contato", "Quer servir em", "Pedido/observação", "Cadastrado em"],
      ...list.map((p) => [
        p.name, RELATION_LABEL[p.relation], brDate(p.birth_date), ageFrom(p.birth_date), formatPhone(p.whatsapp), p.email,
        p.gender ? GENDER_LABEL[p.gender] : "", p.marital_status ? MARITAL_LABEL[p.marital_status] : "", p.neighborhood,
        p.baptized === null ? "" : p.baptized ? "Sim" : "Não", p.how_found, p.wants_contact ? "Sim" : "", ministryNames(p.interests), p.notes,
        format(new Date(p.created_at), "dd/MM/yyyy HH:mm"),
      ]),
    ]);

  const info = (label: string, value: React.ReactNode) =>
    value || value === 0 ? (
      <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-border last:border-0">
        <span className="text-muted-foreground shrink-0">{label}</span>
        <span className="text-right">{value}</span>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadastros"
        description="Membros, frequentadores e visitantes que preencheram o formulário da igreja."
        actions={<Button variant="outline" onClick={exportCsv} disabled={!list.length}><Download className="w-4 h-4 mr-2" />Planilha</Button>}
      />

      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" />Link do formulário de cadastro</p>
          <p className="text-xs text-muted-foreground">Mande no grupo, coloque na bio do Instagram ou projete o QR code no culto para os visitantes.</p>
          <ShareLink url={signupUrl()} message="🙌 Faça o seu cadastro na igreja:" qrName="cadastro-igreja" />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">Todos ({people?.length || 0})</TabsTrigger>
            <TabsTrigger value="new">Novos ({count("new")})</TabsTrigger>
            <TabsTrigger value="visitor">Visitantes ({count("visitor")})</TabsTrigger>
            <TabsTrigger value="regular">Frequentadores ({count("regular")})</TabsTrigger>
            <TabsTrigger value="member">Membros ({count("member")})</TabsTrigger>
            <TabsTrigger value="birthdays"><Cake className="w-3.5 h-3.5 mr-1" />Aniversariantes ({count("birthdays")})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou WhatsApp" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {people === null ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {people.length ? "Ninguém neste filtro." : "Nenhum cadastro ainda. Compartilhe o link acima."}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const age = ageFrom(p.birth_date);
            return (
              <button key={p.id} onClick={() => show(p)} className="text-left rounded-lg border border-border p-3 hover:bg-muted transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{p.name}</p>
                  {p.status === "new" && <Badge className="text-[10px] shrink-0">Novo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPhone(p.whatsapp)}{age !== null && ` · ${age} anos`}{filter === "birthdays" && ` · dia ${p.birth_date!.slice(8, 10)}`}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="outline" className={`text-[11px] ${RELATION_STYLE[p.relation]}`}>{RELATION_LABEL[p.relation]}</Badge>
                  {p.wants_contact && <Badge variant="outline" className="text-[11px]">Quer contato</Badge>}
                  {p.member_id && <Badge variant="outline" className="text-[11px]"><UsersRound className="w-3 h-3 mr-1" />Nas escalas</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.name}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className={RELATION_STYLE[open.relation]}>{RELATION_LABEL[open.relation]}</Badge>
                {open.wants_contact && <Badge variant="outline">Quer que entrem em contato</Badge>}
              </div>
              <div>
                {info("WhatsApp", <a href={waLink(open.whatsapp)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{formatPhone(open.whatsapp)}</a>)}
                {info("Nascimento", open.birth_date && `${brDate(open.birth_date)} (${ageFrom(open.birth_date)} anos)`)}
                {info("E-mail", open.email)}
                {info("Sexo", open.gender && GENDER_LABEL[open.gender])}
                {info("Estado civil", open.marital_status && MARITAL_LABEL[open.marital_status])}
                {info("Bairro / cidade", open.neighborhood)}
                {info("Batizado(a)", open.baptized === null ? null : open.baptized ? "Sim" : "Não")}
                {info("Como conheceu", open.how_found)}
                {info("Quer servir em", ministryNames(open.interests))}
                {info("Cadastrado em", format(new Date(open.created_at), "dd/MM/yyyy HH:mm"))}
              </div>
              {open.notes && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Pedido de oração / observação</p>
                  <p className="whitespace-pre-line">{open.notes}</p>
                </div>
              )}
              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="ghost" className="text-destructive" onClick={() => setToDelete(open)}><Trash2 className="w-4 h-4 mr-2" />Excluir</Button>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <a href={waLink(open.whatsapp)} target="_blank" rel="noreferrer">Chamar no WhatsApp</a>
                  </Button>
                  {open.member_id ? (
                    <Button disabled variant="secondary"><Check className="w-4 h-4 mr-2" />Nas escalas</Button>
                  ) : (
                    <Button onClick={() => toMember(open)} disabled={busy} title="Inclui a pessoa em Escalas → Membros, com as áreas que ela escolheu">
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UsersRound className="w-4 h-4 mr-2" />}Incluir nas escalas
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o cadastro de {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Os dados dessa pessoa são apagados. Se ela já estiver nas escalas, continua lá.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
