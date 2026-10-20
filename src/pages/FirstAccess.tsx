import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function FirstAccess() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [info, setInfo] = useState<{ email: string; full_name: string | null } | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Link inválido.");
      return;
    }
    api.get<{ email: string; full_name: string | null }>(`/api/auth/setup?token=${encodeURIComponent(token)}`)
      .then(setInfo)
      .catch((e: Error) => setError(e.message));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<{ email: string }>("/api/auth/setup", { token, password });
      toast({ title: "Senha definida!", description: "Agora é só entrar com a sua nova senha." });
      navigate(`/login?email=${encodeURIComponent(res.email)}`, { replace: true });
    } catch (err: any) {
      toast({ title: "Não foi possível salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const firstName = info?.full_name?.split(" ")[0];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold">{firstName ? `Olá, ${firstName}!` : "Defina sua senha"}</h1>
          {info && <p className="text-sm text-muted-foreground">Crie a senha que você vai usar para entrar com <b>{info.email}</b>.</p>}
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>Ir para o login</Button>
            </div>
          ) : !info ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={show ? "Esconder senha" : "Mostrar senha"}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar senha
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
