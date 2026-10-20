import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const token = searchParams.get("token");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      toast({ title: "Senha atualizada!", description: "Você já pode usar sua nova senha." });
      navigate("/login");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div>
            <Link to="/" className="inline-flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-lg object-contain" />
              <span className="text-xl font-bold">D.Sync</span>
            </Link>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Link inválido</CardTitle>
              <CardDescription>Este link de recuperação é inválido ou expirou.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/login">Voltar para o login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">D.Sync</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Nova senha</CardTitle>
            <CardDescription>Digite sua nova senha abaixo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input id="new-password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input id="confirm-password" type="password" placeholder="Repita a senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Redefinir senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/login" className="hover:text-foreground transition-colors">← Voltar para o login</Link>
        </p>
      </div>
    </div>
  );
}
