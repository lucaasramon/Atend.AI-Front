// Formulários públicos: cadastro de membros/visitantes e inscrições em eventos

export type Relation = "visitor" | "regular" | "member";

export const RELATION_LABEL: Record<Relation, string> = {
  visitor: "Visitante",
  regular: "Frequentador",
  member: "Membro",
};

export const RELATION_OPTIONS: { value: Relation; label: string; hint: string }[] = [
  { value: "visitor", label: "Sou visitante", hint: "Estou conhecendo a igreja" },
  { value: "regular", label: "Frequento a igreja", hint: "Venho sempre, mas ainda não sou membro" },
  { value: "member", label: "Sou membro", hint: "Já faço parte da igreja" },
];

export const MARITAL_LABEL: Record<string, string> = {
  single: "Solteiro(a)",
  married: "Casado(a)",
  divorced: "Divorciado(a)",
  widowed: "Viúvo(a)",
};

export const GENDER_LABEL: Record<string, string> = { M: "Masculino", F: "Feminino" };

export const HOW_FOUND = ["Convite de amigo ou família", "Instagram / redes sociais", "Passei em frente", "Evento da igreja", "Outro"];

export interface Person {
  id: string;
  name: string;
  birth_date: string | null;
  whatsapp: string;
  email: string | null;
  gender: string | null;
  marital_status: string | null;
  neighborhood: string | null;
  relation: Relation;
  baptized: boolean | null;
  how_found: string | null;
  wants_contact: boolean;
  interests: string[];
  notes: string | null;
  status: "new" | "seen";
  member_id: string | null;
  created_at: string;
  /** form = preencheu o formulário; user = usuário da plataforma sem formulário (whatsapp pode vir vazio) */
  source: "form" | "user";
  /** Usuário da plataforma com o mesmo WhatsApp: sempre conta como membro */
  user_id: string | null;
  user_role: "admin" | "agenda" | "viewer" | null;
  church_role: string | null;
}

export const USER_ROLE_LABEL: Record<string, string> = { admin: "Administrador", agenda: "Agenda", viewer: "Visualizador" };

export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "yesno";

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Resposta curta",
  textarea: "Resposta longa",
  number: "Número",
  date: "Data",
  select: "Escolha (lista)",
  yesno: "Sim ou não",
};

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  options: string[];
  required: boolean;
}

/** Perguntas prontas para adicionar com um clique */
export const FIELD_PRESETS: Omit<FormField, "id">[] = [
  { label: "E-mail", type: "text", options: [], required: false },
  { label: "Data de nascimento", type: "date", options: [], required: false },
  { label: "Idade", type: "number", options: [], required: false },
  { label: "Quantas pessoas vão com você?", type: "number", options: [], required: false },
  { label: "Tamanho da camiseta", type: "select", options: ["P", "M", "G", "GG", "XG"], required: false },
  { label: "Restrição alimentar ou alergia", type: "text", options: [], required: false },
  { label: "É membro da igreja?", type: "yesno", options: [], required: false },
];

export interface EventForm {
  id: string;
  event_id: string;
  slug: string;
  title: string | null;
  description: string | null;
  is_open: boolean;
  capacity: number | null;
  closes_at: string | null;
  fields: FormField[];
  confirmed: number;
  waitlist: number;
}

export interface Registration {
  id: string;
  form_id: string;
  name: string;
  whatsapp: string;
  answers: Record<string, string>;
  status: "confirmed" | "waitlist";
  created_at: string;
}

/** Endereço público do site (onde o formulário abre) */
export const siteUrl = () => window.location.origin;
export const signupUrl = () => `${siteUrl()}/cadastro`;
export const eventFormUrl = (slug: string) => `${siteUrl()}/inscricao/${slug}`;

/** 5511987654321 → (11) 98765-4321 */
export function formatPhone(digits: string): string {
  const d = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `+${digits}`;
}

/** Máscara do campo de WhatsApp enquanto digita */
export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const waLink = (digits: string) => `https://wa.me/${digits}`;

/** Idade a partir de YYYY-MM-DD */
export function ageFrom(birth: string | null): number | null {
  if (!birth) return null;
  const [y, m, d] = birth.slice(0, 10).split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

/** Baixa uma planilha CSV (abre no Excel com acentos) */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
