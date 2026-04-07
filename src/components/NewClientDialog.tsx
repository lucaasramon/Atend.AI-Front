import { useState, useEffect, useRef, useMemo } from "react";
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
import { User, Bot, Zap, Shield, Upload, FileText, X, Plus, HelpCircle, Loader2, CheckCircle2, Copy, Eye, EyeOff, Pencil, Wifi, WifiOff, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const clientSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  company: z.string().trim().min(2, "Empresa deve ter pelo menos 2 caracteres").max(100),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  plan: z.string().min(1, "Selecione um plano"),
  instanceName: z.string().trim().min(2, "Nome da instância deve ter pelo menos 2 caracteres")
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, números, _ ou -"),
  systemPrompt: z.string().trim().min(10, "Prompt deve ter pelo menos 10 caracteres").max(20000),
  varEmpresa: z.string().trim().min(1, "Obrigatório"),
  varHorario: z.string().trim().min(1, "Obrigatório"),
  varTransbordo: z.string().trim().min(10, "Telefone inválido").max(20),
  webhookUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});

// Ao editar, apenas dados básicos são obrigatórios — IA e automação são opcionais
const editSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  company: z.string().trim().min(2, "Empresa deve ter pelo menos 2 caracteres").max(100),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  plan: z.string().min(1, "Selecione um plano"),
  instanceName: z.string().trim()
    .max(50)
    .regex(/^[a-zA-Z0-9_-]*$/, "Use apenas letras, números, _ ou -")
    .optional().or(z.literal("")),
  systemPrompt: z.string().trim().max(20000).optional().or(z.literal("")),
  varEmpresa: z.string().trim().optional().or(z.literal("")),
  varHorario: z.string().trim().optional().or(z.literal("")),
  varTransbordo: z.string().trim().optional().or(z.literal("")),
  webhookUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});

type ClientFormData = z.infer<typeof clientSchema>;
type EditFormData = z.infer<typeof editSchema>;

export interface EditingProfile {
  id: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  plan: string;
  email?: string;
  instance_name?: string | null;
  system_prompt?: string | null;
  webhook_url?: string | null;
}

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: () => void;
  editingProfile?: EditingProfile | null;
}

interface CreatedResult {
  email: string;
  temp_password: string;
  profileId: string;
  instanceName: string;
}

interface QrState {
  loading: boolean;
  base64?: string;
  connected: boolean;
  polling: boolean;
}

