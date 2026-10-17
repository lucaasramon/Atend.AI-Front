import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, User, Building2, Phone, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePlanFeatures } from "@/hooks/use-plan-features";

export default function ClientProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { planId } = usePlanFeatures();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get<{ full_name: string | null; company: string | null; phone: string | null; created_at: string }>("/api/profiles/me")
      .then((data) => {
        setFullName(data.full_name || "");
        setCompany(data.company || "");
        setPhone(data.phone || "");
        setCreatedAt(data.created_at);
      })
      .catch((err) => console.error("Error loading profile:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.patch("/api/profiles/me", {
        full_name: fullName.trim() || null,
        company: company.trim() || null,
        phone: phone.trim() || null,
      });
      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas com sucesso." });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg">Informações Pessoais</CardTitle>
            <Badge variant="outline" className="capitalize">{planId || "starter"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-muted-foreground" /> Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-muted-foreground" /> Empresa</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nome da sua empresa" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /> Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+5511999999999" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /> Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Membro desde {createdAt ? new Date(createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
            </p>
          </div>
          <Button onClick={saveProfile} disabled={saving} className="w-full">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
