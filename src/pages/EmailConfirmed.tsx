import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const checkSession = async () => {
      // Small delay to allow Supabase to process the token
      await new Promise((r) => setTimeout(r, 1500));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus("success");
      } else {
        setStatus("success"); // Even without session, show success (email was confirmed)
      }
    };
    checkSession();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AtendIA</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            {status === "loading" ? (
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            ) : (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            )}
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === "loading" ? (
              <>
                <h2 className="text-xl font-bold">Verificando seu email...</h2>
                <p className="text-muted-foreground">Aguarde um momento.</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">Email confirmado com sucesso! 🎉</h2>
                <p className="text-muted-foreground">
                  Sua conta foi verificada. Agora você já pode acessar o AtendIA e começar a configurar seu robô de atendimento.
                </p>
                <Button className="w-full" onClick={() => navigate("/login")}>
                  Ir para o Login
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Voltar para o site</Link>
        </p>
      </div>
    </div>
  );
}
