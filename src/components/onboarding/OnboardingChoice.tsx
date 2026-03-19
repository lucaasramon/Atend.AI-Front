import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Headphones, ArrowRight } from "lucide-react";

interface OnboardingChoiceProps {
  onChoose: (choice: 'self' | 'support') => void;
}

export default function OnboardingChoice({ onChoose }: OnboardingChoiceProps) {
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
                  Preencher Cadastro
                </h2>
                <p className="text-muted-foreground">
                  Preencha os dados da sua empresa e nosso time configura seu robô. 
                  Processo rápido e simples.
                </p>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Cadastro guiado passo a passo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Preencha os dados da sua empresa</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Rápido e simples</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Nosso suporte configura o robô para você</span>
                </li>
              </ul>

              <Button 
                onClick={() => onChoose('self')}
                className="w-full group-hover:bg-primary/90"
                size="lg"
              >
                Preencher Cadastro
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Support Setup */}
          <Card className="relative overflow-hidden border-2 hover:border-primary transition-all hover:shadow-lg cursor-pointer group">
            <CardContent className="p-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                <Headphones className="w-8 h-8 text-accent" />
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
                  <span className="text-accent mt-0.5">✓</span>
                  <span>Configuração feita por especialistas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">✓</span>
                  <span>Economize tempo e esforço</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">✓</span>
                  <span>Suporte personalizado via WhatsApp</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">✓</span>
                  <span>Robô otimizado para seu negócio</span>
                </li>
              </ul>

              <Button 
                onClick={() => onChoose('support')}
                variant="secondary"
                className="w-full group-hover:bg-secondary/90"
                size="lg"
              >
                Solicitar Suporte
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Você poderá sempre entrar em contato com nosso suporte para ajuda adicional
          </p>
        </div>
      </div>
    </div>
  );
}
