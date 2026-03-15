import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Copy, Pencil, Trash2, Search, FileText, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Template {
  id: string;
  shortcut: string;
  content: string;
  category: string;
  is_active: boolean;
}

const defaultCategories = ["Pagamento", "Endereço", "Horários", "Links", "Geral"];

export default function ClientTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formShortcut, setFormShortcut] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("Geral");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTemplates = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("response_templates")
      .select("*")
      .eq("tenant_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar templates", description: error.message, variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const filtered = templates.filter(
    (t) =>
      t.shortcut.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingTemplate(null);
    setFormShortcut("");
    setFormContent("");
    setFormCategory("Geral");
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setFormShortcut(t.shortcut);
    setFormContent(t.content);
    setFormCategory(t.category);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formShortcut.trim() || !formContent.trim() || !user) {
      toast({ title: "Erro", description: "Atalho e conteúdo são obrigatórios", variant: "destructive" });
      return;
    }
    const slug = formShortcut.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    if (editingTemplate) {
      const { error } = await supabase
        .from("response_templates")
        .update({ shortcut: slug, content: formContent, category: formCategory })
        .eq("id", editingTemplate.id);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Template atualizado" });
    } else {
      const { error } = await supabase
        .from("response_templates")
        .insert({ shortcut: slug, content: formContent, category: formCategory, tenant_id: user.id });
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Template criado" });
    }
    setDialogOpen(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("response_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Template removido" });
    fetchTemplates();
  };

  const toggleActive = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("response_templates")
      .update({ is_active: !currentValue })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    fetchTemplates();
  };

  const copyVariable = (shortcut: string) => {
    navigator.clipboard.writeText(`{{${shortcut}}}`);
    setCopiedId(shortcut);
    toast({ title: "Variável copiada!", description: `{{${shortcut}}} copiado para a área de transferência` });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates de Resposta</h1>
          <p className="text-muted-foreground">Dados fixos que a IA usa para responder (PIX, links, endereços)</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Novo Template
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex gap-3 items-start">
            <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Como funciona?</p>
              <p className="text-muted-foreground mt-1">
                Os templates são injetados automaticamente no contexto da IA. Quando um cliente perguntar sobre PIX, endereço ou links, a IA usará os dados fixos cadastrados aqui — sem risco de alucinação.
                Use o botão <strong>Copiar Variável</strong> para obter o atalho no formato <code className="bg-muted px-1 rounded text-xs">{"{{atalho}}"}</code>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar templates..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atalho</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className={!t.is_active ? "opacity-50" : ""}>
                  <TableCell>
                    <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{t.shortcut}</code>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm truncate">{t.content}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => toggleActive(t.id, t.is_active)}>
                      {t.is_active ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">Inativo</Badge>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyVariable(t.shortcut)} title="Copiar variável">
                        {copiedId === t.shortcut ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)} title="Editar">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(t.id)} title="Excluir">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum template encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Atalho (será usado como variável)</Label>
              <Input placeholder="ex: pix_key" value={formShortcut} onChange={(e) => setFormShortcut(e.target.value)} className="font-mono" />
              {formShortcut && (
                <p className="text-xs text-muted-foreground">
                  Variável: <code className="bg-muted px-1 rounded">{`{{${formShortcut.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}}}`}</code>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea placeholder="Cole aqui o texto exato que a IA deve usar..." value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {defaultCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingTemplate ? "Salvar" : "Criar Template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
