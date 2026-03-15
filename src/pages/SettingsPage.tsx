import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Settings {
  n8n_url: string;
  n8n_api_key: string;
  evolution_url: string;
  evolution_api_key: string;
  alert_disconnect: boolean;
  alert_ban_risk: boolean;
  alert_subscription_expiry: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  n8n_url: "",
  n8n_api_key: "",
  evolution_url: "",
  evolution_api_key: "",
  alert_disconnect: true,
  alert_ban_risk: true,
  alert_subscription_expiry: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("system_settings")
        .select("key, value");

      if (error) throw error;

      if (data && data.length > 0) {
        const loaded = { ...DEFAULT_SETTINGS };
        for (const row of data) {
          if (row.key in loaded) {
            const val = row.value;
            if (row.key.startsWith("alert_")) {
              (loaded as any)[row.key] = val === "true";
            } else {
              (loaded as any)[row.key] = val || "";
            }
          }
        }
        setSettings(loaded);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      }));

      for (const entry of entries) {
        const { error } = await (supabase as any)
          .from("system_settings")
          .upsert(entry, { onConflict: "key" });

        if (error) throw error;
      }

      toast({
        title: "Configurações salvas",
        description: "Todas as configurações foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Configurações globais do sistema</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
        <h3 className="text-sm font-medium text-card-foreground">Integração n8n</h3>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">URL do n8n</Label>
          <Input
            value={settings.n8n_url}
            onChange={(e) => setSettings(s => ({ ...s, n8n_url: e.target.value }))}
            placeholder="https://n8n.meuservidor.com"
            className="bg-muted/50 border-border font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">API Key</Label>
          <Input
            type="password"
            value={settings.n8n_api_key}
            onChange={(e) => setSettings(s => ({ ...s, n8n_api_key: e.target.value }))}
            placeholder="n8n_api_xxxxx"
            className="bg-muted/50 border-border font-mono text-xs"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
        <h3 className="text-sm font-medium text-card-foreground">Evolution API (WhatsApp)</h3>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">URL da API</Label>
          <Input
            value={settings.evolution_url}
            onChange={(e) => setSettings(s => ({ ...s, evolution_url: e.target.value }))}
            placeholder="https://evolution.meuservidor.com"
            className="bg-muted/50 border-border font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">API Key</Label>
          <Input
            type="password"
            value={settings.evolution_api_key}
            onChange={(e) => setSettings(s => ({ ...s, evolution_api_key: e.target.value }))}
            placeholder="evo_xxxxx"
            className="bg-muted/50 border-border font-mono text-xs"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
        <h3 className="text-sm font-medium text-card-foreground">Notificações</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-card-foreground">Alertas de Desconexão</p>
            <p className="text-xs text-muted-foreground">Notificar quando um WhatsApp desconectar</p>
          </div>
          <Switch
            checked={settings.alert_disconnect}
            onCheckedChange={(v) => setSettings(s => ({ ...s, alert_disconnect: v }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-card-foreground">Risco de Banimento Alto</p>
            <p className="text-xs text-muted-foreground">Notificar quando score ultrapassar 60%</p>
          </div>
          <Switch
            checked={settings.alert_ban_risk}
            onCheckedChange={(v) => setSettings(s => ({ ...s, alert_ban_risk: v }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-card-foreground">Vencimento de Assinatura</p>
            <p className="text-xs text-muted-foreground">Lembrete 3 dias antes do vencimento</p>
          </div>
          <Switch
            checked={settings.alert_subscription_expiry}
            onCheckedChange={(v) => setSettings(s => ({ ...s, alert_subscription_expiry: v }))}
          />
        </div>
      </div>

      <Button onClick={saveSettings} disabled={saving} className="gradient-primary text-primary-foreground border-0 shadow-glow">
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</>
        ) : (
          <><Save className="w-4 h-4 mr-2" /> Salvar Configurações</>
        )}
      </Button>
    </div>
  );
}
