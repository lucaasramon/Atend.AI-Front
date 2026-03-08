import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Check, Calendar, Sparkles, Zap, Rocket, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { STRIPE_PLANS, PlanId } from "@/lib/stripe-plans";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

const planIcons: Record<PlanId, typeof Zap> = { starter: Zap, pro: Sparkles, business: Rocket };
const plansArray = Object.values(STRIPE_PLANS);

export default function ClientBilling() {
  const { toast } = useToast();
  const { subscribed, planId, subscriptionEnd, loading, refresh } = useSubscription();
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle success/cancel from Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "Pagamento realizado!", description: "Sua assinatura está sendo processada." });
      refresh();
      setSearchParams({});
    } else if (searchParams.get("canceled") === "true") {
      toast({ title: "Checkout cancelado", variant: "destructive" });
      setSearchParams({});
    }
  }, [searchParams]);

  // Auto-checkout when coming from plan selection
  useEffect(() => {
    const autoCheckoutPlan = searchParams.get("auto_checkout") as PlanId | null;
    if (autoCheckoutPlan && STRIPE_PLANS[autoCheckoutPlan] && !loading && !subscribed) {
      setSearchParams({});
      handleCheckout(STRIPE_PLANS[autoCheckoutPlan].price_id);
    }
  }, [loading, subscribed]);

  const currentPlan = planId as PlanId | null;
  const activePlan = currentPlan ? STRIPE_PLANS[currentPlan] : null;

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Erro ao iniciar checkout", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
      setChangePlanOpen(false);
      setSelectedPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Erro ao abrir portal", description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
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
      <div>
        <h1 className="text-2xl font-bold">Pagamento</h1>
        <p className="text-muted-foreground">Gerencie seu plano e assinatura</p>
      </div>

      {subscribed && activePlan ? (
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
            {subscriptionEnd && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Próxima cobrança: {new Date(subscriptionEnd).toLocaleDateString("pt-BR")}
              </div>
            )}
            <div className="space-y-2 text-sm">
              {activePlan.features.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" /> {f}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setSelectedPlan(null); setChangePlanOpen(true); }}>
                Alterar Plano
              </Button>
              <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                Gerenciar Assinatura
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Escolha seu plano</CardTitle>
            <CardDescription>Selecione o plano ideal para o seu negócio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {plansArray.map((plan) => {
                const Icon = planIcons[plan.id as PlanId];
                return (
                  <button
                    key={plan.id}
                    onClick={() => handleCheckout(plan.price_id)}
                    disabled={checkoutLoading}
                    className="rounded-xl border-2 border-border hover:border-primary/40 hover:bg-accent/50 p-4 text-left transition-all"
                  >
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
          </CardContent>
        </Card>
      )}

      {/* Change Plan Dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
            <DialogDescription>Escolha o plano ideal para o seu negócio</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-3 gap-4 py-4">
            {plansArray.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const isSelected = plan.id === selectedPlan;
              const Icon = planIcons[plan.id as PlanId];
              return (
                <button
                  key={plan.id}
                  onClick={() => !isCurrent && setSelectedPlan(plan.id as PlanId)}
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
            <Button
              disabled={!selectedPlan || checkoutLoading}
              onClick={() => selectedPlan && handleCheckout(STRIPE_PLANS[selectedPlan].price_id)}
            >
              {checkoutLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
