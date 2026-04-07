import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import OnboardingChoice from "@/components/onboarding/OnboardingChoice";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default function ClientOnboarding() {
  const [showChoice, setShowChoice] = useState(true);
  const [onboardingData, setOnboardingData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingSupport, setRequestingSupport] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { planId } = useSubscription();

  useEffect(() => {
    if (!user) return;
    api.get<{ onboarding_data: any; onboarding_completed: boolean }>("/api/profiles/me")
      .then((data) => {
        if (data?.onboarding_completed) {
          navigate("/client/dashboard");
          return;
        }
        if (data?.onboarding_data && typeof data.onboarding_data === "object" && "choice_made" in data.onboarding_data) {
          setShowChoice(false);
        }
        setOnboardingData(data?.onboarding_data || {});
      })
      .catch((err) => {
        console.error("Error loading onboarding data:", err);
        toast({ title: "Erro ao carregar dados", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleWizardComplete = async (answers: any, generatedPrompt: string) => {
    setSaving(true);
    try {
      // Salva perfil e marca onboarding como completo
      await api.patch("/api/profiles/me/onboarding", {
        onboarding_data: {
          ...onboardingData,
          choice_made: true,
          choice: "self",
          wizard_answers: answers,
          completed: true,
        },
        full_name: answers.full_name || null,
        company: answers.company || null,
        phone: answers.phone || null,
      });

      // Salva o prompt gerado pela IA no perfil
      await api.patch("/api/profiles/me", {
        system_prompt: generatedPrompt,
      });

      // Notifica o admin
      await api.post("/api/notifications/admin", {
        type: "onboarding_complete",
        user_name: answers.full_name || "Não informado",
        company: answers.company || "Não informado",
        phone: answers.phone || "Não informado",
        onboarding_data: answers,
      });

      toast({
        title: "Cadastro concluído! ✅",
        description: "Seu robô foi configurado. Bem-vindo ao AtendIA!",
      });
      setTimeout(() => navigate("/client/dashboard"), 2000);
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChoice = async (choice: "self" | "support") => {
    if (choice === "self") {
      try {
        const updatedData = { ...onboardingData, choice_made: true, choice: "self" };
        await api.patch("/api/profiles/me", { onboarding_data: updatedData });
        setOnboardingData(updatedData);
        setShowChoice(false);
      } catch {}
    } else {
      await requestSupport();
    }
  };

  const requestSupport = async () => {
    setRequestingSupport(true);
    try {
      const profile = await api.get<any>("/api/profiles/me");

      await api.post("/api/notifications/admin", {
        type: "support_request",
        user_name: profile?.full_name || "Não informado",
        company: profile?.company || "Não informado",
        phone: profile?.phone || "Não informado",
        onboarding_data: profile?.onboarding_data || {},
      });

      const updatedData = {
        ...onboardingData,
        choice_made: true,
        choice: "support",
        support_requested: true,
        support_requested_at: new Date().toISOString(),
      };

      await api.patch("/api/profiles/me", { onboarding_data: updatedData });

      toast({
        title: "Solicitação enviada! 🎉",
        description: "Em breve nossa equipe entrará em contato para configurar seu robô.",
      });
      setTimeout(() => navigate("/client/dashboard"), 2000);
    } catch (error: any) {
      toast({ title: "Erro ao enviar solicitação", description: error.message, variant: "destructive" });
    } finally {
      setRequestingSupport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showChoice) {
    return <OnboardingChoice onChoose={handleChoice} planId={planId} />;
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-xl mx-auto">
        <div className="text-center space-y-1 mb-8">
          <h1 className="text-3xl font-bold text-foreground">Configure seu Robô</h1>
          <p className="text-muted-foreground">Responda as perguntas abaixo e a IA cria tudo para você</p>
        </div>
        <OnboardingWizard
          initialData={onboardingData.wizard_answers || {
            full_name: onboardingData.company_info?.full_name || "",
            company: onboardingData.company_info?.company || "",
            phone: onboardingData.company_info?.phone || "",
          }}
          onComplete={handleWizardComplete}
          saving={saving}
        />
      </div>
    </div>
  );
}
