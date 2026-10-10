import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { STRIPE_PLANS, PlanId } from "@/lib/stripe-plans";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const selectedPlan = searchParams.get("plan") as PlanId | null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, setUserFromToken } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupCompany, setSignupCompany] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectAfterAuth = (role: string) => {
    if (role === "admin") {
      navigate("/admin");
    } else if (role === "agenda") {
      navigate("/admin/agenda");
    } else {
      if (selectedPlan && STRIPE_PLANS[selectedPlan]) {
        navigate(`/client/billing?auto_checkout=${selectedPlan}`);
      } else {
        navigate("/client/billing");
      }
    }
  };

  // Já logado ao abrir a página: pula a tela de login
  useEffect(() => {
    if (!authLoading && user) {
      const home = user.role === "admin" ? "/admin" : user.role === "agenda" ? "/admin/agenda" : "/client/dashboard";
      navigate(home, { replace: true });
    }
  }, [authLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: { id: string; email: string; role: string } }>("/api/auth/login", {
        email: loginEmail,
        password: loginPassword,
      });
      setUserFromToken(res.token, res.user);
      toast({ title: "Login realizado!", description: "Redirecionando..." });
      redirectAfterAuth(res.user.role);
    } catch (error: any) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlan) {
      toast({ title: "Selecione um plano", description: "Por favor, selecione um plano antes de criar sua conta.", variant: "destructive" });
      return;
    }

    if (signupPassword.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: { id: string; email: string; role: string } }>("/api/auth/signup", {
        email: signupEmail,
        password: signupPassword,
        full_name: signupName,
        company: signupCompany,
        plan: selectedPlan,
      });
      setUserFromToken(res.token, res.user);
      toast({ title: "Conta criada!", description: "Redirecionando..." });
      redirectAfterAuth(res.user.role);
    } catch (error: any) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-lg object-contain" />
            <span className="text-xl font-bold">AtendIA</span>
          </Link>
        </div>

        <Card>
          <Tabs defaultValue={defaultTab}>
            <CardHeader className="pb-3">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1" disabled={!selectedPlan}>Criar Conta</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="seu@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup" className="mt-0">
                {!selectedPlan && (
                  <div className="mb-4 p-4 rounded-lg bg-muted border border-border">
                    <p className="text-sm text-muted-foreground text-center">
                      Para criar uma conta, você precisa <Link to="/" className="text-primary font-semibold hover:underline">selecionar um plano</Link> primeiro.
                    </p>
                  </div>
                )}
                <form onSubmit={handleSignup} className="space-y-4">
                  {selectedPlan && STRIPE_PLANS[selectedPlan] && (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
                      <p className="text-sm text-muted-foreground">Plano selecionado</p>
                      <p className="font-bold text-primary">{STRIPE_PLANS[selectedPlan].name} — R$ {STRIPE_PLANS[selectedPlan].price}/mês</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input id="signup-name" placeholder="Seu nome" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-company">Empresa</Label>
                    <Input id="signup-company" placeholder="Nome da empresa" value={signupCompany} onChange={(e) => setSignupCompany(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="seu@email.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input id="signup-password" type="password" placeholder="Mínimo 6 caracteres" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || !selectedPlan}>
                    {loading ? "Criando..." : `Criar Conta${selectedPlan ? ` — ${STRIPE_PLANS[selectedPlan].name}` : ""}`}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Voltar para o site</Link>
        </p>
      </div>
    </div>
  );
}
