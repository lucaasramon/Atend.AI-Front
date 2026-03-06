import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bot, Zap, Shield, Upload, FileText, X, Plus, HelpCircle } from "lucide-react";
import { Client } from "@/data/mockData";
import { toast } from "sonner";

const clientSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  company: z.string().trim().min(2, "Empresa deve ter pelo menos 2 caracteres").max(100),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  plan: z.string().min(1, "Selecione um plano"),
  monthlyValue: z.coerce.number().min(1, "Valor deve ser maior que 0"),
  dueDate: z.string().min(1, "Selecione a data de vencimento"),
  systemPrompt: z.string().trim().min(10, "Prompt deve ter pelo menos 10 caracteres").max(5000),
  varEmpresa: z.string().trim().min(1, "Obrigatório"),
  varHorario: z.string().trim().min(1, "Obrigatório"),
  varTransbordo: z.string().trim().min(10, "Telefone inválido").max(20),
  webhookUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});

type ClientFormData = z.infer<typeof clientSchema>;

const PLAN_VALUES: Record<string, number> = {
  Starter: 147,
  Pro: 297,
  Business: 497,
};

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: Client) => void;
}

export default function NewClientDialog({ open, onOpenChange, onClientCreated }: NewClientDialogProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [knowledgeFiles, setKnowledgeFiles] = useState<File[]>([]);
  const [faqItems, setFaqItems] = useState<{ question: string; answer: string }[]>([]);
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      plan: "Starter",
      monthlyValue: 147,
      dueDate: "",
      systemPrompt: "",
      varEmpresa: "",
      varHorario: "",
      varTransbordo: "",
      webhookUrl: "",
    },
  });

  const onSubmit = (data: ClientFormData) => {
    const newClient: Client = {
      id: crypto.randomUUID(),
      name: data.name,
      company: data.company,
      status: "active",
      whatsappStatus: "offline",
      phone: data.phone,
      plan: data.plan,
      monthlyValue: data.monthlyValue,
      dueDate: data.dueDate,
      messagesThisMonth: 0,
      tokensUsed: 0,
      riskScore: 0,
      createdAt: new Date().toISOString().split("T")[0],
      systemPrompt: data.systemPrompt,
      variables: {
        empresa: data.varEmpresa,
        horario: data.varHorario,
        transbordo: data.varTransbordo,
      },
    };

    onClientCreated(newClient);
    toast.success(`${data.company} criado com sucesso! Automação configurada.`);
    form.reset();
    setKnowledgeFiles([]);
    setFaqItems([]);
    setNewFaqQuestion("");
    setNewFaqAnswer("");
    setActiveTab("info");
    onOpenChange(false);
  };

  const handlePlanChange = (value: string) => {
    form.setValue("plan", value);
    form.setValue("monthlyValue", PLAN_VALUES[value] || 147);
  };

  const tabs = [
    { value: "info", label: "Dados", icon: User },
    { value: "ai", label: "IA", icon: Bot },
    { value: "automation", label: "Automação", icon: Zap },
  ];

  const goToNext = () => {
    const order = ["info", "ai", "automation"];
    const idx = order.indexOf(activeTab);
    if (idx < order.length - 1) setActiveTab(order[idx + 1]);
  };

  const goToPrev = () => {
    const order = ["info", "ai", "automation"];
    const idx = order.indexOf(activeTab);
    if (idx > 0) setActiveTab(order[idx - 1]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg">Novo Cliente + Automação</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Configure os dados do cliente, o cérebro da IA e a automação em um só lugar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-muted/30">
                {tabs.map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="flex-1 gap-1.5 text-xs">
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Tab 1: Dados do Cliente */}
              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">Nome do responsável</FormLabel>
                      <FormControl><Input placeholder="João Silva" className="bg-muted/20 border-border" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="company" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">Empresa</FormLabel>
                      <FormControl><Input placeholder="Empresa Ltda" className="bg-muted/20 border-border" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">WhatsApp (com DDI)</FormLabel>
                    <FormControl><Input placeholder="+5511999999999" className="bg-muted/20 border-border" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="plan" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">Plano</FormLabel>
                      <Select value={field.value} onValueChange={handlePlanChange}>
                        <FormControl><SelectTrigger className="bg-muted/20 border-border"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Starter">Starter</SelectItem>
                          <SelectItem value="Pro">Pro</SelectItem>
                          <SelectItem value="Business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="monthlyValue" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">Valor (R$)</FormLabel>
                      <FormControl><Input type="number" className="bg-muted/20 border-border" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">Vencimento</FormLabel>
                      <FormControl><Input type="date" className="bg-muted/20 border-border" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </TabsContent>

              {/* Tab 2: Cérebro da IA */}
              <TabsContent value="ai" className="space-y-4 mt-4">
                <FormField control={form.control} name="systemPrompt" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">System Prompt</FormLabel>
                    <FormDescription className="text-xs text-muted-foreground/70">
                      Instrução principal que define o comportamento da IA para este cliente.
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="Você é o assistente virtual da [Empresa]. Ajude clientes a..."
                        className="bg-muted/20 border-border min-h-[120px] font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="varEmpresa" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">Nome da empresa (variável)</FormLabel>
                      <FormControl><Input placeholder="Empresa X" className="bg-muted/20 border-border" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="varHorario" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">Horário de atendimento</FormLabel>
                      <FormControl><Input placeholder="Seg-Sex 8h-18h" className="bg-muted/20 border-border" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="varTransbordo" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">Contato de transbordo (humano)</FormLabel>
                    <FormControl><Input placeholder="+5511988887777" className="bg-muted/20 border-border" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              {/* Tab 3: Automação */}
              <TabsContent value="automation" className="space-y-4 mt-4">
                <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Configuração automática</p>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1.5 ml-6 list-disc">
                    <li>Workflow n8n será criado com base no plano selecionado</li>
                    <li>Webhook será vinculado ao número de WhatsApp informado</li>
                    <li>System Prompt e variáveis serão injetados na automação</li>
                    <li>Status inicial: <span className="text-primary font-mono">Ativo</span> — WhatsApp aguardando conexão via QR Code</li>
                  </ul>
                </div>
                <FormField control={form.control} name="webhookUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">Webhook URL (opcional)</FormLabel>
                    <FormDescription className="text-xs text-muted-foreground/70">
                      Se já tiver um workflow pronto, cole a URL aqui. Caso contrário, será gerada automaticamente.
                    </FormDescription>
                    <FormControl><Input placeholder="https://n8n.example.com/webhook/..." className="bg-muted/20 border-border font-mono text-xs" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>
            </Tabs>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goToPrev}
                disabled={activeTab === "info"}
                className="text-muted-foreground"
              >
                Voltar
              </Button>
              <div className="flex gap-2">
                {activeTab !== "automation" ? (
                  <Button type="button" size="sm" onClick={goToNext} className="gradient-primary text-primary-foreground border-0">
                    Próximo
                  </Button>
                ) : (
                  <Button type="submit" size="sm" className="gradient-primary text-primary-foreground border-0 shadow-glow">
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    Criar Cliente e Automação
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
