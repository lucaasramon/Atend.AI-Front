import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Só a primeira letra maiúscula ("outubro de 2026" → "Outubro de 2026") */
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
