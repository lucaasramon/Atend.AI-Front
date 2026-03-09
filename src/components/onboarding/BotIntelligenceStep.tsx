import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles } from "lucide-react";

interface BotIntelligenceStepProps {
  data: any;
  onSave: (data: any) => Promise<boolean>;
  saving: boolean;
}

export default function BotIntelligenceStep({ data, onSave, saving }: BotIntelligenceStepProps) {
  const [systemPrompt, setSystemPrompt] = useState(
    data.system_prompt || 
    "Você é um assistente virtual prestativo e amigável. Responda de forma clara e objetiva, sempre mantendo um tom profissional e cordial."
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!systemPrompt) return;

    await onSave({ system_prompt: systemPrompt });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert>
        <Sparkles className="w-4 h-4" />
        <AlertDescription>
          Defina a personalidade e o comportamento do seu robô. Este texto guiará todas as
          respostas que ele irá gerar.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="system_prompt">Prompt do Sistema *</Label>
        <Textarea
          id="system_prompt"
          placeholder="Descreva como seu robô deve se comportar..."
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={8}
          className="resize-none"
          required
        />
        <p className="text-xs text-muted-foreground">
          Exemplo: "Você é um assistente de vendas especializado em produtos eletrônicos. 
          Seja técnico, mas mantenha uma linguagem acessível."
        </p>
      </div>

      <Button type="submit" disabled={!systemPrompt || saving} className="w-full">
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