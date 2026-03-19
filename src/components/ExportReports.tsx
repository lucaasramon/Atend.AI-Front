import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

function downloadCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const val = row[h] ?? "";
      return typeof val === "string" && (val.includes(",") || val.includes('"'))
        ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(","))
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);

  const exportLeads = async () => {
    if (!user) return;
    setExporting("leads");
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("name, email, phone, status, sentiment, source, created_at, updated_at")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data?.length) {
        toast({ title: "Nenhum lead encontrado", variant: "destructive" });
        return;
      }

      downloadCSV(data.map(l => ({
        Nome: l.name,
        Email: l.email || "",
        Telefone: l.phone || "",
        Status: l.status || "novo",
        Sentimento: l.sentiment || "neutro",
        Origem: l.source || "whatsapp",
        "Criado em": new Date(l.created_at).toLocaleString("pt-BR"),
        "Atualizado em": new Date(l.updated_at).toLocaleString("pt-BR"),
      })), `leads_${new Date().toISOString().slice(0, 10)}.csv`);

      toast({ title: "Leads exportados! ✅" });
    } catch (error) {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportMessages = async () => {
    if (!user) return;
    setExporting("messages");
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("content, from_me, remote_jid, message_type, created_at")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data?.length) {
        toast({ title: "Nenhuma mensagem encontrada", variant: "destructive" });
        return;
      }

      downloadCSV(data.map(m => ({
        Conteúdo: m.content,
        Direção: m.from_me ? "Enviada" : "Recebida",
        Contato: m.remote_jid,
        Tipo: m.message_type || "texto",
        Data: m.created_at ? new Date(m.created_at).toLocaleString("pt-BR") : "",
      })), `mensagens_${new Date().toISOString().slice(0, 10)}.csv`);

      toast({ title: "Mensagens exportadas! ✅" });
    } catch (error) {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportTemplates = async () => {
    if (!user) return;
    setExporting("templates");
    try {
      const { data, error } = await supabase
        .from("response_templates")
        .select("shortcut, content, category, is_active, created_at")
        .eq("tenant_id", user.id);

      if (error) throw error;
      if (!data?.length) {
        toast({ title: "Nenhum template encontrado", variant: "destructive" });
        return;
      }

      downloadCSV(data.map(t => ({
        Atalho: t.shortcut,
        Conteúdo: t.content,
        Categoria: t.category,
        Ativo: t.is_active ? "Sim" : "Não",
        "Criado em": new Date(t.created_at).toLocaleString("pt-BR"),
      })), `templates_${new Date().toISOString().slice(0, 10)}.csv`);

      toast({ title: "Templates exportados! ✅" });
    } catch (error) {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!exporting}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportLeads}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Leads (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportMessages}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Mensagens (CSV)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportTemplates}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Templates (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
