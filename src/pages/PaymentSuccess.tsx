import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccess() {
  const navigate = useNavigate();

  // Fecha a aba automaticamente se foi aberta pelo checkout (em nova aba)
  // e redireciona para o painel após 5 segundos caso o usuário permaneça
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/client/billing");
    }, 6000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-lg object-contain" />
            <span className="text-xl font-bold">D.Sync</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Pagamento confirmado!</h2>
            <p className="text-muted-foreground">
              Sua assinatura foi ativada com sucesso. Você já pode usar todos os recursos do seu plano.
            </p>
            <p className="text-sm text-muted-foreground">
              Você será redirecionado automaticamente em alguns segundos...
            </p>
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={() => navigate("/client/dashboard")}>
                Ir para o Painel
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/client/billing")}>
                Ver minha assinatura
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Voltar para o site</Link>
        </p>
      </div>
    </div>
  );
}
