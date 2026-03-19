import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface TourStep {
  title: string;
  description: string;
  target?: string;
}

const STEPS: TourStep[] = [
  { title: "Bem-vindo ao AtendIA! 🎉", description: "Vamos fazer um tour rápido pelo seu painel para você conhecer todas as funcionalidades." },
  { title: "Dashboard", description: "Aqui você acompanha as métricas de desempenho: leads, mensagens, sentimentos e volume de atendimento." },
  { title: "Leads", description: "Visualize e gerencie todos os contatos capturados pelo robô, com filtros por status e sentimento." },
  { title: "Templates", description: "Crie respostas prontas que o robô pode usar para agilizar o atendimento." },
  { title: "Base de Conhecimento", description: "Adicione perguntas e respostas para enriquecer o repertório do robô." },
  { title: "Exportar Relatórios", description: "Exporte seus dados de leads, mensagens e templates em CSV para análise externa." },
  { title: "Suporte", description: "Precisa de ajuda? Clique em 'Suporte' no menu para enviar uma mensagem diretamente para nossa equipe." },
  { title: "Tudo pronto! ✅", description: "Explore o painel no seu ritmo. Estamos aqui para ajudar caso precise de alguma coisa." },
];

export default function OnboardingTour() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const key = `tour_completed_${user.id}`;
    if (!localStorage.getItem(key)) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const dismiss = () => {
    setVisible(false);
    if (user) {
      localStorage.setItem(`tour_completed_${user.id}`, "true");
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-muted"}`} />
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={dismiss} className="h-7 w-7 -mt-1 -mr-2">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <h3 className="text-lg font-bold text-foreground mb-2">{current.title}</h3>
          <p className="text-sm text-muted-foreground mb-6">{current.description}</p>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={dismiss} className="text-muted-foreground">
              Pular tour
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={prev}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
              )}
              <Button size="sm" onClick={next}>
                {isLast ? "Concluir" : "Próximo"} {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
