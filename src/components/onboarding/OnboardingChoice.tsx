import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Headphones, ArrowRight, Lock } from "lucide-react";

interface OnboardingChoiceProps {
  onChoose: (choice: 'self' | 'support') => void;
  planId?: string | null;
}

export default function OnboardingChoice({ onChoose, planId }: OnboardingChoiceProps) {
  const canRequestSupport = planId === "pro" || planId === "business";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-5xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Configure seu Robô de WhatsApp
          </h1>
          <p className="text-xl text-muted-foreground">
            Como você prefere começar?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Self Setup */}
          <Card className="relative overflow-hidden border-2 hover:border-primary transition-all hover:shadow-lg cursor-pointer group">
            <CardContent className="p-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings className="w-8 h-8 text-primary" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Configurar meu Robô
                </h2>
                <p className="text-muted-foreground">
                  Responda algumas perguntas e nossa IA cria o cérebro do seu robô automaticamente.
                  Rápido, simples e personalizado para o seu negócio.
                </p>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Cadastro guiado passo a passo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Prompt gerado por IA com base nas suas respostas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Robô pronto em minutos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Disponível em todos os planos</span>
                </li>
              </ul>

              <Button
                onClick={() => onChoose('self')}
                className="w-full group-hover:bg-primary/90"
                size="lg"
              >
                Configurar Agora
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Support Setup */}
          <Card className={`relative overflow-hidden border-2 transition-all ${
            canRequestSupport
              ? "hover:border-primary hover:shadow-lg cursor-pointer group"
              : "opacity-70 cursor-default"
          }`}>
            <CardContent className="p-8 space-y-6">
              {!canRequestSupport && (
                <Badge className="absolute top-4 right-4 bg-muted text-muted-foreground border-muted-foreground/20 gap-1">
                  <Lock className="w-3 h-3" /> Plano Pro ou superior
                </Badge>
              )}

              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                canRequestSupport ? "bg-accent/10" : "bg-muted/50"
              }`}>
                <Headphones className={`w-8 h-8 ${canRequestSupport ? "text-accent" : "text-muted-foreground"}`} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Solicitar Suporte
                </h2>
                <p className="text-muted-foreground">
                  Nossa equipe especializada configura tudo para você.
                  Receba um robô pronto para usar, personalizado para seu negócio.
                </p>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className={canRequestSupport ? "text-accent mt-0.5" : "text-muted-foreground mt-0.5"}>✓</span>
                  <span>Configuração feita por especialistas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={canRequestSupport ? "text-accent mt-0.5" : "text-muted-foreground mt-0.5"}>✓</span>
                  <span>Economize tempo e esforço</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={canRequestSupport ? "text-accent mt-0.5" : "text-muted-foreground mt-0.5"}>✓</span>
                  <span>Suporte personalizado via WhatsApp</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={canRequestSupport ? "text-accent mt-0.5" : "text-muted-foreground mt-0.5"}>✓</span>
                  <span>Robô otimizado para seu negócio</span>
                </li>
              </ul>

              {canRequestSupport ? (
                <Button
                  onClick={() => onChoose('support')}
                  variant="secondary"
                  className="w-full group-hover:bg-secondary/90"
                  size="lg"
                >
                  Solicitar Suporte
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button disabled className="w-full" size="lg" variant="secondary">
                    <Lock className="w-4 h-4 mr-2" /> Disponível no Plano Pro
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Faça upgrade em <a href="/client/billing" className="text-primary hover:underline">Pagamento</a> para desbloquear.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Você poderá sempre entrar em contato com nosso suporte para ajuda adicional</p>
        </div>
      </div>
    </div>
  );
}
