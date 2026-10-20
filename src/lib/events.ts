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
  /** true = o robô não lembra deste evento */
  reminders_off: boolean;
  reminders: ReminderRecord[];
  status: EventStatus;
  rejection_reason: string | null;
  created_by_name: string | null;
  approved_by_name: string | null;
  ministries: EventMinistry[];
  locations: EventLocation[];
  category: string | null;
  series_id: string | null;
  created_by: string | null;
  tasks_total: number;
  tasks_done: number;
  roster_count: number;
  /** Formulário de inscrição do evento (se tiver) e quantos confirmados */
  form_id: string | null;
  registrations_count: number;
}

/** Uma pessoa escalada num evento */
export interface RosterEntry {
  id: string;
  event_id: string;
  ministry_id: string;
  ministry: string;
  ministry_color: string | null;
  area_id: string | null;
  area: string | null;
  task: string | null;
  member_id: string;
  member: string;
  has_whatsapp: boolean;
  checked: number[];
  steps_count: number;
  sent_at: string | null;
}

/** Agrupa a escala por área: [{ ministry, color, entries }] */
export function groupRoster(entries: RosterEntry[]) {
  const map = new Map<string, { ministry_id: string; ministry: string; color: string | null; entries: RosterEntry[] }>();
  for (const e of entries) {
    const g = map.get(e.ministry_id) || { ministry_id: e.ministry_id, ministry: e.ministry, color: e.ministry_color, entries: [] };
    g.entries.push(e);
    map.set(e.ministry_id, g);
  }
  return Array.from(map.values()).sort((a, b) => a.ministry.localeCompare(b.ministry, "pt-BR"));
}

export interface EventTask {
  id: string;
  event_id: string;
  title: string;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_full_name: string | null;
  due_date: string | null;
  done: boolean;
  done_by_name: string | null;
}

export interface Person {
  id: string;
  name: string;
  has_whatsapp: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  items: { title: string; days_before?: number }[];
}

/** Categorias de evento e suas cores no calendário */
export const CATEGORIES: { value: string; label: string; color: string }[] = [
  { value: "culto", label: "Culto", color: "#2563eb" },
  { value: "conferencia", label: "Conferência", color: "#9333ea" },
  { value: "reuniao", label: "Reunião", color: "#64748b" },
  { value: "ensaio", label: "Ensaio", color: "#0891b2" },
  { value: "evento", label: "Evento", color: "#16a34a" },
  { value: "acao_social", label: "Ação social", color: "#ea580c" },
  { value: "outro", label: "Outro", color: "#ca8a04" },
];

export const categoryOf = (value?: string | null) => CATEGORIES.find((c) => c.value === value);

export type EventStatus = "pending" | "approved" | "rejected";

export interface EventMinistry {
  id: string;
  name: string;
  color: string | null;
  group_jid: string | null;
}

export interface EventLocation {
  id: string;
  name: string;
}

export interface Ministry extends EventMinistry {
  leader_id: string | null;
  pastor_id: string | null;
  leader_name: string | null;
  pastor_name: string | null;
  is_media: boolean;
}

export interface Location extends EventLocation {
  active: boolean;
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
  approval_required: boolean;
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

/**
 * O usuário pode editar/excluir o evento?
 * Admin pode tudo; Agenda só eventos das suas áreas (ou que criou); Visualizador nunca.
 */
export function canManageEvent(
  user: { id: string; role: string; ministry_ids?: string[] } | null | undefined,
  ev: { created_by?: string | null; ministries: EventMinistry[] }
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "agenda") return false;
  return ev.created_by === user.id || ev.ministries.some((m) => user.ministry_ids?.includes(m.id));
}

/** Antecedências do evento: as próprias ou o padrão */
export const eventOffsets = (ev: Pick<EventItem, "reminder_offsets">, defaults: number[]) =>
  ev.reminder_offsets?.length ? [...ev.reminder_offsets].sort((a, b) => b - a) : defaults;

export const whenLabel = (days: number) => (days === 0 ? "No dia" : `${days} dia${days === 1 ? "" : "s"} antes`);

/** "Templo, Sala das Crianças — entrada lateral" (locais cadastrados + observação livre) */
export function locationLabel(ev: { location?: string | null; locations?: EventLocation[] }): string {
  const names = (ev.locations || []).map((l) => l.name).join(", ");
  const free = (ev.location || "").trim();
  if (names && free) return `${names} — ${free}`;
  return names || free;
}

/** Cor do evento: a da categoria; sem categoria, a do primeiro ministério com cor */
export const eventColor = (ev: { ministries?: EventMinistry[]; category?: string | null }) =>
  categoryOf(ev.category)?.color || ev.ministries?.find((m) => m.color)?.color || null;

export const STATUS_LABEL: Record<EventStatus, string> = {
  pending: "Aguardando aprovação",
  approved: "Aprovado",
  rejected: "Recusado",
};
