import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Smartphone, Brain, CreditCard, Shield, Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  plan: string;
  whatsapp_number: string | null;
  webhook_url: string | null;
  system_prompt: string | null;
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

  // Editable fields
  const [systemPrompt, setSystemPrompt] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  useEffect(() => {
    if (id) loadProfile(id);
  }, [id]);

  const loadProfile = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (error) throw error;
      const p = data as unknown as Profile;
      setProfile(p);
      setSystemPrompt(p.system_prompt || "");
      setWebhookUrl(p.webhook_url || "");
      setWhatsappNumber(p.whatsapp_number || "");
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
      const { error } = await supabase
        .from("profiles")
        .update(fields as any)
        .eq("id", profile.id);

      if (error) throw error;
      setProfile((prev) => prev ? { ...prev, ...fields } : prev);
      toast({ title: "Salvo com sucesso" });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleKillSwitch = async () => {
    if (!profile) return;
    const newStatus = (profile as any).status === "blocked" ? "active" : "blocked";
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

  const isBlocked = (profile as any).status === "blocked";

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
      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-card data-[state=active]:text-primary">
            <Smartphone className="w-4 h-4 mr-2" />WhatsApp
          </TabsTrigger>
          <TabsTrigger value="brain" className="data-[state=active]:bg-card data-[state=active]:text-primary">
            <Brain className="w-4 h-4 mr-2" />Cérebro IA
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-card data-[state=active]:text-primary">
            <CreditCard className="w-4 h-4 mr-2" />Billing
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-card data-[state=active]:text-primary">
            <Shield className="w-4 h-4 mr-2" />Onboarding
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">Conexão WhatsApp</h3>
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={profile.whatsapp_number ? "online" : "offline"}
                  label={profile.whatsapp_number ? "Configurado" : "Não configurado"}
                />
                <span className="text-xs text-muted-foreground font-mono">{profile.whatsapp_number || "—"}</span>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Número WhatsApp</Label>
                <Input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+5511999999999"
                  className="bg-muted/50 border-border font-mono text-xs"
                />
              </div>
              <div className="flex items-center justify-center h-32 rounded-md border border-dashed border-border bg-muted/30">
                <div className="text-center">
                  <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {profile.whatsapp_number ? "Conectado via Evolution API" : "Número ainda não configurado"}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full gradient-primary text-primary-foreground border-0"
                disabled={saving}
                onClick={() => saveChanges({ whatsapp_number: whatsappNumber } as any)}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar WhatsApp
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">Webhook n8n</h3>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">URL do Webhook</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://n8n.seuservidor.com/webhook/..."
                  className="bg-muted/50 border-border font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <StatusBadge
                    status={profile.webhook_url ? "online" : "offline"}
                    label={profile.webhook_url ? "Configurado" : "Não configurado"}
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="w-full gradient-primary text-primary-foreground border-0"
                disabled={saving}
                onClick={() => saveChanges({ webhook_url: webhookUrl } as any)}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Webhook
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* AI Brain Tab */}
        <TabsContent value="brain">
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">System Prompt</h3>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={8}
                placeholder="Você é o assistente virtual de..."
                className="bg-muted/50 border-border font-mono text-xs resize-none"
              />
              <Button
                size="sm"
                className="gradient-primary text-primary-foreground border-0"
                disabled={saving}
                onClick={() => saveChanges({ system_prompt: systemPrompt } as any)}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Prompt
              </Button>
            </div>
          </div>
        </TabsContent>

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
        <TabsContent value="security">
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
