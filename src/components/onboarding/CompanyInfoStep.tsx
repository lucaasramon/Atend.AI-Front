import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CompanyInfoStepProps {
  data: any;
  onSave: (data: any) => Promise<boolean>;
  saving: boolean;
}

export default function CompanyInfoStep({ data, onSave, saving }: CompanyInfoStepProps) {
  const [formData, setFormData] = useState({
    company: data.company || "",
    full_name: data.full_name || "",
    phone: data.phone || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company || !formData.full_name || !formData.phone) {
      return;
    }

    await onSave(formData);
  };

  const isValid = formData.company && formData.full_name && formData.phone;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company">Nome da Empresa *</Label>
          <Input
            id="company"
            placeholder="Ex: Minha Empresa LTDA"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name">Nome Completo do Responsável *</Label>
          <Input
            id="full_name"
            placeholder="Ex: João Silva"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone de Contato *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Ex: (11) 98765-4321"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={!isValid || saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Salvando...
          </>
        ) : (
          "Salvar e Continuar"
        )}
      </Button>
    </form>
  );
}