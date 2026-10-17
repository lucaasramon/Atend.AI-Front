import { Check } from "lucide-react";

interface Option {
  id: string;
  name: string;
  color?: string | null;
}

interface Props {
  options: Option[];
  value: string[];
  onChange: (ids: string[]) => void;
  empty?: string;
}

/** Seleção múltipla em etiquetas clicáveis */
export default function ChipSelect({ options, value, onChange, empty = "Nenhuma opção cadastrada" }: Props) {
  if (!options.length) return <p className="text-xs text-muted-foreground">{empty}</p>;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => toggle(o.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {o.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: o.color }} />}
            {on && <Check className="w-3 h-3" />}
            {o.name}
          </button>
        );
      })}
    </div>
  );
}
