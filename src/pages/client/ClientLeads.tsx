import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Search, Download, Star, StarOff, MessageSquare, PauseCircle, PlayCircle, AlertTriangle, Bot, UserRound, Lock, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  from: "bot" | "client";
  text: string;
  time: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  date: string;
  saved: boolean;
  sentiment: "positive" | "neutral" | "negative";
  conversation: Message[];
  isPaused: boolean;
  pauseExpiresAt?: string;
  interventionSuggested: boolean;
}

const mockLeads: Lead[] = [
  {
    id: "1", name: "Maria Silva", phone: "+5511999112233", lastMessage: "Quero saber mais sobre o plano Pro", date: "2026-03-06 14:22", saved: true, sentiment: "positive", isPaused: false, interventionSuggested: false,
    conversation: [
      { id: "1a", from: "client", text: "Oi, boa tarde!", time: "14:20" },
      { id: "1b", from: "bot", text: "Olá Maria! Bem-vinda! Como posso te ajudar hoje? 😊", time: "14:20" },
      { id: "1c", from: "client", text: "Quero saber mais sobre o plano Pro", time: "14:21" },
      { id: "1d", from: "bot", text: "Claro! O plano Pro custa R$297/mês e inclui até 10.000 mensagens, IA avançada com GPT-4, relatórios detalhados e suporte prioritário. Quer que eu te envie mais detalhes?", time: "14:21" },
      { id: "1e", from: "client", text: "Sim, por favor! Parece ótimo", time: "14:22" },
      { id: "1f", from: "bot", text: "Perfeito! Vou encaminhar as informações completas. Um momento! 🚀", time: "14:22" },
    ],
  },
  {
    id: "2", name: "Carlos Souza", phone: "+5511988223344", lastMessage: "Qual o preço do serviço?", date: "2026-03-06 13:10", saved: false, sentiment: "neutral", isPaused: false, interventionSuggested: false,
    conversation: [
      { id: "2a", from: "client", text: "Qual o preço do serviço?", time: "13:10" },
      { id: "2b", from: "bot", text: "Olá Carlos! Temos 3 planos: Starter (R$147), Pro (R$297) e Business (R$497). Qual deles te interessa mais?", time: "13:10" },
    ],
  },
  {
    id: "3", name: "Juliana Alves", phone: "+5521977334455", lastMessage: "Não funcionou como esperado", date: "2026-03-06 11:45", saved: false, sentiment: "negative", isPaused: false, interventionSuggested: true,
    conversation: [
      { id: "3a", from: "client", text: "O bot parou de responder ontem à noite", time: "11:40" },
      { id: "3b", from: "bot", text: "Olá Juliana! Peço desculpas pelo inconveniente. Vou verificar o que aconteceu. Pode me dizer por volta de que horas foi?", time: "11:41" },
      { id: "3c", from: "client", text: "Foi por volta das 22h. Não funcionou como esperado", time: "11:43" },
      { id: "3d", from: "bot", text: "Entendi. Vou registrar isso e encaminhar para nossa equipe técnica. Você receberá um retorno em breve. Desculpe novamente! 🙏", time: "11:45" },
    ],
  },
  {
    id: "4", name: "Pedro Santos", phone: "+5531966445566", lastMessage: "Adorei o atendimento!", date: "2026-03-05 18:30", saved: true, sentiment: "positive", isPaused: true, pauseExpiresAt: "2026-03-06 20:30", interventionSuggested: false,
    conversation: [
      { id: "4a", from: "client", text: "Adorei o atendimento!", time: "18:30" },
      { id: "4b", from: "bot", text: "Que bom ouvir isso, Pedro! Ficamos felizes em ajudar. Qualquer coisa, estamos aqui! 💚", time: "18:30" },
    ],
  },
  {
    id: "5", name: "Fernanda Lima", phone: "+5541955556677", lastMessage: "Vocês têm desconto para anual?", date: "2026-03-05 16:15", saved: false, sentiment: "neutral", isPaused: false, interventionSuggested: false,
    conversation: [
      { id: "5a", from: "client", text: "Vocês têm desconto para anual?", time: "16:15" },
      { id: "5b", from: "bot", text: "Oi Fernanda! Sim, oferecemos 20% de desconto para planos anuais. Quer que eu simule o valor para algum plano específico?", time: "16:15" },
      { id: "5c", from: "client", text: "Sim, para o Business", time: "16:16" },
      { id: "5d", from: "bot", text: "No plano Business anual, o valor sai por R$397/mês (total de R$4.764/ano). Uma economia de R$1.200! Quer prosseguir?", time: "16:16" },
    ],
  },
];

const sentimentConfig = {
  positive: { label: "Positivo", variant: "default" as const, className: "bg-success/10 text-success border-success/20" },
  neutral: { label: "Neutro", variant: "secondary" as const, className: "" },
  negative: { label: "Negativo", variant: "destructive" as const, className: "" },
};

