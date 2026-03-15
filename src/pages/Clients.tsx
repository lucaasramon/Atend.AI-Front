import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Power, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NewClientDialog from "@/components/NewClientDialog";


interface Profile {
  id: string;
  full_name: string | null;
  company: string | null;
  plan: string;
  phone: string | null;
  whatsapp_number: string | null;
  status: string;
  onboarding_completed: boolean;
  created_at: string;
}

export default function Clients() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, company, plan, phone, whatsapp_number, status, onboarding_completed, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles((data || []) as Profile[]);
    } catch (error) {
      console.error("Error loading profiles:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (profile: Profile) => {
    const newStatus = (profile as any).status === "blocked" ? "active" : "blocked";
    setTogglingId(profile.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus } as any)
        .eq("id", profile.id);

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, status: newStatus } : p))
      );

      if (newStatus === "blocked") {
        toast.error(`${profile.company || profile.full_name} bloqueado — automações pausadas`);
      } else {
        toast.success(`${profile.company || profile.full_name} reativado`);
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Erro ao alterar status do cliente");
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = profiles.filter(
    (p) =>
      (p.company || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.whatsapp_number || "").includes(search)
  );

  const handleClientCreated = () => {
    loadProfiles();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">{profiles.length} cadastrados</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground border-0 shadow-glow">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por empresa, nome ou WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">
              {search ? "Nenhum cliente encontrado para a busca" : "Nenhum cliente cadastrado ainda"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Empresa</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Plano</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Status</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Onboarding</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">WhatsApp</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Cadastro</th>
                <th className="text-right px-5 py-3 text-xs text-muted-foreground font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((profile) => {
                const isBlocked = (profile as any).status === "blocked";
                return (
                  <tr key={profile.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-card-foreground font-medium">{profile.company || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {profile.full_name || "—"}{profile.phone ? ` · ${profile.phone}` : ""}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono text-primary capitalize">{profile.plan}</span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        status={isBlocked ? "blocked" : "active"}
                        label={isBlocked ? "Bloqueado" : "Ativo"}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        status={profile.onboarding_completed ? "online" : "warning"}
                        label={profile.onboarding_completed ? "Completo" : "Pendente"}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono text-muted-foreground">
                        {profile.whatsapp_number || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground font-mono">
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/clients/${profile.id}`}>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={togglingId === profile.id}
                          onClick={() => toggleStatus(profile)}
                          className={isBlocked ? "text-success hover:text-success" : "text-destructive hover:text-destructive"}
                        >
                          {togglingId === profile.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <NewClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClientCreated={handleClientCreated}
      />
    </div>
  );
}
