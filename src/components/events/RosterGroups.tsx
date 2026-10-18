import { CheckCircle2, Pencil } from "lucide-react";
import { RosterEntry, groupRoster } from "@/lib/events";
import { Button } from "@/components/ui/button";

interface Props {
  entries: RosterEntry[];
  /** Mostra o botão "Editar" em cada área (quem pode montar a escala) */
  onEdit?: (ministryId: string) => void;
  canEditMinistry?: (ministryId: string) => boolean;
  compact?: boolean;
}

/** Escala de um evento, agrupada por área: quem serve e o que vai fazer */
export default function RosterGroups({ entries, onEdit, canEditMinistry, compact }: Props) {
  if (!entries.length) return <p className="text-sm text-muted-foreground">Ninguém escalado ainda.</p>;
  return (
    <div className={compact ? "space-y-2" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
      {groupRoster(entries).map((g) => (
        <div key={g.ministry_id} className="rounded-md border border-border bg-background/50 p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color || "#999" }} />
              {g.ministry}
              <span className="text-xs text-muted-foreground font-normal">({g.entries.length})</span>
            </p>
            {onEdit && (!canEditMinistry || canEditMinistry(g.ministry_id)) && (
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onEdit(g.ministry_id)}>
                <Pencil className="w-3.5 h-3.5 mr-1" />Editar
              </Button>
            )}
          </div>
          <ul className="space-y-1">
            {g.entries.map((e) => {
              const total = e.steps_count;
              const done = Math.min(e.checked.length, total || 1);
              const complete = total ? done >= total : e.checked.length > 0;
              return (
                <li key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 min-w-0 truncate">
                    {e.member}
                    {(e.task || e.area) && <span className="text-muted-foreground"> — {e.task || e.area}</span>}
                  </span>
                  {complete && (
                    <span title={total ? "Checklist completo" : "Presença confirmada"} className="shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    </span>
                  )}
                  {!complete && total > 0 && e.checked.length > 0 && (
                    <span className="text-[11px] text-muted-foreground shrink-0">{done}/{total}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
