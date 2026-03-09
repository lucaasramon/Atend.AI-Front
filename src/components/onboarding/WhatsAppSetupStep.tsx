import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Phone, Info } from "lucide-react";

interface WhatsAppSetupStepProps {
  data: any;
  onSave: (data: any) => Promise<boolean>;
  saving: boolean;
}

export default function WhatsAppSetupStep({ data, onSave, saving }: WhatsAppSetupStepProps) {
  const [whatsappNumber, setWhatsappNumber] = useState(data.whatsapp_number || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!whatsappNumber) return;

    await onSave({ whatsapp_number: whatsappNumber });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          Informe o número do WhatsApp que será usado pelo seu robô. Este número deve estar
          conectado à API do WhatsApp Business.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="whatsapp_number">Número do WhatsApp *</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="whatsapp_number"
            type="tel"
            placeholder="Ex: 5511987654321"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            className="pl-10"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Use o formato internacional sem espaços ou caracteres especiais
        </p>
      </div>

      <Button type="submit" disabled={!whatsappNumber || saving} className="w-full">
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