// Pregações: esboço em blocos e painel do púlpito

export type BlockKind = "intro" | "point" | "illustration" | "appeal" | "conclusion" | "free";

export const BLOCK_LABEL: Record<BlockKind, string> = {
  intro: "Introdução",
  point: "Ponto",
  illustration: "Ilustração",
  appeal: "Apelo",
  conclusion: "Conclusão",
  free: "Bloco livre",
};

export const BLOCK_COLOR: Record<BlockKind, string> = {
  intro: "#38bdf8",
  point: "#a78bfa",
  illustration: "#f59e0b",
  appeal: "#f43f5e",
  conclusion: "#22c55e",
  free: "#94a3b8",
};

export interface Verse {
  ref: string;
  text: string;
}

export interface SermonBlock {
  id: string;
  kind: BlockKind;
  title: string;
  text: string;
  notes: string;
  minutes: number;
  verses: Verse[];
}

export interface Sermon {
  id: string;
  author_id: string;
  author_name: string | null;
  title: string;
  bible_text: string | null;
  event_id: string | null;
  event_title: string | null;
  event_starts_at: string | null;
  blocks: SermonBlock[];
  preached_at: string | null;
  duration_sec: number | null;
  block_times: { id: string; seconds: number }[] | null;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
}

export const newBlockId = () => Math.random().toString(36).slice(2, 10);

export const newBlock = (kind: BlockKind, title = BLOCK_LABEL[kind], minutes = 5): SermonBlock => ({
  id: newBlockId(),
  kind,
  title,
  text: "",
  notes: "",
  minutes,
  verses: [],
});

/** Esboço inicial de uma pregação nova */
export const defaultBlocks = (): SermonBlock[] => [
  newBlock("intro", "Introdução", 5),
  newBlock("point", "Ponto 1", 8),
  newBlock("point", "Ponto 2", 8),
  newBlock("illustration", "Ilustração", 5),
  newBlock("appeal", "Apelo", 5),
];

export const plannedMinutes = (blocks: SermonBlock[]) => blocks.reduce((n, b) => n + (Number(b.minutes) || 0), 0);

/** 754 → "12:34"; 3725 → "1:02:05" */
export function clock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** "45 min" / "1h 05min" */
export function minutesLabel(min: number): string {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}min`;
}

// ---------- Guardado no aparelho (painel funciona sem internet) ----------
const KEY = (id: string) => `sermon:${id}`;
const PENDING = "sermon:pending-preached";

export function cacheSermon(s: Sermon) {
  try {
    localStorage.setItem(KEY(s.id), JSON.stringify(s));
  } catch {
    /* aparelho sem espaço: segue sem guardar */
  }
}

export function cachedSermon(id: string): Sermon | null {
  try {
    return JSON.parse(localStorage.getItem(KEY(id)) || "null");
  } catch {
    return null;
  }
}

export function uncacheSermon(id: string) {
  try {
    localStorage.removeItem(KEY(id));
  } catch {
    /* nada a fazer */
  }
}

export interface PreachedReport {
  sermon_id: string;
  started_at: string;
  ended_at: string;
  block_times: { id: string; seconds: number }[];
}

/** Relatório do púlpito que não subiu (sem internet): tenta de novo depois */
export function queuePreached(r: PreachedReport) {
  try {
    const list: PreachedReport[] = JSON.parse(localStorage.getItem(PENDING) || "[]");
    localStorage.setItem(PENDING, JSON.stringify([...list.filter((x) => x.sermon_id !== r.sermon_id), r]));
  } catch {
    /* nada a fazer */
  }
}

export function pendingPreached(): PreachedReport[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING) || "[]");
  } catch {
    return [];
  }
}

export function clearPreached(sermonId: string) {
  try {
    const list = pendingPreached().filter((x) => x.sermon_id !== sermonId);
    localStorage.setItem(PENDING, JSON.stringify(list));
  } catch {
    /* nada a fazer */
  }
}
