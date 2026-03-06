import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClientBilling() {
  const { toast } = useToast();
  const [hasCard, setHasCard] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with Stripe
    setHasCard(true);
    toast({ title: "Cartão salvo!", description: "Suas cobranças automáticas estão ativas." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pagamento</h1>
        <p className="text-muted-foreground">Gerencie seu plano e método de pagamento</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plano Atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">Pro</p>
                <p className="text-muted-foreground text-sm">R$ 297/mês</p>
              </div>
              <Badge className="bg-success/10 text-success border-success/20">Ativo</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Próxima cobrança: 15/03/2026
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Até 3 números de WhatsApp</div>
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Até 10.000 mensagens/mês</div>
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> IA avançada + Base de conhecimento</div>
            </div>
            <Button variant="outline" className="w-full">Alterar Plano</Button>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Método de Pagamento
            </CardTitle>
            <CardDescription>
              {hasCard ? "Cartão cadastrado para cobranças automáticas" : "Adicione um cartão para cobranças automáticas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCard ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium text-sm">•••• •••• •••• 4242</p>
                    <p className="text-xs text-muted-foreground">Expira 12/2028</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setHasCard(false)}>
                  Trocar Cartão
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSaveCard} className="space-y-4">
                <div className="space-y-2">
                  <Label>Número do cartão</Label>
                  <Input placeholder="0000 0000 0000 0000" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Nome no cartão</Label>
                  <Input placeholder="Como está no cartão" value={cardName} onChange={(e) => setCardName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Validade</Label>
                    <Input placeholder="MM/AA" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>CVC</Label>
                    <Input placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full">Salvar Cartão</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "15/02/2026", amount: "R$ 297,00", status: "Pago" },
              { date: "15/01/2026", amount: "R$ 297,00", status: "Pago" },
              { date: "15/12/2025", amount: "R$ 297,00", status: "Pago" },
            ].map((inv) => (
              <div key={inv.date} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{inv.date}</p>
                  <p className="text-xs text-muted-foreground">Plano Pro</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{inv.amount}</span>
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
