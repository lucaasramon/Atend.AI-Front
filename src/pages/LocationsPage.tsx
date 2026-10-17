import { useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, isSameDay, isToday, startOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Loader2, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Location } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Booking {
  location_id: string;
  event_id: string;
  title: string;
  status: "pending" | "approved";
  starts_at: string;
  ends_at: string;
}

export default function LocationsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [locations, setLocations] = useState<Location[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);

  const loadLocations = () => api.get<Location[]>("/api/locations").then(setLocations);
  const loadBookings = () =>
    api
      .get<Booking[]>(`/api/locations/availability?from=${week.toISOString()}&to=${addDays(week, 7).toISOString()}`)
      .then(setBookings);

  useEffect(() => {
    loadLocations()
      .catch((e: Error) => toast({ title: "Erro ao carregar locais", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBookings().catch(() => setBookings([]));
  }, [week]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast({ title: ok });
      loadLocations();
    } catch (error: any) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
    }
  };

  const add = () => {
    if (!newName.trim()) return;
    run(() => api.post("/api/locations", { name: newName }), "Local cadastrado").then(() => setNewName(""));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const active = locations.filter((l) => l.active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Locais</h1>
        <p className="text-sm text-muted-foreground mt-1">Disponibilidade dos espaços da igreja</p>
      </div>

      {/* Disponibilidade da semana */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Esta semana</Button>
          <Button variant="ghost" size="icon" onClick={() => setWeek(subWeeks(week, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setWeek(addWeeks(week, 1))}><ChevronRight className="w-4 h-4" /></Button>
          <span className="text-sm font-medium">
            {format(days[0], "dd/MM")} a {format(days[6], "dd/MM/yyyy")}
          </span>
        </div>

        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum local cadastrado ainda.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-medium text-muted-foreground w-36">Local</th>
                  {days.map((d) => (
                    <th key={d.toISOString()} className={`p-2 font-medium capitalize ${isToday(d) ? "text-primary" : "text-muted-foreground"}`}>
                      {format(d, "EEE dd/MM", { locale: ptBR })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.map((loc) => (
                  <tr key={loc.id} className="border-b border-border last:border-0 align-top">
                    <td className="p-2 font-medium">{loc.name}</td>
                    {days.map((d) => {
                      const list = bookings.filter((b) => b.location_id === loc.id && isSameDay(new Date(b.starts_at), d));
                      return (
                        <td key={d.toISOString()} className="p-1.5 space-y-1">
                          {list.length === 0 ? (
                            <span className="block text-center text-success/80">Livre</span>
                          ) : (
                            list.map((b) => (
                              <div
                                key={b.event_id}
                                title={b.status === "pending" ? "Aguardando aprovação" : undefined}
                                className={`rounded px-1.5 py-1 ${
                                  b.status === "pending" ? "border border-dashed border-warning/60 text-warning" : "bg-primary/15 text-primary"
                                }`}
                              >
                                <span className="font-semibold">
                                  {format(new Date(b.starts_at), "HH:mm")}–{format(new Date(b.ends_at), "HH:mm")}
                                </span>{" "}
                                {b.title}
                              </div>
                            ))
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Eventos sem horário de término ocupam 2 horas. Contorno tracejado = aguardando aprovação.
        </p>
      </div>

      {/* Cadastro (admin) */}
      {isAdmin && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Cadastro de locais</h2>
          <div className="flex gap-2 max-w-md">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Templo, Sala das Crianças" onKeyDown={(e) => e.key === "Enter" && add()} />
            <Button onClick={add}><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border max-w-md">
            {locations.map((l) => (
              <div key={l.id} className="flex items-center gap-2 px-3 py-2">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                {renaming?.id === l.id ? (
                  <>
                    <Input className="h-8" value={renaming.name} onChange={(e) => setRenaming({ ...renaming, name: e.target.value })} autoFocus />
                    <Button size="icon" variant="ghost" onClick={() => run(() => api.patch(`/api/locations/${l.id}`, { name: renaming.name }), "Local renomeado").then(() => setRenaming(null))}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setRenaming(null)}><X className="w-4 h-4" /></Button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-sm ${l.active ? "" : "text-muted-foreground line-through"}`}>{l.name}</span>
                    <Switch
                      checked={l.active}
                      title={l.active ? "Ativo" : "Inativo"}
                      onCheckedChange={(v) => run(() => api.patch(`/api/locations/${l.id}`, { active: v }), v ? "Local ativado" : "Local desativado")}
                    />
                    <Button size="icon" variant="ghost" title="Renomear" onClick={() => setRenaming({ id: l.id, name: l.name })}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => run(() => api.delete(`/api/locations/${l.id}`), "Local excluído")}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
