import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
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
          <Input defaultValue="https://n8n.meuservidor.com" className="bg-muted/50 border-border font-mono text-xs" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">API Key</Label>
          <Input type="password" defaultValue="n8n_api_xxxxx" className="bg-muted/50 border-border font-mono text-xs" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
        <h3 className="text-sm font-medium text-card-foreground">Evolution API (WhatsApp)</h3>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">URL da API</Label>
          <Input defaultValue="https://evolution.meuservidor.com" className="bg-muted/50 border-border font-mono text-xs" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">API Key</Label>
          <Input type="password" defaultValue="evo_xxxxx" className="bg-muted/50 border-border font-mono text-xs" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
        <h3 className="text-sm font-medium text-card-foreground">Notificações</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-card-foreground">Alertas de Desconexão</p>
            <p className="text-xs text-muted-foreground">Notificar quando um WhatsApp desconectar</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-card-foreground">Risco de Banimento Alto</p>
            <p className="text-xs text-muted-foreground">Notificar quando score ultrapassar 60%</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-card-foreground">Vencimento de Assinatura</p>
            <p className="text-xs text-muted-foreground">Lembrete 3 dias antes do vencimento</p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>

      <Button className="gradient-primary text-primary-foreground border-0 shadow-glow">Salvar Configurações</Button>
    </div>
  );
}
