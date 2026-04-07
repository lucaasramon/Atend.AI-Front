import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, Sparkles, Building2, MessageSquare, Clock, HelpCircle, ShieldAlert, Phone, Bot } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface WizardAnswers {
  // Dados da empresa
  full_name: string;
  company: string;
  phone: string;
  // Perguntas-chave do robô
  segment: string;
  products: string;
  botName: string;
  tone: string;
  schedule: string;
  faq: string;
  restrictions: string;
  handoff: string;
}

interface OnboardingWizardProps {
  initialData?: Partial<WizardAnswers>;
  onComplete: (data: WizardAnswers, generatedPrompt: string) => Promise<void>;
  saving: boolean;
}

type Step = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  fields: (keyof WizardAnswers)[];
};

const STEPS: Step[] = [
  {
    id: "company",
    title: "Dados da Empresa",
    subtitle: "Vamos começar com as informações básicas do seu negócio.",
    icon: Building2,
    fields: ["full_name", "company", "phone"],
  },
  {
    id: "segment",
    title: "Segmento e Serviços",
    subtitle: "O que sua empresa faz? Isso define como o robô vai se apresentar.",
    icon: MessageSquare,
    fields: ["segment", "products"],
  },
  {
    id: "personality",
    title: "Personalidade do Robô",
    subtitle: "Como você quer que o seu robô se chame e se comunique?",
    icon: Bot,
    fields: ["botName", "tone"],
  },
  {
    id: "schedule",
    title: "Horário e Atendimento",
    subtitle: "Quando o robô estará disponível e como tratar casos complexos?",
    icon: Clock,
    fields: ["schedule", "handoff"],
  },
  {
    id: "knowledge",
    title: "Conhecimento e Regras",
    subtitle: "Quais são as dúvidas mais comuns? Há algo que o robô nunca deve fazer?",
    icon: HelpCircle,
    fields: ["faq", "restrictions"],
  },
];

const FIELD_CONFIG: Record<
  keyof WizardAnswers,
  { label: string; placeholder: string; multiline?: boolean; tip?: string }
> = {
  full_name: { label: "Seu nome completo", placeholder: "Ex: João Silva" },
  company: { label: "Nome da empresa", placeholder: "Ex: Clínica Saúde Total" },
  phone: { label: "WhatsApp de contato (com DDI)", placeholder: "Ex: +5511999999999", tip: "Este número será usado para contato da nossa equipe." },
  segment: { label: "Qual é o segmento do seu negócio?", placeholder: "Ex: Clínica odontológica, loja de roupas, imobiliária, restaurante...", multiline: true },
  products: { label: "Quais são seus principais produtos ou serviços?", placeholder: "Ex: Consultas, planos mensais, venda de roupas femininas, delivery de pizza...", multiline: true, tip: "Seja específico — o robô vai apresentar isso aos clientes." },
  botName: { label: "Qual nome o robô vai usar?", placeholder: "Ex: Sofia, Max, Atendimento Saúde Total", tip: "O robô vai se apresentar com este nome." },
  tone: { label: "Como o robô deve se comunicar?", placeholder: "Ex: Formal e profissional / Amigável e descontraído / Simpático mas direto...", multiline: true },
  schedule: { label: "Qual é o horário de atendimento?", placeholder: "Ex: Segunda a Sexta, das 8h às 18h. Sábados das 9h às 13h.", tip: "O robô vai informar este horário quando necessário." },
  handoff: { label: "Contato para transferir atendimentos complexos (transbordo)", placeholder: "Ex: +5511988887777 ou 'falar com Juliana no WhatsApp'", tip: "Quando o robô não puder resolver, ele vai indicar este contato." },
  faq: { label: "Quais são as principais dúvidas que seus clientes costumam ter?", placeholder: "Ex: Qual o preço? Como agendar? Aceita plano? Qual o endereço? ...", multiline: true, tip: "Liste as perguntas mais frequentes para o robô saber responder." },
  restrictions: { label: "O que o robô NUNCA deve fazer ou falar?", placeholder: "Ex: Nunca dar desconto, nunca confirmar valores sem consultar, nunca falar mal de concorrentes...", multiline: true, tip: "Deixe em branco se não houver restrições específicas." },
};

