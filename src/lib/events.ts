// Tipos e utilitários compartilhados pelas telas de Agenda e Calendário

export interface ReminderRecord {
  offset_days: number;
  status: "sent" | "skipped";
  sent_at: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  is_public: boolean;
  group_jid: string | null;
  reminder_offsets: number[] | null;
  reminders: ReminderRecord[];
}

export interface Group {
  id: string;
  subject: string;
  size?: number;
}

export interface ReminderConfig {
  enabled: boolean;
  offsets: number[];
  group_jid: string;
  groups: Group[];
}

export interface Conflict {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  reason: string;
}

/** "30, 7,0" → [30, 7, 0] (maior para menor, sem repetidos) */
export const parseOffsets = (v?: string | null) =>
  Array.from(
    new Set(
      (v || "")
        .split(",")
        .map((n) => parseInt(n.trim()))
        .filter((n) => Number.isFinite(n) && n >= 0 && n <= 366)
    )
  ).sort((a, b) => b - a);

/** Antecedências do evento: as próprias ou o padrão */
export const eventOffsets = (ev: Pick<EventItem, "reminder_offsets">, defaults: number[]) =>
  ev.reminder_offsets?.length ? [...ev.reminder_offsets].sort((a, b) => b - a) : defaults;

export const whenLabel = (days: number) => (days === 0 ? "No dia" : `${days} dia${days === 1 ? "" : "s"} antes`);
