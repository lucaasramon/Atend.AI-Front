// Explicação de cada tela do painel: para que serve, quem acessa e o que dá para fazer

export interface PageHelp {
  purpose: string;
  who: string;
  actions?: string[];
}

const ALL = "Administrador, Agenda e Visualizador (o Visualizador só consulta).";
const ADMIN = "Somente Administrador.";

const HELP: Record<string, PageHelp> = {
  "/admin": {
    purpose: "Visão geral do sistema de atendimento por IA: clientes cadastrados, situação dos robôs e avisos recentes.",
    who: ADMIN,
  },
  "/admin/clients": {
    purpose: "Lista dos clientes do atendimento por IA no WhatsApp (empresas que usam o robô de atendimento).",
    who: ADMIN,
    actions: ["Cadastrar cliente", "Conectar o WhatsApp do cliente pelo QR code", "Ver o status da conexão"],
  },
  "/admin/clients/": {
    purpose: "Detalhes de um cliente do atendimento por IA: dados, plano, instância do WhatsApp e configurações do robô.",
    who: ADMIN,
  },
  "/admin/agenda": {
    purpose:
      "Central dos eventos da igreja. Tudo o que é cadastrado aqui entra no calendário e o robô D.Sync avisa nos grupos do WhatsApp antes de cada evento.",
    who: ALL,
    actions: [
      "Criar, editar e excluir eventos das suas áreas (todos veem os eventos de todas as áreas)",
      "Montar o checklist de cada evento (buffet, som, decoração...) com responsáveis e prazos",
      "Importar o calendário do ano por planilha",
      "Ver a prévia das mensagens e os próximos lembretes",
      "Admin: configurar lembretes e resumos, liberar grupos e editar modelos de checklist",
    ],
  },
  "/admin/calendario": {
    purpose: "Calendário com todos os eventos, por mês ou pelo ano inteiro. As cores indicam o tipo de evento.",
    who: ALL,
    actions: ["Alternar entre Mês e Ano", "Clicar em um evento para ver os detalhes", "Filtrar por categoria clicando na legenda"],
  },
  "/admin/locais": {
    purpose: "Mostra se cada espaço da igreja (Templo, sala das crianças...) está livre ou ocupado em cada dia da semana.",
    who: ALL,
    actions: ["Navegar entre as semanas", "Admin: cadastrar, renomear e desativar locais"],
  },
  "/admin/pops": {
    purpose:
      "Procedimentos padrão (POPs) dos ministérios, como a rotina da mídia. Os POPs com repetição são enviados no grupo do ministério no dia programado.",
    who: ALL,
    actions: ["Marcar os passos feitos hoje", "Ver o histórico de execuções", "Admin: cadastrar POPs e enviar no grupo na hora"],
  },
  "/admin/escalas": {
    purpose:
      "Quem serve em cada culto e em qual área. Na véspera, cada escalado recebe no WhatsApp o checklist da sua área e marca os itens pelo celular.",
    who: ALL,
    actions: [
      "Ver os próximos eventos com a escala de todas as áreas",
      "Criar escala: escolher evento e área, marcar as pessoas e o que cada uma vai fazer",
      "Usuários da plataforma já aparecem como membros, com as suas áreas",
      "Cadastrar quem serve sem usar o sistema e as funções (com POP) de cada área",
      "A escala também aparece ao abrir o evento na Agenda e no Calendário",
    ],
  },
  "/admin/pregacoes": {
    purpose:
      "Esboço das pregações em blocos (introdução, pontos, ilustração, apelo) com versículos e tempo de cada parte, e o painel do púlpito para pregar pelo celular ou tablet.",
    who: "Cada pastor vê e edita as suas pregações. O líder da Mídia vê as de todos (só leitura) para preparar a projeção.",
    actions: [
      "Criar a pregação e ligar ao culto da Agenda",
      "Em cada bloco: texto principal, versículos (cole o texto), anotações e minutos planejados",
      "Púlpito: tela sempre acesa, letras grandes, toque nas laterais para passar de bloco, relógio do bloco e total",
      "Funciona sem internet: abra a pregação uma vez com internet antes do culto",
      "Histórico: quando e quanto tempo levou cada pregação",
    ],
  },
  "/admin/inscricoes": {
    purpose:
      "Formulários de inscrição dos eventos (retiro, curso, conferência). Cada formulário tem um link e um QR code; quem se inscreve aparece na lista na hora.",
    who: "Administrador e Agenda (Agenda só nos eventos das suas áreas).",
    actions: [
      "Criar formulário: escolher o evento, limite de vagas, prazo e perguntas extras (camiseta, alergia...)",
      "Compartilhar o link no WhatsApp ou projetar o QR code",
      "Acompanhar inscritos e lista de espera (a lista atualiza sozinha)",
      "Abrir/fechar inscrições, remover inscritos e baixar a planilha",
      "Na Agenda, o botão de prancheta em cada evento abre ou cria o formulário",
    ],
  },
  "/admin/cadastros": {
    purpose:
      "Cadastro de membros, frequentadores e visitantes feito pela própria pessoa, por um link (sem login). Se a pessoa preencher de novo com o mesmo WhatsApp, os dados são atualizados.",
    who: ADMIN,
    actions: [
      "Compartilhar o link ou o QR code do cadastro",
      "Filtrar novos, visitantes, frequentadores, membros e aniversariantes do mês",
      "Ver os dados, o pedido de oração e chamar no WhatsApp",
      "Incluir a pessoa nas Escalas (vira membro com as áreas que ela escolheu)",
      "Parabéns automáticos: o robô manda no WhatsApp de cada aniversariante do dia uma mensagem da igreja com um versículo",
      "Baixar a planilha",
    ],
  },
  "/admin/midia": {
    purpose:
      "Demandas da equipe de mídia (posts, artes, captações, gravações) com prazos, responsáveis e briefing. O robô lembra o responsável 2 dias antes e no dia do prazo.",
    who: ALL,
    actions: [
      "Criar demandas do grupo ou de uma pessoa",
      "Mudar o status: A fazer → Em produção → Em revisão → Entregue",
      "Gerar o pacote de demandas a partir de um evento",
    ],
  },
  "/admin/confirmacoes": {
    purpose:
      "Acompanha se os líderes confirmaram que viram os eventos do seu ministério. Sem confirmação no prazo, o pastor responsável é avisado; depois, os administradores.",
    who: ADMIN,
    actions: ["Ver quem confirmou e quem está pendente", "Ajustar o prazo de cada nível", "Ligar ou desligar os pedidos de confirmação"],
  },
  "/admin/aprovacoes": {
    purpose:
      "Eventos cadastrados pela equipe que esperam aprovação. Só depois de aprovados eles entram nos lembretes e no calendário público.",
    who: ADMIN,
    actions: ["Aprovar (vale para todas as datas de um evento que se repete)", "Recusar informando o motivo; quem cadastrou é avisado no WhatsApp"],
  },
  "/admin/ministerios": {
    purpose:
      "Cadastro dos ministérios. Cada um pode ter um grupo do WhatsApp (que recebe só os avisos dos seus eventos), um líder e um pastor responsável.",
    who: ADMIN,
    actions: ["Cadastrar ministérios", "Definir grupo, líder, pastor e cor", "Marcar qual é o ministério de Mídia"],
  },
  "/admin/usuarios": {
    purpose:
      "Quem pode entrar no sistema. Ao cadastrar, a pessoa recebe no WhatsApp o link de acesso, o login e uma senha temporária.",
    who: ADMIN,
    actions: [
      "Perfis: Administrador (tudo), Agenda (edita eventos) e Visualizador (só vê)",
      "Função na igreja (Pastor(a), Líder, Voluntário(a)...) e áreas da pessoa",
      "Quem tem perfil Agenda só cria e edita eventos das suas áreas",
      "Reenviar o acesso quando o link expirar",
      "Editar e excluir usuários",
    ],
  },
  "/admin/notifications": {
    purpose: "Avisos do sistema de atendimento por IA para os administradores (novos clientes, pedidos de suporte etc.).",
    who: ADMIN,
  },
  "/admin/audit": {
    purpose: "Histórico das ações feitas pelos administradores (quem fez o quê e quando), para conferência.",
    who: ADMIN,
  },
  "/admin/health": {
    purpose: "Monitoramento da infraestrutura do atendimento por IA: robôs pausados, interrupções e situação dos serviços.",
    who: ADMIN,
  },
  "/admin/settings": {
    purpose: "Configurações gerais do sistema de atendimento por IA.",
    who: ADMIN,
  },
};

/** Explicação da tela atual (rotas com parâmetro usam o prefixo, ex.: /admin/clients/:id) */
export function helpFor(path: string): PageHelp | null {
  if (HELP[path]) return HELP[path];
  const prefix = Object.keys(HELP)
    .filter((k) => k.endsWith("/") && path.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? HELP[prefix] : null;
}
