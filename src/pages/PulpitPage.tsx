import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Lock, Minus, Pause, Play, Plus, Square, Sun, SunDim, Unlock, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  BLOCK_COLOR,
  BLOCK_LABEL,
  Sermon,
  cacheSermon,
  cachedSermon,
  clearPreached,
  clock,
  plannedMinutes,
  queuePreached,
} from "@/lib/sermons";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Intervalo mínimo entre dois toques de troca de bloco (evita pular dois por engano) */
const NAV_GUARD_MS = 1200;
/** Tempo segurando o cadeado para destravar */
const UNLOCK_HOLD_MS = 1000;
const FONT_KEY = "pulpit:font";
const stateKey = (id: string) => `pulpit:state:${id}`;

interface RunState {
  idx: number;
  times: Record<string, number>; // segundos em cada bloco
  running: boolean;
  startedAt: string | null;
}

const readState = (id: string): RunState | null => {
  try {
    return JSON.parse(localStorage.getItem(stateKey(id)) || "null");
  } catch {
    return null;
  }
};

/** Cor da barra do bloco: verde até 75% do tempo, amarelo até 100%, vermelho depois */
const barColor = (ratio: number) => (ratio < 0.75 ? "#22c55e" : ratio < 1 ? "#f59e0b" : "#ef4444");

