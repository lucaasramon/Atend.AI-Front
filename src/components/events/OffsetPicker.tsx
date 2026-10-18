import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Antecedências mais usadas (dias antes do evento; 0 = no dia)
const PRESETS = [60, 45, 30, 21, 20, 15, 14, 10, 7, 5, 3, 2, 1, 0];

const label = (d: number) => (d === 0 ? "No dia" : d === 1 ? "1 dia" : `${d} dias`);

interface Props {
  value: number[];
  onChange: (days: number[]) => void;
}

/** Escolha de "com quantos dias de antecedência lembrar" em botões + valor livre */
export default function OffsetPicker({ value, onChange }: Props) {
  const [custom, setCustom] = useState("");
  const sorted = (list: number[]) => Array.from(new Set(list)).sort((a, b) => b - a);
  const toggle = (d: number) => onChange(sorted(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]));
  const extra = value.filter((d) => !PRESETS.includes(d));

  const addCustom = () => {
    const n = parseInt(custom);
    if (Number.isFinite(n) && n >= 0 && n <= 366) onChange(sorted([...value, n]));
    setCustom("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {[...PRESETS, ...extra].sort((a, b) => b - a).map((d) => {
          const on = value.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {label(d)}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 max-w-xs">
        <Input
          type="number"
          min={0}
          max={366}
          inputMode="numeric"
          className="h-8"
          placeholder="Outro (dias antes)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
        />
        <Button type="button" size="sm" variant="outline" onClick={addCustom} disabled={!custom}>
          <Plus className="w-3.5 h-3.5 mr-1" />Adicionar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {value.length
          ? `Vai lembrar: ${value.map((d) => (d === 0 ? "no dia" : `${d} dia${d === 1 ? "" : "s"} antes`)).join(", ")}.`
          : "Nenhum dia escolhido."}
      </p>
    </div>
  );
}