export default function NewClientDialog({ open, onOpenChange, onClientCreated, editingProfile }: NewClientDialogProps) {
  const isEditing = !!editingProfile;
  const activeSchema = useMemo(() => isEditing ? editSchema : clientSchema, [isEditing]);
  const [activeTab, setActiveTab] = useState("info");
  const [knowledgeFiles, setKnowledgeFiles] = useState<File[]>([]);
  const [faqItems, setFaqItems] = useState<{ question: string; answer: string }[]>([]);
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreatedResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [qr, setQr] = useState<QrState>({ loading: false, connected: false, polling: false });
  const [provisioning, setProvisioning] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(activeSchema as any),
    defaultValues: {
      email: "",
      name: "",
      company: "",
      phone: "",
      plan: "starter",
      instanceName: "",
      systemPrompt: "",
      varEmpresa: "",
      varHorario: "",
      varTransbordo: "",
      webhookUrl: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        email: editingProfile?.email ?? "",
        name: editingProfile?.full_name ?? "",
        company: editingProfile?.company ?? "",
        phone: editingProfile?.phone ?? editingProfile?.whatsapp_number ?? "",
        plan: editingProfile?.plan ?? "starter",
        instanceName: editingProfile?.instance_name ?? "",
        systemPrompt: editingProfile?.system_prompt ?? "",
        varEmpresa: editingProfile?.company ?? "",
        varHorario: "",
        varTransbordo: "",
        webhookUrl: editingProfile?.webhook_url ?? "",
      });
      setQr({ loading: false, connected: false, polling: false });
      setCreatedResult(null);
      setActiveTab("info");
    }
    return () => stopPolling();
  }, [open, editingProfile]);

  // Polling de status da instância
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = (instanceName: string) => {
    stopPolling();
    setQr((q) => ({ ...q, polling: true }));
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get<any>(`/api/evolution/status/${instanceName}`);
        const state: string = res?.instance?.state ?? res?.state ?? "";
        if (state === "open") {
          setQr({ loading: false, connected: true, polling: false });
          stopPolling();
          toast.success("WhatsApp conectado com sucesso!");
        }
      } catch {
        // silencioso — continua tentando
      }
    }, 5000);
  };

  const loadQrCode = async (instanceName: string) => {
    setQr({ loading: true, connected: false, polling: false });
    try {
      const res = await api.get<any>(`/api/evolution/qrcode/${instanceName}`);
      const base64: string = res?.base64 ?? res?.qrcode?.base64 ?? "";
      if (!base64) {
        toast.error("QR code não disponível ainda. Tente novamente em instantes.");
        setQr({ loading: false, connected: false, polling: false });
        return;
      }
      setQr({ loading: false, base64, connected: false, polling: true });
      startPolling(instanceName);
    } catch (e: any) {
      toast.error(`Erro ao carregar QR code: ${e.message}`);
      setQr({ loading: false, connected: false, polling: false });
    }
  };

  const handleProvision = async () => {
    const instanceName = form.getValues("instanceName");
    const systemPrompt = form.getValues("systemPrompt");
    const profileId = isEditing ? editingProfile!.id : createdResult?.profileId;

    if (!instanceName || instanceName.length < 2) {
      toast.error("Defina o nome da instância antes de provisionar");
      return;
    }
    if (!profileId) {
      toast.error("Salve o cliente antes de provisionar a instância");
      return;
    }

    setProvisioning(true);
    try {
      await api.post(`/api/evolution/provision/${profileId}`, {
        instance_name: instanceName,
        system_prompt: systemPrompt,
      });
      toast.success("Instância criada! Escaneie o QR code para conectar o WhatsApp.");
      await loadQrCode(instanceName);
    } catch (e: any) {
      toast.error(`Erro ao provisionar: ${e.message}`);
    } finally {
      setProvisioning(false);
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    setSubmitting(true);
    try {
      if (isEditing && editingProfile) {
        const instanceName = data.instanceName || editingProfile.instance_name || "";

        // 1. Atualiza profile no banco
        await api.patch(`/api/profiles/${editingProfile.id}`, {
          full_name: data.name,
          company: data.company,
          phone: data.phone,
          plan: data.plan,
          system_prompt: data.systemPrompt || undefined,
          webhook_url: data.webhookUrl || null,
          whatsapp_number: data.phone,
          instance_name: instanceName || undefined,
        });

        // 2. Se tem instance_name: provisiona/sincroniza no Evolution + n8n
        if (instanceName) {
          try {
            // provision faz upsert — cria se não existir, atualiza se existir
            await api.post(`/api/evolution/provision/${editingProfile.id}`, {
              instance_name: instanceName,
              system_prompt: data.systemPrompt || undefined,
            });
            toast.success(`${data.company} atualizado e sincronizado com o n8n!`);
          } catch (e: any) {
            toast.warning(`Dados salvos, mas falha na sincronização com n8n: ${e.message}`);
          }
        } else {
          toast.success(`${data.company} atualizado com sucesso!`);
        }

        onClientCreated();
        setActiveTab("automation");
      } else {
        const result = await api.post<{ id: string; email: string; temp_password: string }>(
          "/api/auth/create-client",
          {
            email: data.email,
            full_name: data.name,
            company: data.company,
            phone: data.phone,
            plan: data.plan,
            system_prompt: data.systemPrompt,
            webhook_url: data.webhookUrl || null,
            whatsapp_number: data.phone,
          }
        );
        onClientCreated();
        toast.success(`${data.company} criado com sucesso!`);
        setCreatedResult({
          email: data.email,
          temp_password: result.temp_password,
          profileId: result.id,
          instanceName: data.instanceName,
        });
        // Provisiona instância automaticamente
        setProvisioning(true);
        try {
          await api.post(`/api/evolution/provision/${result.id}`, {
            instance_name: data.instanceName,
            system_prompt: data.systemPrompt,
          });
          await loadQrCode(data.instanceName);
        } catch (e: any) {
          toast.warning(`Cliente criado, mas falha ao provisionar instância: ${e.message}`);
        } finally {
          setProvisioning(false);
        }
      }
    } catch (error: any) {
      toast.error(isEditing ? `Erro ao atualizar cliente: ${error.message}` : `Erro ao criar cliente: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    stopPolling();
    form.reset();
    setKnowledgeFiles([]);
    setFaqItems([]);
    setNewFaqQuestion("");
    setNewFaqAnswer("");
    setActiveTab("info");
    setCreatedResult(null);
    setShowPassword(false);
    setQr({ loading: false, connected: false, polling: false });
    onOpenChange(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
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

  // Tela de credenciais criadas (modo criação — após submit)
  if (createdResult && activeTab !== "automation") {
    return (
      <Dialog open={open} onOpenChange={() => resetAndClose()}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Cliente Criado com Sucesso
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Envie as credenciais abaixo para o cliente acessar o sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="flex gap-2">
                <Input value={createdResult.email} readOnly className="bg-muted/50 font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdResult.email)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Senha temporária</label>
              <div className="flex gap-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={createdResult.temp_password}
                  readOnly
                  className="bg-muted/50 font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdResult.temp_password)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-warning/10 border border-warning/20 rounded-md p-3">
              ⚠️ Salve estas credenciais agora. A senha temporária não poderá ser visualizada novamente.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveTab("automation")} className="flex-1">
              <Smartphone className="w-4 h-4 mr-2" /> Conectar WhatsApp
            </Button>
            <Button onClick={resetAndClose} className="flex-1">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg flex items-center gap-2">
            {isEditing ? <><Pencil className="w-4 h-4" /> Editar Cliente</> : "Novo Cliente + Automação"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {isEditing
              ? "Atualize os dados do cliente, configurações de IA e automação."
              : "Configure os dados do cliente, o cérebro da IA e a automação em um só lugar."}
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

              {/* ── ABA: DADOS ── */}
              <TabsContent value="info" className="space-y-4 mt-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">Email do cliente</FormLabel>
                    <FormControl><Input placeholder="cliente@empresa.com" className="bg-muted/20 border-border" disabled={isEditing} {...field} /></FormControl>
                    {isEditing
                      ? <FormDescription className="text-xs text-muted-foreground/70">O email não pode ser alterado após o cadastro.</FormDescription>
                      : <FormDescription className="text-xs text-muted-foreground/70">O cliente usará este email para fazer login.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )} />
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
                <FormField control={form.control} name="plan" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">Plano</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="bg-muted/20 border-border"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="starter">Starter — R$89/mês</SelectItem>
                        <SelectItem value="pro">Pro — R$199/mês</SelectItem>
                        <SelectItem value="business">Business — R$499/mês</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="instanceName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">Nome da instância (Evolution)</FormLabel>
                    <FormControl>
                      <Input placeholder="AtendIA-EmpresaX" className="bg-muted/20 border-border font-mono text-xs"
                        disabled={isEditing && !!editingProfile?.instance_name} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground/70">
                      Identificador único no Evolution API. Ex: <span className="font-mono">AtendIA-EmpresaX</span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              {/* ── ABA: IA ── */}
              <TabsContent value="ai" className="space-y-4 mt-4">
                <FormField control={form.control} name="systemPrompt" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">System Prompt</FormLabel>
                    <FormDescription className="text-xs text-muted-foreground/70">Instrução principal que define o comportamento da IA para este cliente.</FormDescription>
                    <FormControl>
                      <Textarea placeholder="Você é o assistente virtual da [Empresa]. Ajude clientes a..." className="bg-muted/20 border-border min-h-[100px] font-mono text-xs" {...field} />
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Base de Conhecimento (RAG)
                    </label>
                    <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-3 h-3 mr-1" /> Upload
                    </Button>
                    <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.doc,.docx,.csv,.json" className="hidden"
                      onChange={(e) => { const files = Array.from(e.target.files || []); setKnowledgeFiles(prev => [...prev, ...files]); e.target.value = ""; }} />
                  </div>
                  {knowledgeFiles.length > 0 ? (
                    <div className="space-y-1.5">
                      {knowledgeFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md border border-border bg-muted/10 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-xs text-foreground truncate">{file.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                          </div>
                          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setKnowledgeFiles(prev => prev.filter((_, idx) => idx !== i))}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-muted/5 p-4 text-center">
                      <p className="text-xs text-muted-foreground">Arraste ou envie arquivos PDF, TXT, DOC, CSV para treinar a IA</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" /> Perguntas Frequentes (FAQ)
                  </label>
                  {faqItems.length > 0 && (
                    <div className="space-y-2">
                      {faqItems.map((faq, i) => (
                        <div key={i} className="rounded-md border border-border bg-muted/10 p-3 space-y-1 relative group">
                          <p className="text-xs font-medium text-foreground">P: {faq.question}</p>
                          <p className="text-xs text-muted-foreground">R: {faq.answer}</p>
                          <Button type="button" variant="ghost" size="sm" className="absolute top-1.5 right-1.5 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setFaqItems(prev => prev.filter((_, idx) => idx !== i))}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="rounded-md border border-border bg-muted/5 p-3 space-y-2">
                    <Input placeholder="Qual é a pergunta?" value={newFaqQuestion} onChange={(e) => setNewFaqQuestion(e.target.value)} className="bg-muted/20 border-border text-xs h-8" />
                    <Textarea placeholder="Qual é a resposta?" value={newFaqAnswer} onChange={(e) => setNewFaqAnswer(e.target.value)} className="bg-muted/20 border-border text-xs min-h-[60px]" />
                    <Button type="button" variant="outline" size="sm" className="text-xs h-7 w-full" disabled={!newFaqQuestion.trim() || !newFaqAnswer.trim()}
                      onClick={() => { setFaqItems(prev => [...prev, { question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() }]); setNewFaqQuestion(""); setNewFaqAnswer(""); }}>
                      <Plus className="w-3 h-3 mr-1" /> Adicionar FAQ
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ── ABA: AUTOMAÇÃO ── */}
              <TabsContent value="automation" className="space-y-4 mt-4">
                <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Configuração automática</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ao salvar o cliente, o sistema criará a instância no Evolution API e configurará o webhook no n8n automaticamente.
                  </p>
                </div>

                {/* QR Code / Status de Conexão */}
                <div className="rounded-lg border border-border bg-muted/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-primary" /> Conexão WhatsApp
                    </p>
                    {qr.connected ? (
                      <span className="flex items-center gap-1 text-xs text-success font-medium">
                        <Wifi className="w-3.5 h-3.5" /> Conectado
                      </span>
                    ) : qr.polling ? (
                      <span className="flex items-center gap-1 text-xs text-warning font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguardando scan...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <WifiOff className="w-3.5 h-3.5" /> Desconectado
                      </span>
                    )}
                  </div>

                  {qr.connected ? (
                    <div className="flex flex-col items-center py-4 gap-2">
                      <CheckCircle2 className="w-10 h-10 text-success" />
                      <p className="text-sm text-success font-medium">WhatsApp conectado!</p>
                      <p className="text-xs text-muted-foreground">A IA já está ativa para este cliente.</p>
                    </div>
                  ) : qr.loading ? (
                    <div className="flex flex-col items-center py-6 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Carregando QR code...</p>
                    </div>
                  ) : qr.base64 ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={qr.base64.startsWith("data:") ? qr.base64 : `data:image/png;base64,${qr.base64}`}
                        alt="QR Code WhatsApp"
                        className="w-48 h-48 rounded-lg border border-border"
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Abra o WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho
                      </p>
                      <Button type="button" variant="outline" size="sm" className="text-xs h-7"
                        onClick={() => loadQrCode(form.getValues("instanceName"))}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Atualizar QR
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 gap-3">
                      <p className="text-xs text-muted-foreground text-center">
                        {isEditing && editingProfile?.instance_name
                          ? "Clique para verificar o status ou gerar um novo QR code."
                          : "O QR code será gerado automaticamente ao salvar o cliente."}
                      </p>
                      {(isEditing && editingProfile?.instance_name) && (
                        <Button type="button" variant="outline" size="sm" disabled={provisioning}
                          onClick={() => loadQrCode(editingProfile.instance_name!)}>
                          {provisioning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                          Obter QR Code
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Webhook URL manual (opcional) */}
                <FormField control={form.control} name="webhookUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">URL do Webhook manual (opcional)</FormLabel>
                    <FormDescription className="text-xs text-muted-foreground/70">
                      Deixe vazio para usar o n8n configurado automaticamente.
                    </FormDescription>
                    <FormControl>
                      <Input placeholder="https://n8n.seuservidor.com/webhook/..." className="bg-muted/20 border-border font-mono text-xs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>
            </Tabs>

            <div className="flex justify-between pt-2 border-t border-border">
              <Button type="button" variant="ghost" size="sm" onClick={goToPrev} disabled={activeTab === "info"}>Anterior</Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
                {activeTab === "automation" ? (
                  <Button type="submit" size="sm" disabled={submitting} className="gradient-primary text-primary-foreground border-0">
                    {submitting
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> {isEditing ? "Salvando..." : "Criando..."}</>
                      : isEditing
                        ? <><Pencil className="w-3.5 h-3.5 mr-1" /> Salvar Alterações</>
                        : <><Zap className="w-3.5 h-3.5 mr-1" /> Criar Cliente</>}
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={goToNext}>Próximo</Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
