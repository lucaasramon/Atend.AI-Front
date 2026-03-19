import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CompanyInfoStep from "@/components/onboarding/CompanyInfoStep";
import OnboardingChoice from "@/components/onboarding/OnboardingChoice";

export default function ClientOnboarding() {
  const [showChoice, setShowChoice] = useState(true);
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

      if (data?.onboarding_data && typeof data.onboarding_data === 'object' && 'choice_made' in data.onboarding_data) {
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

  const saveAndComplete = async (data: any) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const profileUpdate: any = {
        onboarding_data: { ...onboardingData, company_info: { ...data, completed: true } },
        onboarding_completed: true,
        full_name: data.full_name || null,
        company: data.company || null,
        phone: data.phone || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.id);

      if (error) throw error;

      // Notify admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      await supabase.from("admin_notifications").insert({
        user_id: user.id,
        type: 'onboarding_complete',
        user_email: user.email,
        user_name: profile?.full_name || 'Não informado',
        company: profile?.company || 'Não informado',
        phone: profile?.phone || 'Não informado',
        onboarding_data: profile?.onboarding_data || {},
      });

      toast({
        title: "Cadastro concluído! ✅",
        description: "Bem-vindo ao AtendIA! Nosso suporte entrará em contato para configurar seu robô.",
      });

      setTimeout(() => navigate("/client/dashboard"), 2000);
      return true;
    } catch (error) {
      console.error("Error completing onboarding:", error);
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

  const handleChoice = async (choice: 'self' | 'support') => {
    if (choice === 'self') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const updatedData = { ...onboardingData, choice_made: true, choice: 'self' };

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

      await supabase.from("admin_notifications").insert({
        user_id: user.id,
        type: 'support_request',
        user_email: user.email,
        user_name: profile?.full_name || 'Não informado',
        company: profile?.company || 'Não informado',
        phone: profile?.phone || 'Não informado',
        onboarding_data: profile?.onboarding_data || {},
      });

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Complete seu Cadastro</h1>
          <p className="text-muted-foreground">
            Preencha os dados da sua empresa para começar
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>Informações básicas do seu negócio</CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyInfoStep
              data={onboardingData.company_info || {}}
              onSave={saveAndComplete}
              saving={saving}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
