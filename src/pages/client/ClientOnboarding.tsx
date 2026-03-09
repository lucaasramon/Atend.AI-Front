import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CompanyInfoStep from "@/components/onboarding/CompanyInfoStep";
import WhatsAppSetupStep from "@/components/onboarding/WhatsAppSetupStep";
import BotIntelligenceStep from "@/components/onboarding/BotIntelligenceStep";
import KnowledgeBaseStep from "@/components/onboarding/KnowledgeBaseStep";
import IntegrationsStep from "@/components/onboarding/IntegrationsStep";
import OnboardingChoice from "@/components/onboarding/OnboardingChoice";

const steps = [
  { id: "company_info", label: "Dados da Empresa", description: "Informações básicas do seu negócio" },
  { id: "whatsapp_setup", label: "Conectar WhatsApp", description: "Configure seu número do WhatsApp" },
  { id: "bot_intelligence", label: "Inteligência do Robô", description: "Defina a personalidade do seu assistente" },
  { id: "knowledge_base", label: "Base de Conhecimento", description: "Adicione informações e FAQs" },
  { id: "integrations", label: "Integrações", description: "Configure webhooks e automações" },
];

export default function ClientOnboarding() {
  const [showChoice, setShowChoice] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingSupport, setRequestingSupport] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_data, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.onboarding_completed) {
        navigate("/client/dashboard");
        return;
      }

      // Se já escolheu antes, não mostrar a escolha novamente
      if (data?.onboarding_data?.choice_made) {
        setShowChoice(false);
      }

      setOnboardingData(data?.onboarding_data || {});
    } catch (error) {
      console.error("Error loading onboarding data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar o progresso do onboarding.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveStepData = async (stepId: string, data: any, completed: boolean = true) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedData = {
        ...onboardingData,
        [stepId]: { ...data, completed },
      };

      // Only update specific profile fields that exist in the database
      const profileUpdate: any = {
        onboarding_data: updatedData,
      };

      // Add only valid profile fields
      if (data.whatsapp_number) profileUpdate.whatsapp_number = data.whatsapp_number;
      if (data.system_prompt) profileUpdate.system_prompt = data.system_prompt;
      if (data.webhook_url) profileUpdate.webhook_url = data.webhook_url;
      if (data.full_name) profileUpdate.full_name = data.full_name;
      if (data.company) profileUpdate.company = data.company;
      if (data.phone) profileUpdate.phone = data.phone;

      const { error } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.id);

      if (error) throw error;

      setOnboardingData(updatedData);
      
      toast({
        title: "Progresso salvo",
        description: "Suas informações foram salvas com sucesso.",
      });

      return true;
    } catch (error) {
      console.error("Error saving step data:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o progresso.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Parabéns! 🎉",
        description: "Seu robô está configurado e pronto para uso!",
      });

      setTimeout(() => navigate("/client/dashboard"), 1500);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o onboarding.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChoice = async (choice: 'self' | 'support') => {
    if (choice === 'self') {
      // Salvar escolha e continuar com onboarding normal
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const updatedData = {
          ...onboardingData,
          choice_made: true,
          choice: 'self'
        };

        const { error } = await supabase
          .from("profiles")
          .update({ onboarding_data: updatedData })
          .eq("id", user.id);

        if (!error) {
          setOnboardingData(updatedData);
          setShowChoice(false);
        }
      } catch (error) {
        console.error("Error saving choice:", error);
      }
    } else {
      // Solicitar suporte
      await requestSupport();
    }
  };

  const requestSupport = async () => {
    setRequestingSupport(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Chamar edge function para enviar email
      const { error } = await supabase.functions.invoke('request-support', {
        body: {
          userEmail: user.email,
          userName: profile?.full_name || 'Não informado',
          company: profile?.company || 'Não informado',
          phone: profile?.phone || 'Não informado',
          whatsappNumber: profile?.whatsapp_number || 'Não informado',
        }
      });

      if (error) throw error;

      // Salvar escolha
      const updatedData = {
        ...onboardingData,
        choice_made: true,
        choice: 'support',
        support_requested: true,
        support_requested_at: new Date().toISOString()
      };

      await supabase
        .from("profiles")
        .update({ onboarding_data: updatedData })
        .eq("id", user.id);

      toast({
        title: "Solicitação enviada! 🎉",
        description: "Em breve entraremos em contato para configurar seu robô.",
      });

      setTimeout(() => navigate("/client/dashboard"), 2000);
    } catch (error) {
      console.error("Error requesting support:", error);
      toast({
        title: "Erro ao enviar solicitação",
        description: "Tente novamente ou entre em contato diretamente.",
        variant: "destructive",
      });
    } finally {
      setRequestingSupport(false);
    }
  };

  const handleNext = async () => {
    const stepId = steps[currentStep].id;
    const stepData = onboardingData[stepId];
    
    // Validate if current step is completed
    if (!stepData?.completed) {
      toast({
        title: "Complete esta etapa",
        description: "Por favor, preencha todas as informações antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateProgress = () => {
    const completedSteps = steps.filter(step => onboardingData[step.id]?.completed).length;
    return (completedSteps / steps.length) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showChoice) {
    return <OnboardingChoice onChoose={handleChoice} />;
  }

  if (requestingSupport) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Enviando solicitação de suporte...</p>
        </div>
      </div>
    );
  }

  const StepComponent = [
    CompanyInfoStep,
    WhatsAppSetupStep,
    BotIntelligenceStep,
    KnowledgeBaseStep,
    IntegrationsStep,
  ][currentStep];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Configure seu Robô de WhatsApp</h1>
          <p className="text-muted-foreground">
            Siga os passos abaixo para começar a usar seu assistente inteligente
          </p>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso geral</span>
                <span className="font-medium">{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Steps Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Etapas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {steps.map((step, index) => {
                  const isCompleted = onboardingData[step.id]?.completed;
                  const isCurrent = index === currentStep;
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStep(index)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isCurrent
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                        ) : (
                          <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${
                            isCurrent ? "text-primary" : "text-muted-foreground"
                          }`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            isCurrent ? "text-primary" : "text-foreground"
                          }`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {currentStep + 1}
                  </span>
                  <div>
                    <CardTitle>{steps[currentStep].label}</CardTitle>
                    <CardDescription>{steps[currentStep].description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <StepComponent
                  data={onboardingData[steps[currentStep].id] || {}}
                  onSave={(data: any) => saveStepData(steps[currentStep].id, data)}
                  saving={saving}
                />
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0 || saving}
              >
                Anterior
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={saving || !onboardingData[steps[currentStep].id]?.completed}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : currentStep === steps.length - 1 ? (
                  "Finalizar Configuração"
                ) : (
                  "Próximo"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
