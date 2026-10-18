// Repetição de eventos: mesma regra do backend (services/recurrence.ts), usada para a prévia das datas

export type RepeatFreq = "weekly" | "monthly_day" | "monthly_nth";

export interface RepeatSpec {
  freq: RepeatFreq;
  start_date: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time?: string | null;
  interval?: number;
  weekdays?: number[];
  month_day?: number;
  nth?: number; // 1..4, 5 = última
  weekday?: number;
}

export const MAX_OCCURRENCES = 104;
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAYS_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const NTH_LABEL: Record<number, string> = { 1: "1ª", 2: "2ª", 3: "3ª", 4: "4ª", 5: "Última" };

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const weekdayOf = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** Datas (YYYY-MM-DD) da repetição — máx. 2 anos / 104 datas */
export function repeatDates(r: RepeatSpec): string[] {
  if (!r.start_date || !r.until || r.until < r.start_date) return [];
  const maxDay = addDays(r.start_date, 731);
  const last = r.until < maxDay ? r.until : maxDay;
  const out: string[] = [];

  if (r.freq === "weekly") {
    const days = Array.from(new Set(r.weekdays || [])).sort();
    if (!days.length) return [];
    const weekStart = addDays(r.start_date, -weekdayOf(r.start_date));
    for (let w = 0; out.length < MAX_OCCURRENCES; w += r.interval || 1) {
      const sunday = addDays(weekStart, w * 7);
      if (sunday > last) break;
      for (const d of days) {
        const day = addDays(sunday, d);
        if (day >= r.start_date && day <= last && out.length < MAX_OCCURRENCES) out.push(day);
      }
    }
    return out;
  }

  const [y0, m0] = r.start_date.split("-").map(Number);
  for (let i = 0; out.length < MAX_OCCURRENCES && i < 30; i++) {
    const y = y0 + Math.floor((m0 - 1 + i) / 12);
    const m = ((m0 - 1 + i) % 12) + 1;
    const dim = daysInMonth(y, m);
    let day: number;
    if (r.freq === "monthly_day") {
      if (!r.month_day) return [];
      day = Math.min(r.month_day, dim);
    } else {
      if (r.nth === undefined || r.weekday === undefined) return [];
      const first = 1 + ((r.weekday - weekdayOf(ymd(y, m, 1)) + 7) % 7);
      day = r.nth === 5 ? first + Math.floor((dim - first) / 7) * 7 : first + (r.nth - 1) * 7;
      if (day > dim) continue;
    }
    const date = ymd(y, m, day);
    if (date > last) break;
    if (date >= r.start_date) out.push(date);
  }
  return out;
}

/** Início/término (ISO) de uma data da repetição, no horário local */
export function occurrenceAt(day: string, startTime: string, endTime?: string | null) {
  const starts = new Date(`${day}T${startTime}:00`);
  if (!endTime) return { starts_at: starts.toISOString(), ends_at: null as string | null };
  let ends = new Date(`${day}T${endTime}:00`);
  if (ends <= starts) ends = new Date(ends.getTime() + DAY_MS);
  return { starts_at: starts.toISOString(), ends_at: ends.toISOString() };
}

/** Frase legível: "Toda terça e quinta, das 19:30 às 21:00" */
export function describeRepeat(r: RepeatSpec): string {
  const hours = r.end_time ? `das ${r.start_time} às ${r.end_time}` : `às ${r.start_time}`;
  if (r.freq === "weekly") {
    const days = Array.from(new Set(r.weekdays || [])).sort().map((d) => WEEKDAYS_LONG[d]);
    const list = days.length > 1 ? `${days.slice(0, -1).join(", ")} e ${days[days.length - 1]}` : days[0] || "—";
    return `${r.interval === 2 ? "A cada 2 semanas" : "Toda semana"}: ${list}, ${hours}`;
  }
  if (r.freq === "monthly_day") return `Todo dia ${r.month_day} do mês, ${hours}`;
  const nth = r.nth === 5 ? "Último(a)" : NTH_LABEL[r.nth || 1];
  return `Todo mês: ${nth} ${WEEKDAYS_LONG[r.weekday ?? 0]}, ${hours}`;
}
