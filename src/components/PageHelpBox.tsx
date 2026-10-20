import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { helpFor } from "@/lib/pageHelp";

// Telas em que a pessoa deixou a explicação aberta (fechada é o padrão)
const STORAGE_KEY = "page_help_open";

const readOpen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

/** Quadro "Para que serve esta tela?" — começa fechado; abrir fica lembrado por tela */
export default function PageHelpBox({ path }: { path: string }) {
  const help = helpFor(path);
  const key = path.replace(/\/[0-9a-f-]{36}$/i, "/");
  const [hidden, setHidden] = useState(() => !readOpen().includes(key));

  useEffect(() => setHidden(!readOpen().includes(key)), [key]);

  if (!help) return null;

  const toggle = () => {
    const list = readOpen().filter((k) => k !== key);
    if (hidden) list.push(key);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* sem armazenamento: só não lembra a escolha */
    }
    setHidden(!hidden);
  };

  return (
    <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 text-sm">
      <button onClick={toggle} className="w-full flex items-center gap-2 px-4 py-2.5 text-left font-medium text-primary">
        <Info className="w-4 h-4 shrink-0" />
        Para que serve esta tela?
        {hidden ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronUp className="w-4 h-4 ml-auto" />}
      </button>
      {!hidden && (
        <div className="px-4 pb-3 space-y-2 text-foreground/90">
          <p>{help.purpose}</p>
          {help.actions && (
            <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
              {help.actions.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
          <p className="text-xs text-muted-foreground"><b>Quem acessa:</b> {help.who}</p>
        </div>
      )}
    </div>
  );
}