const pauseDurations = [
  { value: "30", label: "30 minutos" },
  { value: "60", label: "1 hora" },
  { value: "120", label: "2 horas" },
  { value: "indefinite", label: "Indeterminado" },
];

export default function ClientLeads() {
  const [leads, setLeads] = useState(mockLeads);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [pauseDialogLead, setPauseDialogLead] = useState<Lead | null>(null);
  const [pauseDuration, setPauseDuration] = useState("30");
  const { toast } = useToast();

  const filtered = leads.filter(
    (l) => l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)
  );

  const toggleSaved = (id: string) => {
    setLeads(leads.map((l) => (l.id === id ? { ...l, saved: !l.saved } : l)));
  };

  const handlePause = (lead: Lead) => {
    if (lead.isPaused) {
      // Resume
      setLeads(leads.map((l) => l.id === lead.id ? { ...l, isPaused: false, pauseExpiresAt: undefined } : l));
      toast({ title: "Robô retomado", description: `IA reativada para ${lead.name}` });
    } else {
      setPauseDialogLead(lead);
    }
  };

  const confirmPause = () => {
    if (!pauseDialogLead) return;
    const expiresAt = pauseDuration === "indefinite"
      ? undefined
      : new Date(Date.now() + parseInt(pauseDuration) * 60 * 1000).toISOString();

    setLeads(leads.map((l) =>
      l.id === pauseDialogLead.id ? { ...l, isPaused: true, pauseExpiresAt: expiresAt } : l
    ));
    toast({
      title: "Robô pausado",
      description: `IA pausada para ${pauseDialogLead.name} — ${pauseDurations.find(d => d.value === pauseDuration)?.label}`,
    });
    setPauseDialogLead(null);
    setPauseDuration("30");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Contatos que interagiram com seu WhatsApp</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" /> Exportar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou telefone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="hidden md:table-cell">Última Mensagem</TableHead>
                <TableHead>Sentimento</TableHead>
                <TableHead>Status IA</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-12">Conversa</TableHead>
                <TableHead className="w-12">Pausa</TableHead>
                <TableHead className="w-12">Salvar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => {
                const sentiment = sentimentConfig[lead.sentiment];
                return (
                  <TableRow key={lead.id} className={lead.interventionSuggested ? "bg-warning/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {lead.name}
                        {lead.interventionSuggested && (
                          <AlertTriangle className="w-4 h-4 text-warning" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{lead.phone}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {lead.lastMessage}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sentiment.variant} className={sentiment.className}>
                        {sentiment.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.isPaused ? (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          <UserRound className="w-3 h-3 mr-1" />
                          Pausa Humana
                        </Badge>
                      ) : lead.interventionSuggested ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Intervenção Sugerida
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          <Bot className="w-3 h-3 mr-1" />
                          IA Ativa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{lead.date}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedLead(lead)}>
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePause(lead)}
                        title={lead.isPaused ? "Retomar IA" : "Pausar IA"}
                      >
                        {lead.isPaused ? (
                          <PlayCircle className="w-4 h-4 text-success" />
                        ) : (
                          <PauseCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleSaved(lead.id)}>
                        {lead.saved ? (
                          <Star className="w-4 h-4 fill-warning text-warning" />
                        ) : (
                          <StarOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pause Duration Dialog */}
      <Dialog open={!!pauseDialogLead} onOpenChange={(open) => !open && setPauseDialogLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-warning" />
              Pausar robô para {pauseDialogLead?.name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              A IA será pausada e o contato não receberá respostas automáticas durante o período selecionado.
            </p>
          </DialogHeader>

          <RadioGroup value={pauseDuration} onValueChange={setPauseDuration} className="space-y-3 py-2">
            {pauseDurations.map((d) => (
              <div key={d.value} className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={d.value} id={`pause-${d.value}`} />
                <Label htmlFor={`pause-${d.value}`} className="cursor-pointer flex-1 text-sm">
                  {d.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseDialogLead(null)}>Cancelar</Button>
            <Button onClick={confirmPause} className="bg-warning text-warning-foreground hover:bg-warning/90">
              <PauseCircle className="w-4 h-4 mr-2" /> Pausar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversation Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversa com {selectedLead?.name}
              {selectedLead?.isPaused && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 ml-2">
                  <UserRound className="w-3 h-3 mr-1" /> Pausa Humana
                </Badge>
              )}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedLead?.phone} · {selectedLead?.date}</p>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3 py-2">
              {selectedLead?.conversation.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === "bot" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.from === "bot"
                        ? "bg-muted text-foreground rounded-bl-md"
                        : "bg-primary text-primary-foreground rounded-br-md"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className={`text-[10px] mt-1 block ${msg.from === "bot" ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          {selectedLead && !selectedLead.isPaused && (
            <div className="pt-2 border-t border-border">
              <Button variant="outline" size="sm" className="w-full" onClick={() => {
                setSelectedLead(null);
                handlePause(selectedLead);
              }}>
                <PauseCircle className="w-4 h-4 mr-2" /> Pausar robô para este contato
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