export default function OnboardingWizard({ initialData = {}, onComplete, saving }: OnboardingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [answers, setAnswers] = useState<WizardAnswers>({
    full_name: initialData.full_name || "",
    company: initialData.company || "",
    phone: initialData.phone || "",
    segment: initialData.segment || "",
    products: initialData.products || "",
    botName: initialData.botName || "",
    tone: initialData.tone || "",
    schedule: initialData.schedule || "",
    handoff: initialData.handoff || "",
    faq: initialData.faq || "",
    restrictions: initialData.restrictions || "",
  });

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const progress = ((step) / STEPS.length) * 100;

  const updateField = (field: keyof WizardAnswers, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const stepIsValid = () => {
    const requiredFields: (keyof WizardAnswers)[] = ["full_name", "company", "phone", "segment", "products", "botName", "tone", "schedule", "handoff"];
    return currentStep.fields
      .filter((f) => requiredFields.includes(f))
      .every((f) => answers[f].trim().length > 0);
  };

  const handleNext = async () => {
    if (!stepIsValid()) {
      toast({ title: "Preencha os campos obrigatórios antes de continuar.", variant: "destructive" });
      return;
    }

    if (isLastStep) {
      // Gera o prompt com Gemini
      await handleGeneratePrompt();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleGeneratePrompt = async () => {
    setGeneratingPrompt(true);
    try {
      const data = await api.post<{ prompt: string }>("/api/ai/generate-prompt", { answers });
      if (data?.prompt) {
        setGeneratedPrompt(data.prompt);
        setShowPromptPreview(true);
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar prompt", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleConfirm = async () => {
    await onComplete(answers, generatedPrompt);
  };

  // Tela de revisão e confirmação do prompt gerado
  if (showPromptPreview) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Seu robô está pronto!</h2>
          <p className="text-muted-foreground text-sm">
            A IA gerou o cérebro do seu robô com base nas suas respostas. Revise abaixo e confirme.
          </p>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Prompt gerado</Label>
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" /> Gerado por IA
              </Badge>
            </div>
            <Textarea
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              className="min-h-[400px] font-mono text-xs bg-muted/30 border-border resize-y"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Você pode editar o texto acima se quiser ajustar alguma parte antes de confirmar.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowPromptPreview(false)}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar e editar
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={saving || !generatedPrompt.trim()}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" /> Confirmar e Finalizar</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const Icon = currentStep.icon;

  return (
    <div className="space-y-6">
      {/* Header com progresso */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Passo {step + 1} de {STEPS.length}</span>
          <span>{Math.round(progress)}% concluído</span>
        </div>
        <Progress value={progress} className="h-1.5" />

        <div className="flex items-center gap-3 pt-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">{currentStep.title}</h2>
            <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Campos do passo atual */}
      <div className="space-y-4">
        {currentStep.fields.map((field) => {
          const config = FIELD_CONFIG[field];
          const isRequired = ["full_name", "company", "phone", "segment", "products", "botName", "tone", "schedule", "handoff"].includes(field);
          return (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={field} className="text-sm font-medium">
                {config.label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {config.tip && (
                <p className="text-xs text-muted-foreground">{config.tip}</p>
              )}
              {config.multiline ? (
                <Textarea
                  id={field}
                  placeholder={config.placeholder}
                  value={answers[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  className="min-h-[80px] resize-none bg-muted/20 border-border"
                />
              ) : (
                <Input
                  id={field}
                  placeholder={config.placeholder}
                  value={answers[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  type={field === "phone" || field === "handoff" ? "tel" : "text"}
                  className="bg-muted/20 border-border"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Navegação */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
        </Button>
        <Button
          onClick={handleNext}
          disabled={generatingPrompt}
          className="flex-1"
        >
          {generatingPrompt ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando com IA...</>
          ) : isLastStep ? (
            <><Sparkles className="w-4 h-4 mr-2" /> Gerar Robô com IA</>
          ) : (
            <>Próximo <ArrowRight className="w-4 h-4 ml-2" /></>
          )}
        </Button>
      </div>

      {/* Indicador de passos */}
      <div className="flex justify-center gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => i < step && setStep(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40 cursor-pointer" : "w-3 bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
