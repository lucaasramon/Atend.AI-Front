import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  MessageSquare,
  Shield,
  Zap,
  BarChart3,
  Users,
  Check,
  ArrowRight,
  Brain,
  Clock,
  HeadphonesIcon,
  Star,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "IA Personalizada",
    description: "Cada robô é treinado com a identidade da sua empresa. Respostas naturais e contextuais.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp 24/7",
    description: "Atendimento automático no WhatsApp, sem pausas. Seus clientes nunca ficam sem resposta.",
  },
  {
    icon: Brain,
    title: "Base de Conhecimento",
    description: "Upload de documentos e FAQs para que a IA conheça seu negócio profundamente.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Inteligente",
    description: "Acompanhe atendimentos, leads e métricas em tempo real no seu painel.",
  },
  {
    icon: Shield,
    title: "Segurança Total",
    description: "Proteção contra banimentos, monitoramento de risco e conformidade com as políticas do WhatsApp.",
  },
  {
    icon: Clock,
    title: "Setup em Minutos",
    description: "Conecte seu WhatsApp, configure o robô e comece a atender em menos de 10 minutos.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "R$ 89",
    description: "Ideal para quem está começando",
    features: [
      "1 número de WhatsApp",
      "Até 2.000 mensagens/mês",
      "Somente mensagens de texto",
      "Dashboard básico",
      "Templates de resposta",
      "Suporte por email",
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: "R$ 199",
    description: "Para negócios em crescimento",
    features: [
      "Até 3 canais (WhatsApp, Facebook, Instagram)",
      "Até 10.000 mensagens/mês",
      "Áudio e arquivos (enviar e receber)",
      "IA avançada + Base de conhecimento",
      "Dashboard completo + Gestão de Leads",
      "Análise de sentimento",
      "Templates de resposta",
      "Suporte prioritário",
    ],
    popular: true,
  },
  {
    name: "Business",
    price: "R$ 499",
    description: "Para operações de alto volume",
    features: [
      "Canais ilimitados (WhatsApp, Facebook, Instagram)",
      "Mensagens ilimitadas",
      "Áudio e arquivos (enviar e receber)",
      "IA premium + RAG completo",
      "API de integração + Webhooks",
      "Relatórios personalizados",
      "Gerente de conta dedicado",
      "SLA 99.9% uptime",
    ],
    popular: false,
  },
];

const testimonials = [
  {
    name: "Ricardo M.",
    company: "AutoPeças Express",
    text: "Reduzi 70% do tempo de atendimento. O robô responde dúvidas sobre peças melhor que meus vendedores!",
    rating: 5,
  },
  {
    name: "Camila F.",
    company: "Clínica Beleza Pura",
    text: "Agendamentos automáticos pelo WhatsApp. Minha recepcionista agora foca no atendimento presencial.",
    rating: 5,
  },
  {
    name: "Ana L.",
    company: "Imobiliária Lar Doce",
    text: "Os leads são capturados automaticamente. Nunca mais perdi um cliente por demora no atendimento.",
    rating: 5,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-lg object-contain" />
            <span className="text-xl font-bold tracking-tight">AtendIA</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Depoimentos</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login?tab=signup">Começar Grátis</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Automação inteligente de atendimento
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Seu atendimento no WhatsApp com{" "}
              <span className="text-primary">Inteligência Artificial</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Automatize seu atendimento, capture leads e nunca perca uma venda. 
              Robôs treinados com a identidade da sua empresa, funcionando 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="text-base px-8" asChild>
                <Link to="/login?tab=signup">
                  Começar Agora <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <a href="#features">Ver Recursos</a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Teste grátis por 7 dias • Sem cartão de crédito</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">Tudo que você precisa para escalar seu atendimento</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ferramentas poderosas para transformar seu WhatsApp em uma máquina de vendas e atendimento.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f) => (
              <Card key={f.title} className="border-border/50 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">Planos que cabem no seu bolso</h2>
            <p className="text-muted-foreground text-lg">Escolha o plano ideal para o tamanho do seu negócio.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.popular ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Mais Popular
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to={`/login?tab=signup&plan=${plan.name.toLowerCase()}`}>
                      Escolher {plan.name}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">O que nossos clientes dizem</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">"{t.text}"</p>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6 rounded-2xl bg-primary/5 border border-primary/20 p-12">
            <HeadphonesIcon className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-3xl font-bold">Pronto para automatizar seu atendimento?</h2>
            <p className="text-muted-foreground">
              Comece hoje e veja seus resultados em 24 horas. Sem complicação.
            </p>
            <Button size="lg" className="text-base px-8" asChild>
              <Link to="/login?tab=signup">
                Começar Gratuitamente <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-7 h-7 rounded-md object-contain" />
              <span className="font-semibold">AtendIA</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 AtendIA. Todos os direitos reservados.</p>
            <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Painel Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
