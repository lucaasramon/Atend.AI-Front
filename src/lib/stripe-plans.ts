export const STRIPE_PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 147,
    price_id: "price_1T89WBGSbMQCs2fBEEJ5hVtR",
    features: ["1 número de WhatsApp", "Até 2.000 mensagens/mês", "Dashboard de atendimentos"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 297,
    price_id: "price_1T89XTGSbMQCs2fB5vf5bT9R",
    features: ["Até 3 números de WhatsApp", "Até 10.000 mensagens/mês", "IA avançada + Base de conhecimento", "Gestão de Leads"],
  },
  business: {
    id: "business",
    name: "Business",
    price: 497,
    price_id: "price_1T89XrGSbMQCs2fB8dKrIYMr",
    features: ["Números ilimitados", "Mensagens ilimitadas", "IA avançada + Base de conhecimento", "Gestão de Leads", "API + Integrações", "Suporte prioritário"],
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

export function getPlanByPriceId(priceId: string): (typeof STRIPE_PLANS)[PlanId] | undefined {
  return Object.values(STRIPE_PLANS).find((p) => p.price_id === priceId);
}
