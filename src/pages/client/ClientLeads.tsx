import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Search, Download, Star, StarOff, MessageSquare, PauseCircle, PlayCircle, AlertTriangle, Bot, UserRound, Lock, Sparkles, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Pagination from "@/components/Pagination";
import { useToast } from "@/hooks/use-toast";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface LeadRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string | null;
  sentiment: string | null;
  notes: string | null;
  source: string | null;
  saved: boolean;
  last_message_at: string | null;
  created_at: string;
}

interface Interruption {
  id: string;
  remote_jid: string;
  is_active: boolean;
  expires_at: string | null;
  reason: string | null;
}

interface Message {
  id: string;
  from_me: boolean;
  content: string;
  created_at: string;
}

const sentimentConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; className: string }> = {
  positive: { label: "Positivo", variant: "default", className: "bg-success/10 text-success border-success/20" },
  neutral: { label: "Neutro", variant: "secondary", className: "" },
  negative: { label: "Negativo", variant: "destructive", className: "" },
};

const pauseDurations = [
  { value: "30", label: "30 minutos" },
  { value: "60", label: "1 hora" },
  { value: "120", label: "2 horas" },
  { value: "indefinite", label: "Indeterminado" },
];

const PAGE_SIZE = 20;

export default function ClientLeads() {
  const { canAccessLeads, loading: featuresLoading } = usePlanFeatures();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [interruptions, setInterruptions] = useState<Interruption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [pauseDialogLead, setPauseDialogLead] = useState<LeadRow | null>(null);
  const [pauseDuration, setPauseDuration] = useState("30");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [leadsRes, intRes] = await Promise.all([
        supabase.from("leads").select("*").eq("tenant_id", user.id).order("created_at", { ascending: false }),
        supabase.from("robot_interruptions").select("id, remote_jid, is_active, expires_at, reason").eq("tenant_id", user.id).eq("is_active", true),
      ]);
      setLeads((leadsRes.data as any[] || []).map(l => ({ ...l, saved: l.saved ?? false })));
      setInterruptions(intRes.data || []);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (lead: LeadRow) => {
    setMessagesLoading(true);
    try {
      const { data } = await (supabase as any).from("messages").select("id, from_me, content, created_at")
        .eq("tenant_id", user!.id)
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: true })
        .limit(100);
      setMessages(data || []);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  if (!featuresLoading && !canAccessLeads) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Contatos que interagiram com seu WhatsApp</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lock className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Recurso disponível no plano Pro</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              A gestão de leads com análise de sentimento e controle de pausas está disponível a partir do plano Pro.
            </p>
            <Button onClick={() => navigate("/client/billing")} className="gap-2">
              <Sparkles className="w-4 h-4" /> Fazer Upgrade
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLeadPaused = (lead: LeadRow) => {
    return interruptions.some(i => i.remote_jid === lead.phone && i.is_active);
  };

  const isNegativeSentiment = (lead: LeadRow) => lead.sentiment === "negative";

  const filtered = leads.filter(
    (l) => l.name.toLowerCase().includes(search.toLowerCase()) || (l.phone || "").includes(search)
  );

  const toggleSaved = async (lead: LeadRow) => {
    const newSaved = !lead.saved;
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, saved: newSaved } : l));
    await supabase.from("leads").update({ saved: newSaved } as any).eq("id", lead.id);
  };

  const handlePause = (lead: LeadRow) => {
    if (isLeadPaused(lead)) {
      // Resume
      resumeLead(lead);
    } else {
      setPauseDialogLead(lead);
    }
  };

  const resumeLead = async (lead: LeadRow) => {
    try {
      await supabase
        .from("robot_interruptions")
        .update({ is_active: false })
        .eq("tenant_id", user!.id)
        .eq("remote_jid", lead.phone || "");
      setInterruptions(prev => prev.filter(i => i.remote_jid !== lead.phone));
      toast({ title: "Robô retomado", description: `IA reativada para ${lead.name}` });
    } catch {
      toast({ title: "Erro ao retomar", variant: "destructive" });
    }
  };

  const confirmPause = async () => {
    if (!pauseDialogLead || !user) return;
    const expiresAt = pauseDuration === "indefinite"
      ? null
      : new Date(Date.now() + parseInt(pauseDuration) * 60 * 1000).toISOString();

    try {
      const { data, error } = await supabase.from("robot_interruptions").insert({
        tenant_id: user.id,
        remote_jid: pauseDialogLead.phone || "",
        contact_name: pauseDialogLead.name,
        reason: "Pausa manual pelo painel",
        expires_at: expiresAt,
        created_by: user.id,
      }).select().single();

      if (error) throw error;
      setInterruptions(prev => [...prev, data as any]);
      toast({
        title: "Robô pausado",
        description: `IA pausada para ${pauseDialogLead.name} — ${pauseDurations.find(d => d.value === pauseDuration)?.label}`,
      });
    } catch {
      toast({ title: "Erro ao pausar", variant: "destructive" });
    }
    setPauseDialogLead(null);
    setPauseDuration("30");
  };

  const exportCSV = () => {
    const headers = ["Nome", "Telefone", "Email", "Sentimento", "Status", "Data"];
    const rows = leads.map(l => [
      l.name,
      l.phone || "",
      l.email || "",
      l.sentiment || "",
      l.status || "",
      new Date(l.created_at).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado!", description: `${leads.length} leads exportados.` });
  };

  const openConversation = (lead: LeadRow) => {
    setSelectedLead(lead);
    loadMessages(lead);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Contatos que interagiram com seu WhatsApp</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={leads.length === 0}>
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
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">{search ? "Nenhum lead encontrado" : "Nenhum lead capturado ainda"}</p>
              <p className="text-xs mt-1">Leads serão exibidos conforme seu robô interagir com contatos.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
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
                  const sentiment = sentimentConfig[lead.sentiment || "neutral"] || sentimentConfig.neutral;
                  const paused = isLeadPaused(lead);
                  const negative = isNegativeSentiment(lead);
                  return (
                    <TableRow key={lead.id} className={negative ? "bg-warning/5" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {lead.name}
                          {negative && <AlertTriangle className="w-4 h-4 text-warning" />}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{lead.phone || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{lead.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={sentiment.variant} className={sentiment.className}>
                          {sentiment.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {paused ? (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            <UserRound className="w-3 h-3 mr-1" /> Pausa Humana
                          </Badge>
                        ) : negative ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Intervenção Sugerida
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            <Bot className="w-3 h-3 mr-1" /> IA Ativa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openConversation(lead)}>
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePause(lead)} title={paused ? "Retomar IA" : "Pausar IA"}>
                          {paused ? <PlayCircle className="w-4 h-4 text-success" /> : <PauseCircle className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleSaved(lead)}>
                          {lead.saved ? <Star className="w-4 h-4 fill-warning text-warning" /> : <StarOff className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
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
                <Label htmlFor={`pause-${d.value}`} className="cursor-pointer flex-1 text-sm">{d.label}</Label>
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
              {selectedLead && isLeadPaused(selectedLead) && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 ml-2">
                  <UserRound className="w-3 h-3 mr-1" /> Pausa Humana
                </Badge>
              )}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedLead?.phone} · {selectedLead && new Date(selectedLead.created_at).toLocaleDateString("pt-BR")}</p>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : messages.length > 0 ? (
              <div className="space-y-3 py-2">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from_me ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.from_me
                        ? "bg-muted text-foreground rounded-bl-md"
                        : "bg-primary text-primary-foreground rounded-br-md"
                    }`}>
                      <p>{msg.content}</p>
                      <span className={`text-[10px] mt-1 block ${msg.from_me ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma mensagem registrada</p>
                <p className="text-xs mt-1">As mensagens aparecerão conforme seu robô processar conversas.</p>
              </div>
            )}
          </ScrollArea>
          {selectedLead && !isLeadPaused(selectedLead) && (
            <div className="pt-2 border-t border-border">
              <Button variant="outline" size="sm" className="w-full" onClick={() => {
                const lead = selectedLead;
                setSelectedLead(null);
                handlePause(lead);
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

function Users2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
