export const STRIPE_PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 89,
    price_id: "price_1T89WBGSbMQCs2fBEEJ5hVtR",
    features: [
      "1 número de WhatsApp",
      "Até 2.000 mensagens/mês",
      "Somente mensagens de texto",
      "Dashboard básico",
      "Templates de resposta",
      "Suporte por email",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 199,
    price_id: "price_1T89XTGSbMQCs2fB5vf5bT9R",
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
  },
  business: {
    id: "business",
    name: "Business",
    price: 499,
    price_id: "price_1T89XrGSbMQCs2fB8dKrIYMr",
    features: [
      "Canais ilimitados (WhatsApp, Facebook, Instagram)",
      "Mensagens ilimitadas",
      "Áudio e arquivos (enviar e receber)",
      "IA premium + RAG completo",
      "Dashboard completo + Gestão de Leads",
      "Análise de sentimento avançada",
      "API de integração + Webhooks",
      "Relatórios personalizados",
      "Gerente de conta dedicado",
      "SLA 99.9% uptime",
    ],
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

export function getPlanByPriceId(priceId: string): (typeof STRIPE_PLANS)[PlanId] | undefined {
  return Object.values(STRIPE_PLANS).find((p) => p.price_id === priceId);
}
