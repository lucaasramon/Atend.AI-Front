import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Headphones, Loader2, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const categories = [
  { value: "technical", label: "Problema técnico" },
  { value: "billing", label: "Pagamento / Cobrança" },
  { value: "config", label: "Configuração do robô" },
  { value: "feature", label: "Sugestão de funcionalidade" },
  { value: "other", label: "Outro" },
];

export default function SupportDialog() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !subject.trim() || !message.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const profile = await api.get<any>("/api/profiles/me");

      await api.post("/api/notifications/admin", {
        type: "support_ticket",
        user_name: profile?.full_name || "Não informado",
        company: profile?.company || "Não informado",
        phone: profile?.phone || "Não informado",
        onboarding_data: {
          category: categories.find((c) => c.value === category)?.label,
          subject,
          message,
        },
      });

      toast({ title: "Mensagem enviada! ✅", description: "Nosso suporte entrará em contato em breve." });
      setOpen(false);
      setCategory("");
      setSubject("");
      setMessage("");
    } catch (error) {
      console.error("Error sending support request:", error);
      toast({ title: "Erro ao enviar", description: "Tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Headphones className="w-4 h-4" />
          Suporte
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            Fale com o Suporte
          </DialogTitle>
          <DialogDescription>Envie sua dúvida ou problema e responderemos o mais rápido possível.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Resumo do problema" maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Descreva com detalhes..." rows={4} maxLength={1000} />
          </div>
          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {sending ? "Enviando..." : "Enviar mensagem"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
