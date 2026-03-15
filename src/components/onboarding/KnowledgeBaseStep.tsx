import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, BookOpen, CheckCircle2, Upload, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface KnowledgeBaseStepProps {
  data: any;
  onSave: (data: any) => Promise<boolean>;
  saving: boolean;
}

export default function KnowledgeBaseStep({ data, onSave, saving }: KnowledgeBaseStepProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [acknowledged, setAcknowledged] = useState(data.acknowledged || false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(data.uploadedFiles || []);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        (f) => f.size <= 10 * 1024 * 1024 // 10MB limit
      );
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!user || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];

    try {
      for (const file of files) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("onboarding-files")
          .upload(filePath, file);

        if (error) {
          console.error("Upload error:", error);
          toast({ title: `Erro ao enviar ${file.name}`, description: error.message, variant: "destructive" });
        } else {
          uploaded.push(filePath);
        }
      }

      setUploadedFiles((prev) => [...prev, ...uploaded]);
      setFiles([]);
      toast({ title: "Arquivos enviados!", description: `${uploaded.length} arquivo(s) enviado(s) com sucesso.` });
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Upload pending files first
    if (files.length > 0) {
      await uploadFiles();
    }
    await onSave({ acknowledged: true, uploadedFiles: [...uploadedFiles] });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert>
        <BookOpen className="w-4 h-4" />
        <AlertDescription>
          A base de conhecimento permite que seu robô acesse informações específicas sobre seus
          produtos, serviços e políticas. Envie documentos PDF, TXT ou DOCX abaixo.
        </AlertDescription>
      </Alert>

      {/* File Upload Area */}
      <div className="space-y-3">
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Clique para selecionar arquivos ou arraste aqui
          </p>
          <p className="text-xs text-muted-foreground mt-1">PDF, TXT, DOCX — até 10MB cada</p>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.txt,.docx,.doc"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Pending files */}
        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-card-foreground">Arquivos selecionados:</p>
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="truncate max-w-[250px]">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(i)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={uploadFiles} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Enviar {files.length} arquivo(s)
            </Button>
          </div>
        )}

        {/* Already uploaded */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-success flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {uploadedFiles.length} arquivo(s) enviado(s)
            </p>
            {uploadedFiles.map((path, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-3 py-1.5">
                <FileText className="w-3 h-3" />
                <span className="truncate">{path.split("/").pop()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

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
          Entendi que poderei adicionar mais documentos à base de conhecimento após completar a configuração
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
