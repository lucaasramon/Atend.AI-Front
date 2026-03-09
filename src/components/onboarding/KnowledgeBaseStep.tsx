import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, BookOpen, CheckCircle2 } from "lucide-react";

interface KnowledgeBaseStepProps {
  data: any;
  onSave: (data: any) => Promise<boolean>;
  saving: boolean;
}

export default function KnowledgeBaseStep({ data, onSave, saving }: KnowledgeBaseStepProps) {
  const [acknowledged, setAcknowledged] = useState(data.acknowledged || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ acknowledged: true });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert>
        <BookOpen className="w-4 h-4" />
        <AlertDescription>
          A base de conhecimento permite que seu robô acesse informações específicas sobre seus
          produtos, serviços e políticas. Você poderá adicionar documentos e FAQs após completar
          o onboarding.
        </AlertDescription>
      </Alert>

      <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
        <h3 className="font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          Próximos passos
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground ml-6">
          <li className="list-disc">Enviar documentos em PDF sobre seus produtos</li>
          <li className="list-disc">Criar perguntas e respostas frequentes (FAQ)</li>
          <li className="list-disc">Adicionar links de referência importantes</li>
          <li className="list-disc">Treinar o robô com conversas anteriores</li>
        </ul>
      </div>

      <div className="flex items-start gap-3 p-4 border border-border rounded-lg">
        <input
          type="checkbox"
          id="acknowledge"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-1"
        />
        <label htmlFor="acknowledge" className="text-sm cursor-pointer">
          Entendi que poderei adicionar documentos e informações à base de conhecimento
          após completar a configuração inicial
        </label>
      </div>

      <Button type="submit" disabled={!acknowledged || saving} className="w-full">
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