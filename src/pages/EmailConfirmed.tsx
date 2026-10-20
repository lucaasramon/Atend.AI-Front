import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap } from "lucide-react";

export default function EmailConfirmed() {
  const navigate = useNavigate();

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
            <h2 className="text-xl font-bold">Email confirmado com sucesso! 🎉</h2>
            <p className="text-muted-foreground">
              Sua conta foi verificada. Agora você já pode acessar o D.Sync e começar a configurar seu robô de atendimento.
            </p>
            <Button className="w-full" onClick={() => navigate("/login")}>
              Ir para o Login
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Voltar para o site</Link>
        </p>
      </div>
    </div>
  );
}
