export interface Client {
  id: string;
  name: string;
  company: string;
  status: "active" | "inactive" | "blocked";
  whatsappStatus: "online" | "offline";
  phone: string;
  plan: string;
  monthlyValue: number;
  dueDate: string;
  messagesThisMonth: number;
  tokensUsed: number;
  riskScore: number; // 0-100, ban risk
  createdAt: string;
  systemPrompt: string;
  variables: Record<string, string>;
}

export const mockClients: Client[] = [
  {
    id: "1",
    name: "Ricardo Mendes",
    company: "AutoPeças Express",
    status: "active",
    whatsappStatus: "online",
    phone: "+5511999001122",
    plan: "Pro",
    monthlyValue: 297,
    dueDate: "2026-03-15",
    messagesThisMonth: 4832,
    tokensUsed: 1240000,
    riskScore: 12,
    createdAt: "2025-08-10",
    systemPrompt: "Você é o assistente virtual da AutoPeças Express. Ajude clientes a encontrar peças automotivas, consultar preços e agendar serviços.",
    variables: {
      empresa: "AutoPeças Express",
      horario: "Seg-Sex 8h-18h, Sáb 8h-12h",
      transbordo: "+5511988776655",
    },
  },
  {
    id: "2",
    name: "Camila Ferreira",
    company: "Clínica Beleza Pura",
    status: "active",
    whatsappStatus: "online",
    phone: "+5521988334455",
    plan: "Business",
    monthlyValue: 497,
    dueDate: "2026-03-20",
    messagesThisMonth: 8210,
    tokensUsed: 2890000,
    riskScore: 5,
    createdAt: "2025-06-22",
    systemPrompt: "Você é a assistente da Clínica Beleza Pura. Agende consultas, tire dúvidas sobre procedimentos estéticos e informe sobre promoções.",
    variables: {
      empresa: "Clínica Beleza Pura",
      horario: "Seg-Sáb 9h-20h",
      transbordo: "+5521977665544",
    },
  },
  {
    id: "3",
    name: "Fernando Costa",
    company: "Pizzaria do Zé",
    status: "blocked",
    whatsappStatus: "offline",
    phone: "+5531977889900",
    plan: "Starter",
    monthlyValue: 147,
    dueDate: "2026-02-28",
    messagesThisMonth: 0,
    tokensUsed: 0,
    riskScore: 78,
    createdAt: "2025-11-05",
    systemPrompt: "Você é o atendente virtual da Pizzaria do Zé.",
    variables: {
      empresa: "Pizzaria do Zé",
      horario: "Ter-Dom 18h-23h",
      transbordo: "+5531966554433",
    },
  },
  {
    id: "4",
    name: "Ana Lúcia",
    company: "Imobiliária Lar Doce",
    status: "active",
    whatsappStatus: "offline",
    phone: "+5541966778899",
    plan: "Pro",
    monthlyValue: 297,
    dueDate: "2026-03-10",
    messagesThisMonth: 2156,
    tokensUsed: 580000,
    riskScore: 32,
    createdAt: "2025-09-18",
    systemPrompt: "Você é o corretor virtual da Imobiliária Lar Doce. Apresente imóveis disponíveis, agende visitas e responda dúvidas sobre financiamento.",
    variables: {
      empresa: "Imobiliária Lar Doce",
      horario: "Seg-Sex 8h-18h",
      transbordo: "+5541955443322",
    },
  },
  {
    id: "5",
    name: "João Pedro",
    company: "Academia Power Fit",
    status: "inactive",
    whatsappStatus: "offline",
    phone: "+5585955667788",
    plan: "Starter",
    monthlyValue: 147,
    dueDate: "2026-01-15",
    messagesThisMonth: 0,
    tokensUsed: 0,
    riskScore: 0,
    createdAt: "2025-12-01",
    systemPrompt: "Você é o assistente da Academia Power Fit.",
    variables: {
      empresa: "Academia Power Fit",
      horario: "Seg-Sáb 6h-22h",
      transbordo: "+5585944332211",
    },
  },
];

export const mockMessageData = [
  { date: "01 Mar", sent: 420, received: 380 },
  { date: "02 Mar", sent: 510, received: 445 },
  { date: "03 Mar", sent: 380, received: 350 },
  { date: "04 Mar", sent: 620, received: 580 },
  { date: "05 Mar", sent: 540, received: 490 },
  { date: "06 Mar", sent: 710, received: 650 },
];

export const mockErrorLogs = [
  { id: "1", timestamp: "2026-03-06 14:32:18", client: "AutoPeças Express", type: "TIMEOUT", message: "n8n webhook timeout após 30s", severity: "warning" as const },
  { id: "2", timestamp: "2026-03-06 13:15:42", client: "Clínica Beleza Pura", type: "API_ERROR", message: "Rate limit OpenAI atingido", severity: "danger" as const },
  { id: "3", timestamp: "2026-03-06 11:08:33", client: "Imobiliária Lar Doce", type: "WEBHOOK", message: "Webhook response 502 Bad Gateway", severity: "warning" as const },
  { id: "4", timestamp: "2026-03-05 22:45:10", client: "Pizzaria do Zé", type: "AUTH", message: "WhatsApp desconectado - sessão expirada", severity: "danger" as const },
];
