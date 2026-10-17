import { useEffect, useState } from "react";
import { Church, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Ministry } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RobotGroup {
  id: string;
  subject: string;
}

interface TeamUser {
  id: string;
  full_name: string | null;
  email: string;
  whatsapp: string | null;
}

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c", "#0891b2", "#ca8a04", "#db2777"];
const NONE = "none";
const emptyForm = { name: "", group_jid: "", leader_id: "", pastor_id: "", color: COLORS[0], is_media: false };

export default function MinistriesPage() {
  const { toast } = useToast();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [groups, setGroups] = useState<RobotGroup[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ministry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Ministry | null>(null);

  const load = () =>
    Promise.all([
      api.get<Ministry[]>("/api/ministries").then(setMinistries),
      api.get<RobotGroup[]>("/api/events/groups").then(setGroups).catch(() => setGroups([])),
      api.get<TeamUser[]>("/api/users").then(setUsers),
    ])
      .catch((e: Error) => toast({ title: "Erro ao carregar", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const userName = (u: TeamUser) => u.full_name || u.email;
  const groupName = (jid: string | null) => (jid && groups.find((g) => g.id === jid)?.subject) || jid;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, color: COLORS[ministries.length % COLORS.length] });
    setFormOpen(true);
  };

  const openEdit = (m: Ministry) => {
    setEditing(m);
    setForm({
      name: m.name,
      group_jid: m.group_jid || "",
      leader_id: m.leader_id || "",
      pastor_id: m.pastor_id || "",
      color: m.color || COLORS[0],
      is_media: m.is_media,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Informe o nome do ministério", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) await api.patch(`/api/ministries/${editing.id}`, form);
      else await api.post("/api/ministries", form);
      toast({ title: editing ? "Ministério atualizado" : "Ministério cadastrado" });
      setFormOpen(false);
      load();
    } catch (error: any) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/ministries/${toDelete.id}`);
      toast({ title: "Ministério excluído" });
      setToDelete(null);
      load();
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const userSelect = (field: "leader_id" | "pastor_id", label: string, hint: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={form[field] || NONE} onValueChange={(v) => setForm({ ...form, [field]: v === NONE ? "" : v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Ninguém</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>{userName(u)}{u.whatsapp ? "" : " (sem WhatsApp)"}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Ministérios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cada ministério recebe no seu grupo só os eventos em que participa. O grupo principal recebe todos.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo ministério</Button>
      </div>

      {ministries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Church className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum ministério cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ministries.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-card p-4 shadow-card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color || "#999" }} />
                  <p className="font-medium">{m.name}</p>
                  {m.is_media && <Badge variant="secondary">Mídia</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" title="Excluir" onClick={() => setToDelete(m)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Grupo: {m.group_jid ? groupName(m.group_jid) : "— (só o grupo principal recebe)"}</p>
                <p>Líder: {m.leader_name || "—"} · Pastor responsável: {m.pastor_name || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar ministério" : "Novo ministério"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Louvor, Mídia, Infantil" />
            </div>
            <div className="space-y-2">
              <Label>Grupo do WhatsApp</Label>
              <Select value={form.group_jid || NONE} onValueChange={(v) => setForm({ ...form, group_jid: v === NONE ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem grupo próprio</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Aparecem os grupos em que o robô está. Ao salvar, o grupo é liberado para receber mensagens.
              </p>
            </div>
            {userSelect("leader_id", "Líder do ministério", "Recebe os avisos e confirma que viu.")}
            {userSelect("pastor_id", "Pastor responsável", "É avisado se o líder não confirmar no prazo.")}
            <div className="space-y-2">
              <Label>Cor no calendário</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">É o ministério de Mídia</p>
                <p className="text-xs text-muted-foreground">Usado no calendário de demandas da mídia</p>
              </div>
              <Switch checked={form.is_media} onCheckedChange={(v) => setForm({ ...form, is_media: v })} />
            </div>
            <p className="text-xs text-muted-foreground">
              Líder e pastor são escolhidos entre os usuários cadastrados em <b>Usuários</b>, e precisam de WhatsApp para receber os avisos.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ministério?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.name}” sai da lista. Os eventos continuam na agenda, só deixam de estar ligados a ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
