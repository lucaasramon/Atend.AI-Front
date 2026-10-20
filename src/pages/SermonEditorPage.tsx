import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDown, ArrowLeft, ArrowUp, BookMarked, Check, CloudOff, Copy, Loader2, MonitorPlay, Plus, StickyNote, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cap } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { EventItem } from "@/lib/events";
import {
  BLOCK_COLOR,
  BLOCK_LABEL,
  BlockKind,
  Sermon,
  SermonBlock,
  cacheSermon,
  clock,
  minutesLabel,
  newBlock,
  plannedMinutes,
} from "@/lib/sermons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NO_EVENT = "none";
type SaveState = "saved" | "pending" | "saving" | "error";

export default function SermonEditorPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [save, setSave] = useState<SaveState>("saved");
  const timer = useRef<number>();
  const latest = useRef<Sermon | null>(null);

  useEffect(() => {
    api.get<Sermon>(`/api/sermons/${id}`)
      .then((s) => {
        setSermon(s);
        if (s.can_edit) cacheSermon(s);
      })
      .catch((e: Error) => setError(e.message));
    api.get<EventItem[]>("/api/events").then(setEvents).catch(() => {});
  }, [id]);

  // Salva sozinho 1,5s depois da última alteração
  const persist = async () => {
    const s = latest.current;
    if (!s) return;
    setSave("saving");
    try {
      const saved = await api.put<Sermon>(`/api/sermons/${s.id}`, s);
      cacheSermon(saved);
      setSave(latest.current === s ? "saved" : "pending");
    } catch {
      cacheSermon(s); // sem internet: pelo menos fica no aparelho
      setSave("error");
    }
  };

  const change = (patch: Partial<Sermon>) => {
    setSermon((s) => {
      if (!s) return s;
      const next = { ...s, ...patch };
      latest.current = next;
      return next;
    });
    setSave("pending");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(persist, 1500);
  };

  // Ao sair da tela, salva o que estiver pendente
  useEffect(() => () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      persist();
    }
  }, []);

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild><Link to="/admin/pregacoes"><ArrowLeft className="w-4 h-4 mr-2" />Pregações</Link></Button>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }
  if (!sermon) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const edit = sermon.can_edit;
  const blocks = sermon.blocks;
  const setBlocks = (b: SermonBlock[]) => change({ blocks: b });
  const updateBlock = (i: number, patch: Partial<SermonBlock>) => setBlocks(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...blocks];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setBlocks(next);
  };
  const addBlock = (kind: BlockKind) => {
    const points = blocks.filter((b) => b.kind === "point").length;
    setBlocks([...blocks, newBlock(kind, kind === "point" ? `Ponto ${points + 1}` : BLOCK_LABEL[kind], kind === "point" ? 8 : 5)]);
  };

  const upcoming = events.filter((e) => e.status !== "rejected" && (!isPast(new Date(e.starts_at)) || e.id === sermon.event_id));
  const allVerses = blocks.flatMap((b) => b.verses).filter((v) => v.ref || v.text);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${what} copiado` });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };
  const verseText = (v: { ref: string; text: string }) => [v.text.trim(), v.ref && `(${v.ref})`].filter(Boolean).join(" ");

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/admin/pregacoes")}><ArrowLeft className="w-4 h-4 mr-2" />Pregações</Button>
        <div className="flex items-center gap-3">
          {edit && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {save === "saving" || save === "pending" ? <><Loader2 className="w-3 h-3 animate-spin" />Salvando…</>
                : save === "error" ? <span className="text-warning flex items-center gap-1"><CloudOff className="w-3 h-3" />Sem conexão: salvo só no aparelho</span>
                : <><Check className="w-3 h-3 text-success" />Salvo</>}
            </span>
          )}
          {edit && <Button size="sm" onClick={() => navigate(`/pulpito/${sermon.id}`)}><MonitorPlay className="w-4 h-4 mr-1.5" />Abrir no púlpito</Button>}
        </div>
      </div>

      {/* Dados gerais */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {edit ? (
            <>
              <div className="space-y-1.5">
                <Label>Título da pregação</Label>
                <Input className="text-lg font-semibold" value={sermon.title} onChange={(e) => change({ title: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Texto base</Label>
                  <Input placeholder="Ex.: Romanos 8" value={sermon.bible_text || ""} onChange={(e) => change({ bible_text: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Culto / evento</Label>
                  <Select value={sermon.event_id || NO_EVENT} onValueChange={(v) => change({ event_id: v === NO_EVENT ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_EVENT}>Sem evento definido</SelectItem>
                      {upcoming.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{cap(format(new Date(e.starts_at), "EEE dd/MM HH:mm", { locale: ptBR }))} — {e.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <div>
              <h1 className="text-xl font-semibold">{sermon.title}</h1>
              <p className="text-sm text-muted-foreground">
                {[sermon.author_name, sermon.bible_text, sermon.event_starts_at && `${cap(format(new Date(sermon.event_starts_at), "EEE dd/MM HH:mm", { locale: ptBR }))} · ${sermon.event_title}`].filter(Boolean).join(" · ")}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {blocks.length} blocos · tempo planejado <b className="text-foreground">{minutesLabel(plannedMinutes(blocks))}</b>
            {sermon.preached_at && <> · pregada em {format(new Date(sermon.preached_at), "dd/MM/yyyy")} em <b className="text-foreground">{clock(sermon.duration_sec || 0)}</b></>}
          </p>
        </CardContent>
      </Card>

      {/* Mídia: todos os versículos de uma vez */}
      {!edit && allVerses.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium flex items-center gap-2"><BookMarked className="w-4 h-4 text-primary" />Versículos para projetar ({allVerses.length})</p>
              <Button size="sm" variant="outline" onClick={() => copy(allVerses.map(verseText).join("\n\n"), "Versículos")}><Copy className="w-4 h-4 mr-1.5" />Copiar todos</Button>
            </div>
            <p className="text-xs text-muted-foreground">Na ordem em que aparecem na pregação.</p>
          </CardContent>
        </Card>
      )}

      {/* Blocos */}
      <div className="space-y-3">
        {blocks.map((b, i) => {
          const real = sermon.block_times?.find((t) => t.id === b.id)?.seconds;
          return (
            <Card key={b.id} className="border-l-4" style={{ borderLeftColor: BLOCK_COLOR[b.kind] }}>
              <CardContent className="p-4 space-y-3">
                {edit ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={b.kind} onValueChange={(v) => updateBlock(i, { kind: v as BlockKind })}>
                      <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(BLOCK_LABEL) as BlockKind[]).map((k) => <SelectItem key={k} value={k}>{BLOCK_LABEL[k]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="flex-1 min-w-[10rem] h-9 font-medium" value={b.title} placeholder="Título do bloco" onChange={(e) => updateBlock(i, { title: e.target.value })} />
                    <div className="flex items-center gap-1 text-sm">
                      <Input type="number" min={0} step={0.5} className="w-16 h-9" value={b.minutes} onChange={(e) => updateBlock(i, { minutes: Number(e.target.value) })} />min
                    </div>
                    <div className="flex">
                      <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} title="Subir"><ArrowUp className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} title="Descer"><ArrowDown className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))} title="Remover bloco"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold">
                      <span className="text-xs uppercase tracking-wide mr-2" style={{ color: BLOCK_COLOR[b.kind] }}>{BLOCK_LABEL[b.kind]}</span>
                      {b.title !== BLOCK_LABEL[b.kind] && b.title}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">{b.minutes} min</span>
                  </div>
                )}
                {real !== undefined && (
                  <p className="text-xs text-muted-foreground">Na pregação: {clock(real)} (planejado {b.minutes} min)</p>
                )}

                {edit ? (
                  <Textarea rows={4} placeholder="Texto principal do bloco (o que você vai falar)" value={b.text} onChange={(e) => updateBlock(i, { text: e.target.value })} />
                ) : (
                  b.text && <p className="text-sm whitespace-pre-line">{b.text}</p>
                )}

                {/* Versículos */}
                <div className="space-y-2">
                  {b.verses.map((v, vi) => (
                    <div key={vi} className="rounded-md bg-muted/60 p-2 space-y-1.5">
                      {edit ? (
                        <>
                          <div className="flex gap-2">
                            <Input className="h-8 w-40 font-medium" placeholder="Rm 8:28" value={v.ref} onChange={(e) => updateBlock(i, { verses: b.verses.map((x, k) => (k === vi ? { ...x, ref: e.target.value } : x)) })} />
                            <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" title="Remover versículo" onClick={() => updateBlock(i, { verses: b.verses.filter((_, k) => k !== vi) })}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                          <Textarea rows={2} className="text-sm" placeholder="Cole aqui o texto do versículo" value={v.text} onChange={(e) => updateBlock(i, { verses: b.verses.map((x, k) => (k === vi ? { ...x, text: e.target.value } : x)) })} />
                        </>
                      ) : (
                        <div className="flex items-start gap-2">
                          <p className="text-sm flex-1"><b>{v.ref}</b>{v.text && <> — {v.text}</>}</p>
                          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" title="Copiar" onClick={() => copy(verseText(v), v.ref || "Versículo")}><Copy className="w-3.5 h-3.5" /></Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {edit && (
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => updateBlock(i, { verses: [...b.verses, { ref: "", text: "" }] })}>
                      <BookMarked className="w-4 h-4 mr-1.5" />Adicionar versículo
                    </Button>
                  )}
                </div>

                {/* Anotações */}
                {edit ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><StickyNote className="w-3 h-3" />Anotações</Label>
                    <Textarea rows={2} className="text-sm" placeholder="Lembretes, ilustrações, perguntas…" value={b.notes} onChange={(e) => updateBlock(i, { notes: e.target.value })} />
                  </div>
                ) : (
                  b.notes && <p className="text-xs text-muted-foreground whitespace-pre-line rounded-md border border-dashed border-border p-2">{b.notes}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {edit && (
        <div className="flex flex-wrap gap-2">
          {(["intro", "point", "illustration", "appeal", "conclusion", "free"] as BlockKind[]).map((k) => (
            <Button key={k} size="sm" variant="outline" onClick={() => addBlock(k)}><Plus className="w-4 h-4 mr-1" />{BLOCK_LABEL[k]}</Button>
          ))}
        </div>
      )}
    </div>
  );
}
