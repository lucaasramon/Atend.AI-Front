import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, BookOpen, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface KBItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = ["geral", "vendas", "suporte", "produto", "financeiro"];

export default function ClientKnowledgeBase() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KBItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("geral");

  const loadItems = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("*")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data || []) as KBItem[]);
    } catch (error) {
      console.error("Error loading knowledge base:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setQuestion("");
    setAnswer("");
    setCategory("geral");
    setDialogOpen(true);
  };

  const openEdit = (item: KBItem) => {
    setEditing(item);
    setQuestion(item.question);
    setAnswer(item.answer);
    setCategory(item.category);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !question.trim() || !answer.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("knowledge_base")
          .update({ question: question.trim(), answer: answer.trim(), category, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "FAQ atualizado! ✅" });
      } else {
        const { error } = await supabase
          .from("knowledge_base")
          .insert({ tenant_id: user.id, question: question.trim(), answer: answer.trim(), category });
        if (error) throw error;
        toast({ title: "FAQ adicionado! ✅" });
      }
      setDialogOpen(false);
      await loadItems();
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: KBItem) => {
    try {
      const { error } = await supabase
        .from("knowledge_base")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);
      if (error) throw error;
      await loadItems();
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este FAQ?")) return;
    try {
      const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "FAQ excluído ✅" });
      await loadItems();
    } catch (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const filtered = items.filter(i => {
    const matchSearch = !search || i.question.toLowerCase().includes(search.toLowerCase()) || i.answer.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || i.category === filterCategory;
    return matchSearch && matchCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Base de Conhecimento</h1>
          <p className="text-muted-foreground">Perguntas e respostas que o robô usa como referência</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Novo FAQ
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar perguntas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Nenhum FAQ encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">Adicione perguntas e respostas para enriquecer o conhecimento do robô.</p>
            <Button onClick={openNew} variant="outline"><Plus className="w-4 h-4 mr-1" /> Adicionar FAQ</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <Card key={item.id} className={`transition-opacity ${!item.is_active ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                      {!item.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                    </div>
                    <h3 className="font-medium text-sm text-foreground mb-1">{item.question}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.answer}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={item.is_active} onCheckedChange={() => handleToggle(item)} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar FAQ" : "Novo FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pergunta</Label>
              <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ex: Qual o horário de funcionamento?" maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>Resposta</Label>
              <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Ex: Nosso horário é de segunda a sexta, das 8h às 18h." rows={4} maxLength={2000} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editing ? "Salvar alterações" : "Adicionar FAQ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
