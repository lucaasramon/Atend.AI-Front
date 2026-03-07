import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, Check, Calendar, Sparkles, Zap, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 147,
    icon: Zap,
    features: ["1 número de WhatsApp", "Até 2.000 mensagens/mês", "Dashboard de atendimentos"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 297,
    icon: Sparkles,
    features: ["Até 3 números de WhatsApp", "Até 10.000 mensagens/mês", "IA avançada + Base de conhecimento", "Gestão de Leads"],
  },
  {
    id: "business",
    name: "Business",
    price: 497,
    icon: Rocket,
    features: ["Números ilimitados", "Mensagens ilimitadas", "IA avançada + Base de conhecimento", "Gestão de Leads", "API + Integrações", "Suporte prioritário"],
  },
];

export default function ClientBilling() {
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState("pro");
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [hasCard, setHasCard] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const activePlan = plans.find((p) => p.id === currentPlan)!;

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    setHasCard(true);
    toast({ title: "Cartão salvo!", description: "Suas cobranças automáticas estão ativas." });
  };

  const handleConfirmChangePlan = () => {
    if (!selectedPlan) return;
    const newPlan = plans.find((p) => p.id === selectedPlan)!;
    setCurrentPlan(selectedPlan);
    setChangePlanOpen(false);
    setSelectedPlan(null);
    toast({
      title: "Plano alterado!",
      description: `Seu plano foi alterado para ${newPlan.name} (R$ ${newPlan.price}/mês).`,
    });
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
                <p className="text-2xl font-bold">{activePlan.name}</p>
                <p className="text-muted-foreground text-sm">R$ {activePlan.price}/mês</p>
              </div>
              <Badge className="bg-success/10 text-success border-success/20">Ativo</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Próxima cobrança: 15/03/2026
            </div>
            <div className="space-y-2 text-sm">
              {activePlan.features.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" /> {f}
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setSelectedPlan(null); setChangePlanOpen(true); }}>
              Alterar Plano
            </Button>
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

      {/* Change Plan Dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
            <DialogDescription>Escolha o plano ideal para o seu negócio</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-3 gap-4 py-4">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const isSelected = plan.id === selectedPlan;
              const Icon = plan.icon;
              return (
                <button
                  key={plan.id}
                  onClick={() => !isCurrent && setSelectedPlan(plan.id)}
                  disabled={isCurrent}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : isCurrent
                        ? "border-muted bg-muted/50 opacity-60 cursor-not-allowed"
                        : "border-border hover:border-primary/40 hover:bg-accent/50"
                  }`}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-2 right-2 text-[10px] bg-muted-foreground/20 text-muted-foreground">Atual</Badge>
                  )}
                  <Icon className="w-6 h-6 text-primary mb-2" />
                  <p className="font-bold text-lg">{plan.name}</p>
                  <p className="text-sm text-muted-foreground mb-3">R$ {plan.price}/mês</p>
                  <div className="space-y-1.5">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 mt-0.5 text-success shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanOpen(false)}>Cancelar</Button>
            <Button disabled={!selectedPlan} onClick={handleConfirmChangePlan}>
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}