export default function PulpitPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const saved = readState(id);
  const [idx, setIdx] = useState(saved?.idx || 0);
  const [times, setTimes] = useState<Record<string, number>>(saved?.times || {});
  const [running, setRunning] = useState(false); // sempre começa pausado, mesmo retomando
  const [startedAt, setStartedAt] = useState<string | null>(saved?.startedAt || null);
  const [font, setFont] = useState(() => Number(localStorage.getItem(FONT_KEY)) || 26);
  const [locked, setLocked] = useState(false);
  const [awake, setAwake] = useState<"on" | "off" | "unsupported">("off");
  const [ending, setEnding] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const lastNav = useRef(0);
  const lastTick = useRef(Date.now());
  const holdTimer = useRef<number>();
  const contentRef = useRef<HTMLDivElement>(null);

  // Carrega da internet; sem conexão, usa o que ficou guardado no aparelho
  useEffect(() => {
    api.get<Sermon>(`/api/sermons/${id}`)
      .then((s) => {
        setSermon(s);
        cacheSermon(s);
      })
      .catch((e: Error & { status?: number }) => {
        const cached = cachedSermon(id);
        if (cached && (!e.status || e.status >= 500)) {
          setSermon(cached);
          setOffline(true);
        } else setError(e.message);
      });
  }, [id]);

  // Tela sempre acesa enquanto o painel estiver aberto
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void>; addEventListener: (e: string, f: () => void) => void }> } };
    if (!nav.wakeLock) {
      setAwake("unsupported");
      return;
    }
    let sentinel: { release: () => Promise<void> } | null = null;
    const acquire = async () => {
      try {
        const s = await nav.wakeLock!.request("screen");
        sentinel = s;
        setAwake("on");
        s.addEventListener("release", () => setAwake("off"));
      } catch {
        setAwake("off");
      }
    };
    acquire();
    // O navegador solta a trava quando a aba some; pega de novo ao voltar
    const onVisible = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, []);

  const blocks = sermon?.blocks || [];
  const block = blocks[idx];

  // Esboço mudou e o bloco guardado não existe mais: volta ao início
  useEffect(() => {
    if (sermon && idx >= blocks.length) setIdx(0);
  }, [sermon]);

  // Relógio: soma o tempo real (não depende do intervalo ser exato)
  useEffect(() => {
    if (!running || !block) return;
    lastTick.current = Date.now();
    const t = window.setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTick.current) / 1000;
      lastTick.current = now;
      setTimes((x) => ({ ...x, [block.id]: (x[block.id] || 0) + delta }));
    }, 1000);
    return () => window.clearInterval(t);
  }, [running, block?.id]);

  // Guarda o andamento: se a página recarregar sem querer, continua de onde parou
  useEffect(() => {
    if (!sermon) return;
    try {
      localStorage.setItem(stateKey(id), JSON.stringify({ idx, times, running, startedAt }));
    } catch {
      /* sem espaço: segue */
    }
  }, [idx, times, running, startedAt, sermon]);

  useEffect(() => {
    try {
      localStorage.setItem(FONT_KEY, String(font));
    } catch {
      /* nada */
    }
  }, [font]);

  const go = useCallback(
    (d: -1 | 1) => {
      if (locked || !blocks.length) return;
      const now = Date.now();
      if (now - lastNav.current < NAV_GUARD_MS) return;
      lastNav.current = now;
      setIdx((i) => Math.min(blocks.length - 1, Math.max(0, i + d)));
      contentRef.current?.scrollTo({ top: 0 });
    },
    [locked, blocks.length]
  );

  // Passador de slides (clicker) e teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const start = () => {
    if (!startedAt) setStartedAt(new Date().toISOString());
    setRunning(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const finish = async () => {
    if (!sermon) return;
    const report = {
      sermon_id: sermon.id,
      started_at: startedAt || new Date().toISOString(),
      ended_at: new Date().toISOString(),
      block_times: blocks.map((b) => ({ id: b.id, seconds: Math.round(times[b.id] || 0) })),
    };
    try {
      await api.post(`/api/sermons/${sermon.id}/preached`, report);
      clearPreached(sermon.id);
      toast({ title: "Pregação salva no histórico" });
    } catch {
      queuePreached(report);
      toast({ title: "Sem internet: o relatório ficou no aparelho", description: "Ele é enviado na próxima vez que você abrir Pregações." });
    }
    try {
      localStorage.removeItem(stateKey(id));
    } catch {
      /* nada */
    }
    document.exitFullscreen?.().catch(() => {});
    navigate(`/admin/pregacoes/${sermon.id}`);
  };

  const exit = () => {
    document.exitFullscreen?.().catch(() => {});
    navigate("/admin/pregacoes");
  };

  // Destravar: segurar o cadeado
  const holdStart = () => {
    holdTimer.current = window.setTimeout(() => setLocked(false), UNLOCK_HOLD_MS);
  };
  const holdEnd = () => window.clearTimeout(holdTimer.current);

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p>{error}</p>
        <Button variant="secondary" onClick={exit}>Voltar</Button>
      </div>
    );
  }
  if (!sermon) return <div className="min-h-[100dvh] bg-black" />;

  const blockSec = block ? times[block.id] || 0 : 0;
  const blockPlanned = (block?.minutes || 0) * 60;
  const ratio = blockPlanned ? blockSec / blockPlanned : 0;
  const totalSec = Object.values(times).reduce((a, b) => a + b, 0);
  const totalPlanned = plannedMinutes(blocks) * 60;
  const next = blocks[idx + 1];

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col select-none" style={{ colorScheme: "dark" }}>
      {/* Topo */}
      <div className="flex items-center gap-2 px-2 sm:px-3 h-14 border-b border-white/10 shrink-0">
        <button className="p-2 rounded-md hover:bg-white/10" title="Sair do púlpito" onClick={() => (running || totalSec > 0 ? setConfirmExit(true) : exit())}>
          <X className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{sermon.title}</p>
          <p className="text-[11px] text-white/50 flex items-center gap-1.5">
            Bloco {idx + 1} de {blocks.length}
            {offline && <span className="text-amber-400">· sem internet (cópia do aparelho)</span>}
            {awake === "on" ? <span className="flex items-center gap-0.5 text-white/40"><Sun className="w-3 h-3" />tela acesa</span>
              : awake === "unsupported" && <span className="flex items-center gap-0.5 text-amber-400"><SunDim className="w-3 h-3" />este navegador pode apagar a tela</span>}
          </p>
        </div>
        <button className="p-2 rounded-md hover:bg-white/10" title="Diminuir letra" onClick={() => setFont((f) => Math.max(16, f - 2))}><Minus className="w-5 h-5" /></button>
        <span className="text-xs text-white/50 w-6 text-center">{font}</span>
        <button className="p-2 rounded-md hover:bg-white/10" title="Aumentar letra" onClick={() => setFont((f) => Math.min(60, f + 2))}><Plus className="w-5 h-5" /></button>
        <button className="p-2 rounded-md hover:bg-white/10" title="Travar a tela" onClick={() => setLocked(true)}><Lock className="w-5 h-5" /></button>
      </div>

      {/* Relógios */}
      <div className="px-3 sm:px-5 py-2 space-y-2 border-b border-white/10 shrink-0">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium" style={{ color: block ? BLOCK_COLOR[block.kind] : undefined }}>{block?.title}</span>
            <span className="tabular-nums font-semibold" style={{ color: blockPlanned ? barColor(ratio) : undefined }}>
              {clock(blockSec)}{blockPlanned > 0 && <span className="text-white/50 font-normal"> / {clock(blockPlanned)}</span>}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ratio * 100)}%`, backgroundColor: barColor(ratio) }} />
          </div>
        </div>
        <div className="flex justify-between text-xs text-white/60">
          <span>Total da pregação</span>
          <span className="tabular-nums">
            <b className={totalPlanned && totalSec > totalPlanned ? "text-red-400" : "text-white"}>{clock(totalSec)}</b> / {clock(totalPlanned)}
          </span>
        </div>
      </div>

      {/* Conteúdo com as laterais de toque */}
      <div className="flex flex-1 min-h-0">
        <button
          className="w-12 sm:w-20 shrink-0 flex items-center justify-center text-white/30 active:bg-white/10 disabled:opacity-0"
          disabled={idx === 0}
          onClick={() => go(-1)}
          aria-label="Bloco anterior"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        <div ref={contentRef} className="flex-1 overflow-y-auto py-5 px-1 sm:px-4" style={{ fontSize: font }}>
          {block && (
            <div className="max-w-4xl mx-auto space-y-[1em]">
              {block.title.trim().toLowerCase() !== BLOCK_LABEL[block.kind].toLowerCase() && (
                <p className="text-[0.55em] uppercase tracking-widest font-semibold" style={{ color: BLOCK_COLOR[block.kind] }}>{BLOCK_LABEL[block.kind]}</p>
              )}
              <h1 className="text-[1.35em] font-bold leading-tight">{block.title}</h1>
              {block.text && <p className="whitespace-pre-line leading-relaxed">{block.text}</p>}
              {block.verses.map((v, i) => (
                <div key={i} className="border-l-4 border-amber-400/70 pl-[0.6em]">
                  <p className="text-amber-300 font-semibold">{v.ref}</p>
                  {v.text && <p className="leading-relaxed text-white/90">{v.text}</p>}
                </div>
              ))}
              {block.notes && (
                <p className="text-[0.7em] text-white/60 whitespace-pre-line rounded-lg border border-dashed border-white/20 p-[0.8em]">{block.notes}</p>
              )}
              {next && (
                <p className="text-[0.55em] text-white/40 pt-[1em]">A seguir: <b className="text-white/60">{next.title}</b>{next.minutes ? ` (${next.minutes} min)` : ""}</p>
              )}
            </div>
          )}
        </div>

        <button
          className="w-12 sm:w-20 shrink-0 flex items-center justify-center text-white/30 active:bg-white/10 disabled:opacity-0"
          disabled={idx >= blocks.length - 1}
          onClick={() => go(1)}
          aria-label="Próximo bloco"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Rodapé */}
      <div className="flex items-center gap-2 p-3 border-t border-white/10 shrink-0" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {/* Mapa dos blocos */}
        <div className="flex-1 flex gap-1 items-center min-w-0">
          {blocks.map((b, i) => (
            <div
              key={b.id}
              className="h-2 rounded-full flex-1 transition-opacity"
              style={{ backgroundColor: BLOCK_COLOR[b.kind], opacity: i === idx ? 1 : i < idx ? 0.45 : 0.15 }}
              title={b.title}
            />
          ))}
        </div>
        {running ? (
          <Button variant="secondary" size="lg" onClick={() => setRunning(false)}><Pause className="w-5 h-5 mr-2" />Pausar</Button>
        ) : (
          <Button size="lg" onClick={start}><Play className="w-5 h-5 mr-2" />{totalSec > 0 ? "Continuar" : "Iniciar"}</Button>
        )}
        {totalSec > 0 && (
          <Button variant="outline" size="lg" className="bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white" onClick={() => { setRunning(false); setEnding(true); }}>
            <Square className="w-4 h-4 mr-2" />Encerrar
          </Button>
        )}
      </div>

      {/* Tela travada: nada responde, só segurar o cadeado */}
      {locked && (
        <div className="absolute inset-0 z-40 flex items-end justify-center pb-24" onContextMenu={(e) => e.preventDefault()}>
          <button
            className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-5 py-3 text-sm backdrop-blur active:bg-white/20"
            onPointerDown={holdStart}
            onPointerUp={holdEnd}
            onPointerLeave={holdEnd}
            onPointerCancel={holdEnd}
          >
            <Unlock className="w-4 h-4" />Tela travada · segure para destravar
          </button>
        </div>
      )}

      {/* Encerrar */}
      <Dialog open={ending} onOpenChange={setEnding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Encerrar a pregação?</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border border-border divide-y divide-border text-sm">
            {blocks.map((b) => {
              const real = times[b.id] || 0;
              const over = b.minutes > 0 && real > b.minutes * 60;
              return (
                <div key={b.id} className="flex justify-between px-3 py-1.5">
                  <span className="truncate">{b.title}</span>
                  <span className="tabular-nums shrink-0 ml-3">
                    <b className={over ? "text-destructive" : ""}>{clock(real)}</b>
                    <span className="text-muted-foreground"> / {b.minutes} min</span>
                  </span>
                </div>
              );
            })}
            <div className="flex justify-between px-3 py-2 font-medium">
              <span>Total</span>
              <span className="tabular-nums">{clock(totalSec)} <span className="text-muted-foreground font-normal">/ {clock(totalPlanned)}</span></span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEnding(false)}>Continuar pregando</Button>
            <Button onClick={finish}>Salvar no histórico</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sair no meio */}
      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sair do púlpito?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">O tempo fica guardado: ao abrir de novo, você continua de onde parou. Para registrar no histórico, use "Encerrar".</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmExit(false)}>Ficar</Button>
            <Button variant="destructive" onClick={exit}>Sair</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
