import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { RosterEntry } from "@/lib/events";
import { Button } from "@/components/ui/button";
import RosterGroups from "./RosterGroups";

/** Escala do dia do evento (quem serve em cada área e o que vai fazer) */
export default function EventRosterPanel({ eventId, canEdit }: { eventId: string; canEdit: boolean }) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<RosterEntry[] | null>(null);

  useEffect(() => {
    setEntries(null);
    api.get<RosterEntry[]>(`/api/events/${eventId}/roster`).then(setEntries).catch(() => setEntries([]));
  }, [eventId]);

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Users className="w-4 h-4" />
          Escala do dia {entries && entries.length > 0 && <span className="text-xs text-muted-foreground font-normal">({entries.length} pessoas)</span>}
        </p>
        {canEdit && (
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => navigate(`/admin/escalas?event=${eventId}`)}>
            <UserPlus className="w-3.5 h-3.5 mr-1" />{entries?.length ? "Editar" : "Montar"}
          </Button>
        )}
      </div>
      {!entries ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <RosterGroups entries={entries} compact />}
    </div>
  );
}
