import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Zap, Info } from "lucide-react";

interface IntegrationsStepProps {
  data: any;
  onSave: (data: any) => Promise<boolean>;
  saving: boolean;
}

export default function IntegrationsStep({ data, onSave, saving }: IntegrationsStepProps) {
  const [webhookUrl, setWebhookUrl] = useState(data.webhook_url || "");
  const [skipIntegrations, setSkipIntegrations] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webhookUrl && !skipIntegrations) return;

    await onSave({ webhook_url: webhookUrl || null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert>
        <Zap className="w-4 h-4" />
        <AlertDescription>
          Configure integrações com ferramentas externas via webhooks. Você pode conectar
          seu robô ao n8n, Zapier, Make ou qualquer outra plataforma de automação.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="webhook_url">URL do Webhook (Opcional)</Label>
        <Input
          id="webhook_url"
          type="url"
          placeholder="https://seu-webhook.n8n.cloud/webhook/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Cole aqui a URL do seu workflow no n8n ou outra plataforma de automação
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/30">
        <input
          type="checkbox"
          id="skip"
          checked={skipIntegrations}
          onChange={(e) => setSkipIntegrations(e.target.checked)}
          className="mt-1"
        />
        <label htmlFor="skip" className="text-sm cursor-pointer">
          Pular esta etapa. Vou configurar integrações mais tarde.
        </label>
      </div>

      <Alert variant="default">
        <Info className="w-4 h-4" />
        <AlertDescription className="text-xs">
          <strong>Dica:</strong> Você pode configurar múltiplos webhooks posteriormente nas
          configurações avançadas do painel de controle.
        </AlertDescription>
      </Alert>

      <Button 
        type="submit" 
        disabled={(!webhookUrl && !skipIntegrations) || saving} 
        className="w-full"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Salvando...
          </>
        ) : (
          "Finalizar Configuração"
        )}
      </Button>
    </form>
  );
}