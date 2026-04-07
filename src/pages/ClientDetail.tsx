import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CreditCard, Shield, Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  plan: string;
  onboarding_completed: boolean;
  onboarding_data: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) loadProfile(id);
  }, [id]);

  const loadProfile = async (profileId: string) => {
    try {
      const data = await api.get<Profile>(`/api/profiles/${profileId}`);
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({ title: "Erro ao carregar cliente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async (fields: Partial<Profile>) => {
    if (!profile) return;
    setSaving(true);
    try {
      await api.patch(`/api/profiles/${profile.id}`, fields);
      setProfile((prev) => prev ? { ...prev, ...fields } : prev);
      toast({ title: "Salvo com sucesso" });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleKillSwitch = async () => {
    if (!profile) return;
    const newStatus = profile.status === "blocked" ? "active" : "blocked";
    await saveChanges({ status: newStatus } as any);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cliente não encontrado</p>
      </div>
    );
  }

  const isBlocked = profile.status === "blocked";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/clients">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">{profile.company || "—"}</h1>
            <StatusBadge status={isBlocked ? "blocked" : "active"} label={isBlocked ? "Bloqueado" : "Ativo"} />
            {profile.onboarding_completed ? (
              <Badge variant="secondary" className="text-xs">Onboarding Completo</Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-warning border-warning/30">Onboarding Pendente</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {profile.full_name || "—"}{profile.phone ? ` · ${profile.phone}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="killswitch" className="text-xs text-muted-foreground">Kill Switch</Label>
          <Switch
            id="killswitch"
            checked={!isBlocked}
            onCheckedChange={toggleKillSwitch}
            disabled={saving}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="billing" className="space-y-4">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="billing" className="data-[state=active]:bg-card data-[state=active]:text-primary">
            <CreditCard className="w-4 h-4 mr-2" />Billing
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="data-[state=active]:bg-card data-[state=active]:text-primary">
            <Shield className="w-4 h-4 mr-2" />Onboarding
          </TabsTrigger>
        </TabsList>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">Assinatura</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Plano</span>
                  <span className="text-xs font-mono text-primary capitalize">{profile.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Desde</span>
                  <span className="text-xs font-mono text-card-foreground">
                    {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Última atualização</span>
                  <span className="text-xs font-mono text-card-foreground">
                    {new Date(profile.updated_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">Informações do Cliente</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Empresa</span>
                  <span className="text-xs text-card-foreground">{profile.company || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Responsável</span>
                  <span className="text-xs text-card-foreground">{profile.full_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Telefone</span>
                  <span className="text-xs font-mono text-card-foreground">{profile.phone || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding">
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">Status do Onboarding</h3>
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={profile.onboarding_completed ? "online" : "warning"}
                  label={profile.onboarding_completed ? "Concluído" : "Pendente"}
                />
                {!profile.onboarding_completed && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => saveChanges({ onboarding_completed: true } as any)}
                  >
                    Marcar como Concluído
                  </Button>
                )}
              </div>
            </div>

            {profile.onboarding_data && (
              <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
                <h3 className="text-sm font-medium text-card-foreground">Dados de Onboarding</h3>
                <div className="bg-muted/50 rounded-md p-4 overflow-auto max-h-64">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(profile.onboarding_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
