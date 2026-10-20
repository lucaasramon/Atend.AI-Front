import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookOpen, CalendarDays, Clock, Eye, Loader2, MonitorPlay, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cap } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Sermon,
  cacheSermon,
  clearPreached,
  clock,
  defaultBlocks,
  minutesLabel,
  pendingPreached,
  plannedMinutes,
  uncacheSermon,
} from "@/lib/sermons";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type Tab = "next" | "history";

export default function SermonsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<{ media_leader: boolean; sermons: Sermon[] } | null>(null);
  const [tab, setTab] = useState<Tab>("next");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Sermon | null>(null);

  const load = () =>
    api.get<{ media_leader: boolean; sermons: Sermon[] }>("/api/sermons")
      .then((d) => {
        setData(d);
        // Guarda no aparelho as do próprio pastor: o púlpito abre mesmo sem internet
        d.sermons.filter((s) => s.can_edit && !s.preached_at).forEach(cacheSermon);
      })
      .catch((e: Error) => {
        setData({ media_leader: false, sermons: [] });
        toast({ title: "Não foi possível carregar", description: e.message, variant: "destructive" });
      });

  useEffect(() => {
    // Relatórios do púlpito que ficaram sem internet: envia agora
    Promise.all(
      pendingPreached().map((r) =>
        api.post(`/api/sermons/${r.sermon_id}/preached`, r).then(() => clearPreached(r.sermon_id)).catch(() => {})
      )
    ).finally(load);
  }, []);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.sermons || [])
      .filter((s) => (tab === "history" ? !!s.preached_at : !s.preached_at))
      .filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          (s.bible_text || "").toLowerCase().includes(q) ||
          (s.author_name || "").toLowerCase().includes(q) ||
          s.blocks.some((b) => b.verses.some((v) => v.ref.toLowerCase().includes(q)))
      );
  }, [data, tab, search]);

  const create = async () => {
    setCreating(true);
    try {
      const s = await api.post<Sermon>("/api/sermons", { title: "Nova pregação", blocks: defaultBlocks() });
      navigate(`/admin/pregacoes/${s.id}`);
    } catch (e: any) {
      toast({ title: "Não foi possível criar", description: e.message, variant: "destructive" });
      setCreating(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/sermons/${toDelete.id}`);
      uncacheSermon(toDelete.id);
      toast({ title: "Pregação excluída" });
      load();
    } catch (e: any) {
      toast({ title: "Não foi possível excluir", description: e.message, variant: "destructive" });
    } finally {
      setToDelete(null);
    }
  };

  const count = (t: Tab) => (data?.sermons || []).filter((s) => (t === "history" ? !!s.preached_at : !s.preached_at)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pregações"
        description={
          data?.media_leader
            ? "Como líder da Mídia, você vê as pregações de todos os pastores para preparar a projeção."
            : "Monte o esboço da mensagem em blocos e pregue com o painel do púlpito."
        }
        actions={
          <Button onClick={create} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Nova pregação
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="next">Para pregar ({count("next")})</TabsTrigger>
            <TabsTrigger value="history">Histórico ({count("history")})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar título, texto ou versículo" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {!data ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
          {tab === "history" ? "Nenhuma pregação feita pelo painel do púlpito ainda." : "Nenhuma pregação para pregar. Clique em \"Nova pregação\"."}
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => {
            const planned = plannedMinutes(s.blocks);
            const verses = s.blocks.flatMap((b) => b.verses.map((v) => v.ref)).filter(Boolean);
            return (
              <Card key={s.id} className="flex flex-col">
                <CardContent className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/admin/pregacoes/${s.id}`} className="font-semibold hover:text-primary">{s.title}</Link>
                    {!s.can_edit && <Badge variant="outline" className="text-[11px] shrink-0">{s.author_name}</Badge>}
                  </div>
                  {s.bible_text && <p className="text-sm text-muted-foreground">{s.bible_text}</p>}
                  <div className="text-xs text-muted-foreground space-y-1">
                    {s.event_starts_at && (
                      <p className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{cap(format(new Date(s.event_starts_at), "EEE dd/MM HH:mm", { locale: ptBR }))} · {s.event_title}</p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {s.preached_at
                        ? `Pregada em ${format(new Date(s.preached_at), "dd/MM/yyyy")} · ${clock(s.duration_sec || 0)} (planejado ${minutesLabel(planned)})`
                        : `${s.blocks.length} blocos · ${minutesLabel(planned)}`}
                    </p>
                  </div>
                  {verses.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {verses.slice(0, 6).map((v, i) => <Badge key={i} variant="secondary" className="text-[11px]">{v}</Badge>)}
                      {verses.length > 6 && <Badge variant="secondary" className="text-[11px]">+{verses.length - 6}</Badge>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2 mt-auto">
                    {s.can_edit && (
                      <Button size="sm" onClick={() => navigate(`/pulpito/${s.id}`)}><MonitorPlay className="w-4 h-4 mr-1.5" />Púlpito</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => navigate(`/admin/pregacoes/${s.id}`)}>
                      {s.can_edit ? <><Pencil className="w-4 h-4 mr-1.5" />Editar</> : <><Eye className="w-4 h-4 mr-1.5" />Ver esboço</>}
                    </Button>
                    {s.can_edit && (
                      <Button size="icon" variant="ghost" className="ml-auto" title="Excluir" onClick={() => setToDelete(s)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{toDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>O esboço e o histórico dessa pregação são apagados.</AlertDialogDescription>
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
