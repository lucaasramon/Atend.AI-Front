import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Smartphone, Brain, CreditCard, Upload, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import StatusBadge from "@/components/StatusBadge";
import { mockClients } from "@/data/mockData";

export default function ClientDetail() {
  const { id } = useParams();
  const client = mockClients.find((c) => c.id === id);

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cliente não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/clients">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{client.company}</h1>
            <StatusBadge status={client.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{client.name} · {client.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="killswitch" className="text-xs text-muted-foreground">Kill Switch</Label>
          <Switch id="killswitch" checked={client.status !== "blocked"} />
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
            <Shield className="w-4 h-4 mr-2" />Segurança
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">Conexão WhatsApp</h3>
              <div className="flex items-center gap-3">
                <StatusBadge status={client.whatsappStatus} />
                <span className="text-xs text-muted-foreground font-mono">{client.phone}</span>
              </div>
              {/* QR Code placeholder */}
              <div className="flex items-center justify-center h-48 rounded-md border border-dashed border-border bg-muted/30">
                <div className="text-center">
                  <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {client.whatsappStatus === "online" ? "Conectado — QR não necessário" : "Escaneie o QR Code para conectar"}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Reconectar Sessão
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">Webhook n8n</h3>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">URL do Webhook</Label>
                <Input
                  readOnly
                  value={`https://n8n.meuservidor.com/webhook/${client.id}`}
                  className="bg-muted/50 border-border font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <StatusBadge status={client.status === "active" ? "online" : "offline"} label={client.status === "active" ? "Recebendo" : "Pausado"} />
              </div>
              <div className="p-3 rounded-md bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="text-card-foreground font-medium">{client.messagesThisMonth.toLocaleString("pt-BR")}</span> mensagens processadas este mês
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* AI Brain Tab */}
        <TabsContent value="brain">
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">System Prompt</h3>
              <Textarea
                defaultValue={client.systemPrompt}
                rows={6}
                className="bg-muted/50 border-border font-mono text-xs resize-none"
              />
              <Button size="sm" className="gradient-primary text-primary-foreground border-0">Salvar Prompt</Button>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">Variáveis Dinâmicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(client.variables).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground font-mono">{`{{${key}}}`}</Label>
                    <Input defaultValue={value} className="bg-muted/50 border-border text-xs" />
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm">+ Adicionar Variável</Button>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">Base de Conhecimento (RAG)</h3>
              <div className="flex items-center justify-center h-32 rounded-md border border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="text-center">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Arraste arquivos ou clique para upload</p>
                  <p className="text-xs text-muted-foreground/60">PDF, TXT, CSV — máx. 10MB</p>
                </div>
              </div>
              <Textarea
                placeholder="FAQ — Adicione perguntas e respostas frequentes aqui..."
                rows={4}
                className="bg-muted/50 border-border text-xs resize-none"
              />
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
                  <span className="text-xs font-mono text-primary">{client.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Valor Mensal</span>
                  <span className="text-sm font-semibold text-card-foreground">R$ {client.monthlyValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Vencimento</span>
                  <span className="text-xs font-mono text-card-foreground">{client.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Desde</span>
                  <span className="text-xs font-mono text-card-foreground">{client.createdAt}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">Consumo</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Mensagens</span>
                  <span className="text-sm text-card-foreground">{client.messagesThisMonth.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Tokens IA</span>
                  <span className="text-sm text-card-foreground">{(client.tokensUsed / 1000).toLocaleString("pt-BR")}k</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Custo Estimado</span>
                  <span className="text-sm font-semibold text-warning">R$ {((client.tokensUsed / 1000000) * 2.5).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
            <h3 className="text-sm font-medium text-card-foreground">Score de Risco de Banimento</h3>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(220, 14%, 18%)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={client.riskScore > 60 ? "hsl(0, 72%, 55%)" : client.riskScore > 30 ? "hsl(38, 92%, 55%)" : "hsl(145, 65%, 42%)"}
                    strokeWidth="8"
                    strokeDasharray={`${client.riskScore * 2.64} 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-card-foreground">
                  {client.riskScore}%
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-card-foreground">
                  {client.riskScore > 60 ? "⚠️ Risco Alto — Recomendado pausar envios" :
                   client.riskScore > 30 ? "⚡ Risco Moderado — Monitorar atividade" :
                   "✅ Risco Baixo — Operação normal"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Baseado em: frequência de envio, taxa de bloqueio, reportes de spam
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
