import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, MessageSquare, BarChart3, Zap, Users, FileText, BookOpen, Shield } from "lucide-react";

const sections = [
  {
    title: "Primeiros Passos",
    icon: Zap,
    items: [
      { q: "Como funciona o D.Sync?", a: "O D.Sync é um robô de atendimento via WhatsApp que responde automaticamente às mensagens dos seus clientes usando inteligência artificial. Ele captura leads, analisa sentimentos e pode ser personalizado com sua base de conhecimento." },
      { q: "Como meu robô é configurado?", a: "Após completar o cadastro, nossa equipe de suporte entra em contato para configurar o robô com suas informações, tom de voz e integrações necessárias." },
      { q: "Quanto tempo leva para ativar?", a: "Em média, a ativação completa leva de 24 a 48 horas úteis após a conclusão do onboarding." },
    ],
  },
  {
    title: "Dashboard e Métricas",
    icon: BarChart3,
    items: [
      { q: "O que significam as métricas do dashboard?", a: "O dashboard mostra: Total de Leads (contatos capturados), Mensagens Enviadas/Recebidas (volume de conversas), Pausas Ativas (conversas com intervenção humana), Taxa de Resolução e Sentimento Geral dos leads." },
      { q: "Posso filtrar por período?", a: "Sim! Use as abas de 7, 14 ou 30 dias no topo do dashboard para filtrar todas as métricas e gráficos." },
      { q: "Como exportar relatórios?", a: "Clique no botão 'Exportar' no dashboard e escolha entre exportar Leads, Mensagens ou Templates em formato CSV." },
    ],
  },
  {
    title: "Leads",
    icon: Users,
    items: [
      { q: "O que é um lead?", a: "Lead é cada pessoa que entra em contato com o seu robô pelo WhatsApp. O sistema captura automaticamente nome, telefone e histórico de conversa." },
      { q: "O que é análise de sentimento?", a: "O sistema analisa o tom das mensagens e classifica como Positivo, Neutro ou Negativo, ajudando a priorizar atendimentos." },
      { q: "Posso ver as conversas do lead?", a: "Sim! Clique em qualquer lead na lista para ver o histórico completo de mensagens trocadas." },
    ],
  },
  {
    title: "Templates",
    icon: FileText,
    items: [
      { q: "Para que servem os templates?", a: "Templates são respostas prontas que você cria para o robô usar em situações específicas, como saudações, FAQ ou respostas padrão." },
      { q: "Como criar um template?", a: "Acesse a página de Templates, clique em 'Novo Template', defina um atalho (ex: /horario), o conteúdo da resposta e a categoria." },
    ],
  },
  {
    title: "Base de Conhecimento",
    icon: BookOpen,
    items: [
      { q: "O que é a Base de Conhecimento?", a: "É uma coleção de perguntas e respostas que você cadastra para o robô usar como referência ao responder seus clientes." },
      { q: "Preciso cadastrar muitas perguntas?", a: "Comece com as 10-20 perguntas mais frequentes. Você pode ir adicionando conforme identifica novas dúvidas dos seus clientes." },
    ],
  },
  {
    title: "Planos e Pagamento",
    icon: Shield,
    items: [
      { q: "Quais são os planos disponíveis?", a: "Oferecemos três planos: Starter (R$89/mês), Pro (R$199/mês) e Business (R$499/mês). Cada plano tem diferentes limites e funcionalidades." },
      { q: "Como alterar meu plano?", a: "Acesse a página de Pagamento no menu lateral e clique em 'Alterar Plano' para fazer upgrade ou downgrade." },
      { q: "Posso cancelar a qualquer momento?", a: "Sim, você pode cancelar seu plano a qualquer momento. O acesso continua até o fim do período pago." },
    ],
  },
];

export default function ClientHelp() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" />
          Central de Ajuda
        </h1>
        <p className="text-muted-foreground">Tire suas dúvidas sobre o D.Sync</p>
      </div>

      <div className="grid gap-4">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Accordion type="multiple">
                  {section.items.map((item, j) => (
                    <AccordionItem key={j} value={`${i}-${j}`}>
                      <AccordionTrigger className="text-sm text-left hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
