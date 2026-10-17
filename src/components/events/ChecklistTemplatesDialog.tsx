import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ChecklistTemplate } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "Som | 7" → { title: "Som", days_before: 7 } */
const parseLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [title, days] = l.split("|").map((x) => x.trim());
      const n = parseInt(days);
      return Number.isFinite(n) ? { title, days_before: n } : { title };
    });

const toLines = (items: ChecklistTemplate["items"]) =>
  items.map((i) => (i.days_before !== undefined ? `${i.title} | ${i.days_before}` : i.title)).join("\n");

export default function ChecklistTemplatesDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ChecklistTemplate[] | null>(null);
  const [editing, setEditing] = useState<{ id?: string; name: string; lines: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.get<ChecklistTemplate[]>("/api/events/checklist-templates").then(setTemplates);

  useEffect(() => {
    if (open) load().catch(() => setTemplates([]));
  }, [open]);

  const save = async () => {
    if (!editing) return;
    const items = parseLines(editing.lines);
    if (!editing.name.trim() || !items.length) {
      toast({ title: "Informe o nome e ao menos um item", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = { name: editing.name, items };
      if (editing.id) await api.put(`/api/events/checklist-templates/${editing.id}`, body);
      else await api.post("/api/events/checklist-templates", body);
      toast({ title: "Modelo salvo" });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: ChecklistTemplate) => {
    try {
      await api.delete(`/api/events/checklist-templates/${t.id}`);
      load();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setEditing(null); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modelos de checklist</DialogTitle>
        </DialogHeader>
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Nome</Label>
              <Input id="tpl-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Ex.: Conferência" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-items">Itens (um por linha)</Label>
              <Textarea
                id="tpl-items"
                rows={10}
                value={editing.lines}
                onChange={(e) => setEditing({ ...editing, lines: e.target.value })}
                placeholder={"Local reservado | 30\nBuffet | 14\nSom e iluminação | 7\nDecoração"}
              />
              <p className="text-xs text-muted-foreground">
                Opcional: <b>| número</b> no fim define o prazo em dias antes do evento.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Voltar</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
            </DialogFooter>
          </div>
        ) : !templates ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[320px]">{t.items.map((i) => i.title).join(", ")}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditing({ id: t.id, name: t.name, lines: toLines(t.items) })}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Excluir" onClick={() => remove(t)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => setEditing({ name: "", lines: "" })}>
              <Plus className="w-4 h-4 mr-2" />Novo modelo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
