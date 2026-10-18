import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Send, Trash2, UserCog } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import ChipSelect from "@/components/events/ChipSelect";

interface TeamUser {
  id: string;
  email: string;
  full_name: string | null;
  whatsapp: string | null;
  role: "admin" | "agenda" | "viewer";
  must_change_password: boolean;
  created_at: string;
  church_role: string | null;
  ministries: { id: string; name: string; color: string | null }[];
}

// Funções na igreja (mesma lista do backend)
const CHURCH_ROLES = [
  "Apóstolo(a)", "Bispo(a)", "Pastor(a)", "Pastor(a) auxiliar", "Presbítero(a)", "Evangelista", "Missionário(a)",
  "Diácono(isa)", "Obreiro(a)", "Líder", "Vice-líder", "Coordenador(a)", "Professor(a)", "Secretário(a)",
  "Tesoureiro(a)", "Voluntário(a)", "Membro",
];

interface AccessResult {
  whatsapp_sent: boolean;
  whatsapp_error?: string;
  temp_password?: string;
}

const ROLES = [
  { value: "admin", label: "Administrador", hint: "Acesso total, inclusive cadastro de usuários" },
  { value: "agenda", label: "Agenda", hint: "Vê, cria, edita e exclui eventos" },
  { value: "viewer", label: "Visualizador", hint: "Só vê a agenda e o calendário" },
] as const;

const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label || r;

/** 558596470061 → (85) 9647-0061 */
const formatPhone = (n: string | null) => {
  if (!n) return "—";
  const d = n.replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return n;
};

const emptyForm = { full_name: "", email: "", whatsapp: "", role: "agenda", church_role: "", ministry_ids: [] as string[] };

export default function UsersPage() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<TeamUser | null>(null);
  const [toResend, setToResend] = useState<TeamUser | null>(null);
  const [manual, setManual] = useState<{ user: string; password: string; error?: string } | null>(null);

  const [ministries, setMinistries] = useState<{ id: string; name: string; color: string | null }[]>([]);
  useEffect(() => {
    api.get<{ id: string; name: string; color: string | null }[]>("/api/ministries").then(setMinistries).catch(() => {});
  }, []);

  const load = () =>
    api.get<TeamUser[]>("/api/users")
      .then(setUsers)
      .catch((e: Error) => toast({ title: "Erro ao carregar usuários", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  // Se o WhatsApp falhar, mostra a senha para o admin repassar
  const handleAccess = (name: string, r: AccessResult, okTitle: string) => {
    if (r.whatsapp_sent) {
      toast({ title: okTitle, description: "Login, senha temporária e link enviados pelo WhatsApp." });
    } else {
      setManual({ user: name, password: r.temp_password || "", error: r.whatsapp_error });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (u: TeamUser) => {
    setEditing(u);
    setForm({ full_name: u.full_name || "", email: u.email, whatsapp: u.whatsapp || "", role: u.role, church_role: u.church_role || "", ministry_ids: u.ministries.map((m) => m.id) });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.whatsapp.trim()) {
      toast({ title: "Preencha nome, e-mail e WhatsApp", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/api/users/${editing.id}`, { full_name: form.full_name, whatsapp: form.whatsapp, role: form.role, church_role: form.church_role, ministry_ids: form.ministry_ids });
        toast({ title: "Usuário atualizado" });
      } else {
        const res = await api.post<TeamUser & AccessResult>("/api/users", form);
        handleAccess(res.full_name || res.email, res, "Usuário cadastrado");
      }
      setFormOpen(false);
      load();
    } catch (error: any) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    if (!toResend) return;
    try {
      const res = await api.post<AccessResult>(`/api/users/${toResend.id}/resend`, {});
      handleAccess(toResend.full_name || toResend.email, res, "Acesso reenviado");
      setToResend(null);
      load();
    } catch (error: any) {
      toast({ title: "Erro ao reenviar", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/users/${toDelete.id}`);
      toast({ title: "Usuário excluído" });
      setToDelete(null);
      load();
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Quem pode acessar a agenda e o painel</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo usuário</Button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserCog className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum usuário cadastrado</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-card divide-y divide-border">
          {users.map((u) => {
            const isMe = u.id === me?.id;
            return (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-card-foreground">{u.full_name || u.email}</p>
                    {isMe && <Badge variant="outline">Você</Badge>}
                    {u.must_change_password && <Badge variant="outline" className="text-warning border-warning/40">Aguardando primeiro acesso</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {u.church_role ? `${u.church_role} · ` : ""}{u.email} · WhatsApp {formatPhone(u.whatsapp)}
                  </p>
                  {u.ministries.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {u.ministries.map((m) => (
                        <span key={m.id} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px]">
                          {m.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />}
                          {m.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {u.role === "agenda" && u.ministries.length === 0 && (
                    <p className="text-[11px] text-warning mt-1">Sem área: não consegue criar eventos</p>
                  )}
                </div>
                <Badge variant={u.role === "admin" ? "default" : "secondary"} className="w-fit">{roleLabel(u.role)}</Badge>
                <div className="flex gap-1">
                  {!isMe && u.whatsapp && (
                    <Button size="icon" variant="ghost" title="Reenviar acesso pelo WhatsApp" onClick={() => setToResend(u)}>
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                  {!isMe && (
                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => setToDelete(u)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cadastro / edição */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome *</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail (login) *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                inputMode="tel"
                placeholder="(85) 9 9999-9999"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })} disabled={editing?.id === me?.id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLES.find((r) => r.value === form.role)?.hint}</p>
            </div>
            <div className="space-y-2">
              <Label>Função na igreja</Label>
              <Select value={form.church_role || "none"} onValueChange={(v) => setForm({ ...form, church_role: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informada</SelectItem>
                  {CHURCH_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Áreas {form.role === "agenda" && "*"}</Label>
              <ChipSelect
                options={ministries}
                value={form.ministry_ids}
                onChange={(ids) => setForm({ ...form, ministry_ids: ids })}
                empty="Nenhuma área cadastrada (cadastre em Ministérios)"
              />
              <p className="text-xs text-muted-foreground">
                {form.role === "admin"
                  ? "O administrador pode criar eventos de qualquer área."
                  : form.role === "agenda"
                    ? "A pessoa só poderá criar e editar eventos dessas áreas. Ver, ela vê todos."
                    : "Informativo: o visualizador não cria eventos."}
              </p>
            </div>
            {!editing && (
              <p className="text-xs text-muted-foreground rounded-md bg-muted p-3">
                Ao salvar, a pessoa recebe no WhatsApp o link de acesso, o login e uma senha temporária.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Salvar" : "Cadastrar e enviar acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp falhou: senha para repassar manualmente */}
      <Dialog open={!!manual} onOpenChange={(o) => !o && setManual(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Não foi possível enviar pelo WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>O acesso de <b>{manual?.user}</b> foi criado. Repasse a senha temporária manualmente:</p>
            <p className="font-mono text-lg text-center rounded-md bg-muted py-2 select-all">{manual?.password}</p>
            <p className="text-xs text-muted-foreground">
              Ao entrar com ela, a pessoa será levada para criar uma senha nova.
              {manual?.error && <><br />Detalhe: {manual.error}</>}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setManual(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reenviar */}
      <AlertDialog open={!!toResend} onOpenChange={(o) => !o && setToResend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              {toResend?.full_name || toResend?.email} vai receber no WhatsApp uma nova senha temporária e um novo link.
              A senha atual deixa de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResend}>Reenviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excluir */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.full_name || toDelete?.email} perde o acesso imediatamente. Os eventos que essa pessoa criou continuam na agenda.
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
