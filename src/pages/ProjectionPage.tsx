import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Expand, List, Square } from "lucide-react";
import { api } from "@/lib/api";
import { Sermon, cacheSermon, cachedSermon, projectionSlides } from "@/lib/sermons";

/**
 * Projeção (telão): um slide por versículo/frase da pregação, na ordem do esboço.
 * Teclado/passador: → espaço PageDown avançam · ← PageUp voltam · B tela preta · F tela cheia · L lista.
 */

/** Tamanho da letra conforme o tamanho do texto (cabe na tela sem rolar) */
const fontFor = (len: number) =>
  len < 50 ? "min(7.5vw, 13vh)" : len < 110 ? "min(5.8vw, 10vh)" : len < 220 ? "min(4.4vw, 7.5vh)" : len < 380 ? "min(3.5vw, 6vh)" : "min(2.8vw, 4.8vh)";

const YELLOW = "#f9b103";

export default function ProjectionPage() {
  const { id = "" } = useParams();
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [black, setBlack] = useState(false);
  const [controls, setControls] = useState(true);
  const [list, setList] = useState(false);
  const hideTimer = useRef<number>();

  useEffect(() => {
    api.get<Sermon>(`/api/sermons/${id}`)
      .then((s) => {
        setSermon(s);
        cacheSermon(s);
      })
      .catch((e: Error & { status?: number }) => {
        const cached = cachedSermon(id);
        if (cached && (!e.status || e.status >= 500)) setSermon(cached);
        else setError(e.message);
      });
  }, [id]);

  const slides = sermon ? projectionSlides(sermon.blocks) : [];
  const slide = slides[idx];

  const go = useCallback((d: number) => {
    setBlack(false);
    setIdx((i) => Math.min(Math.max(0, i + d), Math.max(0, slides.length - 1)));
  }, [slides.length]);

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  // Controles aparecem ao mexer o mouse e somem sozinhos
  const poke = useCallback(() => {
    setControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControls(false), 2500);
  }, []);
  useEffect(() => {
    poke();
    return () => window.clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowright", "pagedown", " ", "enter"].includes(k)) { e.preventDefault(); go(1); }
      else if (["arrowleft", "pageup", "backspace"].includes(k)) { e.preventDefault(); go(-1); }
      else if (k === "home") setIdx(0);
      else if (k === "end") setIdx(Math.max(0, slides.length - 1));
      else if (k === "b" || k === ".") setBlack((b) => !b);
      else if (k === "f") fullscreen();
      else if (k === "l") setList((l) => !l);
      else if (k === "escape") setList(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, slides.length]);

  if (error) return <div className="fixed inset-0 bg-black text-white flex items-center justify-center p-6 text-center">{error}</div>;
  if (!sermon) return <div className="fixed inset-0 bg-black" />;

  return (
    <div
      className="fixed inset-0 bg-black text-white select-none overflow-hidden"
      style={{ cursor: controls ? "default" : "none", colorScheme: "dark" }}
      onMouseMove={poke}
      onClick={(e) => {
        if (list) return;
        // Clique na metade direita avança; na esquerda volta
        go(e.clientX > window.innerWidth / 2 ? 1 : -1);
      }}
    >
      {/* Slide */}
      {!black && slide && (
        <div key={idx} className="absolute inset-0 flex items-center justify-center px-[7vw] py-[8vh] animate-in fade-in duration-300">
          {slide.kind === "verse" ? (
            <div className="text-center max-w-[86vw]">
              {slide.text && (
                <p className="font-semibold leading-[1.25]" style={{ fontSize: fontFor(slide.text.length) }}>{slide.text}</p>
              )}
              {slide.ref && (
                <p className="font-bold mt-[4vh]" style={{ color: YELLOW, fontSize: slide.text ? "min(3.4vw, 6vh)" : "min(8vw, 14vh)" }}>{slide.ref}</p>
              )}
            </div>
          ) : (
            <div className="text-center max-w-[86vw]">
              <div className="mx-auto mb-[4vh] h-[0.9vh] w-[12vw] rounded-full" style={{ backgroundColor: YELLOW }} />
              <p className="font-extrabold leading-[1.15] tracking-tight" style={{ fontSize: fontFor(slide.text.length) }}>{slide.text}</p>
            </div>
          )}
        </div>
      )}

      {slides.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xl px-6 text-center">
          Esta pregação ainda não tem versículos nem frases para a projeção.
        </div>
      )}

      {/* Controles (somem sozinhos; não aparecem para quem não mexe no mouse) */}
      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${controls || list ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 w-fit flex items-center gap-1 rounded-full bg-white/10 backdrop-blur border border-white/15 px-2 py-1.5 text-sm">
          <button className="p-2 rounded-full hover:bg-white/15 disabled:opacity-30" disabled={idx === 0} onClick={() => go(-1)} title="Anterior (←)"><ChevronLeft className="w-5 h-5" /></button>
          <span className="px-2 tabular-nums">{slides.length ? idx + 1 : 0} / {slides.length}</span>
          <button className="p-2 rounded-full hover:bg-white/15 disabled:opacity-30" disabled={idx >= slides.length - 1} onClick={() => go(1)} title="Próximo (→ ou espaço)"><ChevronRight className="w-5 h-5" /></button>
          <span className="w-px h-5 bg-white/20 mx-1" />
          <button className={`p-2 rounded-full hover:bg-white/15 ${black ? "bg-white/20" : ""}`} onClick={() => setBlack((b) => !b)} title="Tela preta (B)"><Square className="w-4 h-4" /></button>
          <button className={`p-2 rounded-full hover:bg-white/15 ${list ? "bg-white/20" : ""}`} onClick={() => setList((l) => !l)} title="Lista de slides (L)"><List className="w-4 h-4" /></button>
          <button className="p-2 rounded-full hover:bg-white/15" onClick={fullscreen} title="Tela cheia (F)"><Expand className="w-4 h-4" /></button>
        </div>
        {slide && <p className="text-center text-xs text-white/40 mb-3">{sermon.title} · {slide.blockTitle}</p>}
      </div>

      {/* Lista para pular direto a um slide */}
      {list && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-neutral-950/95 border-l border-white/10 overflow-y-auto p-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs uppercase tracking-widest text-white/50 px-1 pb-1">{sermon.title}</p>
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); setBlack(false); setList(false); }}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm border ${i === idx ? "border-[#f9b103] bg-white/10" : "border-white/10 hover:bg-white/5"}`}
            >
              <span className="text-[10px] uppercase tracking-wide text-white/40">{i + 1} · {s.kind === "verse" ? "Versículo" : "Frase"} · {s.blockTitle}</span>
              <span className="block line-clamp-2">{s.kind === "verse" ? <><b style={{ color: YELLOW }}>{s.ref}</b> {s.text}</> : s.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
