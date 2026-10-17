import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Power, Eye, Loader2, Filter, Pencil, QrCode, X, RefreshCw, Wifi, WifiOff, CheckCircle2, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import Pagination from "@/components/Pagination";
import { api } from "@/lib/api";
import { toast } from "sonner";
import NewClientDialog, { EditingProfile } from "@/components/NewClientDialog";
import { logAudit } from "@/lib/audit";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  plan: string;
  phone: string | null;
  whatsapp_number: string | null;
  status: string;
  onboarding_completed: boolean;
  created_at: string;
  instance_name: string | null;
  system_prompt: string | null;
  webhook_url: string | null;
}

interface QrModal {
  open: boolean;
  instanceName: string;
  company: string;
  loading: boolean;
  base64: string;
  connected: boolean;
}

const QR_INITIAL: QrModal = { open: false, instanceName: "", company: "", loading: false, base64: "", connected: false };

const PAGE_SIZE = 15;

export default function Clients() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<EditingProfile | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [qrModal, setQrModal] = useState<QrModal>(QR_INITIAL);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadProfiles();
  }, [page, planFilter, statusFilter]);

  // Limpa polling ao desmontar
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        plan: planFilter,
        status: statusFilter,
      });
      const res = await api.get<{ data: Profile[]; total: number }>(`/api/profiles?${params}`);
      setProfiles(res.data || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error("Error loading profiles:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (profile: Profile) => {
    const newStatus = profile.status === "blocked" ? "active" : "blocked";
    const action = newStatus === "blocked" ? "bloquear" : "reativar";
    if (!window.confirm(`Tem certeza que deseja ${action} ${profile.company || profile.full_name}?`)) return;
    setTogglingId(profile.id);
    try {
      await api.patch(`/api/profiles/${profile.id}`, { status: newStatus });
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, status: newStatus } : p)));
      await logAudit(
        newStatus === "blocked" ? "client_blocked" : "client_unblocked",
        "profile",
        profile.id,
        { company: profile.company, name: profile.full_name }
      );
      if (newStatus === "blocked") {
        toast.error(`${profile.company || profile.full_name} bloqueado — automações pausadas`);
      } else {
        toast.success(`${profile.company || profile.full_name} reativado`);
      }
    } catch (error: any) {
      toast.error(`Erro ao alterar status: ${error.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const startPolling = (instanceName: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get<any>(`/api/evolution/status/${instanceName}`);
        const state: string = res?.instance?.state ?? res?.state ?? "";
        if (state === "open") {
          stopPolling();
          setQrModal((q) => ({ ...q, connected: true, loading: false }));
          toast.success("WhatsApp conectado!");
        }
      } catch { /* silencioso */ }
    }, 4000);
  };

  const openQrModal = async (profile: Profile) => {
    if (!profile.instance_name) {
      toast.error("Este cliente não tem instância configurada. Edite o cliente e defina o nome da instância.");
      return;
    }
    setQrModal({ open: true, instanceName: profile.instance_name, company: profile.company || profile.full_name || "", loading: true, base64: "", connected: false });
    try {
      const res = await api.get<any>(`/api/evolution/qrcode/${profile.instance_name}`);
      const base64: string = res?.base64 ?? res?.qrcode?.base64 ?? "";
      if (!base64) {
        // Pode já estar conectado — verifica status
        const status = await api.get<any>(`/api/evolution/status/${profile.instance_name}`);
        const state: string = status?.instance?.state ?? "";
        if (state === "open") {
          setQrModal((q) => ({ ...q, loading: false, connected: true }));
          return;
        }
        toast.warning("QR code não disponível. Tente novamente em instantes.");
        setQrModal((q) => ({ ...q, loading: false }));
        return;
      }
      setQrModal((q) => ({ ...q, loading: false, base64 }));
      startPolling(profile.instance_name!);
    } catch (e: any) {
      toast.error(`Erro ao buscar QR code: ${e.message}`);
      setQrModal((q) => ({ ...q, loading: false }));
    }
  };

  const refreshQr = async () => {
    if (!qrModal.instanceName) return;
    setQrModal((q) => ({ ...q, loading: true, base64: "", connected: false }));
    try {
      const res = await api.get<any>(`/api/evolution/qrcode/${qrModal.instanceName}`);
      const base64: string = res?.base64 ?? res?.qrcode?.base64 ?? "";
      setQrModal((q) => ({ ...q, loading: false, base64: base64 || "" }));
      if (base64) startPolling(qrModal.instanceName);
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
      setQrModal((q) => ({ ...q, loading: false }));
    }
  };

  const closeQrModal = () => {
    stopPolling();
    setQrModal(QR_INITIAL);
  };

  const deleteClient = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/profiles/${deleteTarget.id}`);
      setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      toast.success(`${deleteTarget.company || deleteTarget.full_name} removido permanentemente.`);
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(`Erro ao deletar: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = profiles.filter(
    (p) =>
      (p.company || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.whatsapp_number || "").includes(search)
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} cadastrados</p>
        </div>
        <Button onClick={() => { setEditingProfile(null); setDialogOpen(true); }} className="gradient-primary text-primary-foreground border-0 shadow-glow">
          <Plus className="w-4 h-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por empresa, nome ou WhatsApp..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(0); }}>
            <SelectTrigger className="flex-1 min-w-[130px] sm:flex-none sm:w-[130px] bg-card border-border">
              <Filter className="w-3 h-3 mr-1" /><SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos planos</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="flex-1 min-w-[130px] sm:flex-none sm:w-[130px] bg-card border-border"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">{search ? "Nenhum cliente encontrado para a busca" : "Nenhum cliente cadastrado ainda"}</p>
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Empresa</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Plano</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Status</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Onboarding</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">WhatsApp</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Cadastro</th>
                <th className="text-right px-5 py-3 text-xs text-muted-foreground font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((profile) => {
                const isBlocked = profile.status === "blocked";
                return (
                  <tr key={profile.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-card-foreground font-medium">{profile.company || "—"}</p>
                        <p className="text-xs text-muted-foreground">{profile.full_name || "—"}{profile.phone ? ` · ${profile.phone}` : ""}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="text-xs font-mono text-primary capitalize">{profile.plan}</span></td>
                    <td className="px-5 py-4"><StatusBadge status={isBlocked ? "blocked" : "active"} label={isBlocked ? "Bloqueado" : "Ativo"} /></td>
                    <td className="px-5 py-4"><StatusBadge status={profile.onboarding_completed ? "online" : "warning"} label={profile.onboarding_completed ? "Completo" : "Pendente"} /></td>
                    <td className="px-5 py-4"><span className="text-xs font-mono text-muted-foreground">{profile.whatsapp_number || "—"}</span></td>
                    <td className="px-5 py-4 text-xs text-muted-foreground font-mono">{new Date(profile.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/clients/${profile.id}`}>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"><Eye className="w-4 h-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingProfile(profile); setDialogOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm"
                          className={profile.instance_name ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-muted-foreground opacity-40"}
                          title={profile.instance_name ? `QR Code — ${profile.instance_name}` : "Sem instância configurada"}
                          onClick={() => openQrModal(profile)}>
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" disabled={togglingId === profile.id} onClick={() => toggleStatus(profile)}
                          className={isBlocked ? "text-success hover:text-success" : "text-destructive hover:text-destructive"}>
                          {togglingId === profile.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(profile)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      {/* Modal QR Code */}
      <Dialog open={qrModal.open} onOpenChange={(o) => { if (!o) closeQrModal(); }}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <QrCode className="w-4 h-4 text-primary" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {qrModal.company} — instância <span className="font-mono">{qrModal.instanceName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {qrModal.connected ? (
              <>
                <CheckCircle2 className="w-14 h-14 text-success" />
                <p className="text-sm font-medium text-success">WhatsApp conectado!</p>
                <p className="text-xs text-muted-foreground text-center">A IA já está ativa para este cliente.</p>
                <Button onClick={closeQrModal} className="w-full">Fechar</Button>
              </>
            ) : qrModal.loading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Carregando QR code...</p>
              </>
            ) : qrModal.base64 ? (
              <>
                <div className="relative">
                  <img
                    src={qrModal.base64.startsWith("data:") ? qrModal.base64 : `data:image/png;base64,${qrModal.base64}`}
                    alt="QR Code WhatsApp"
                    className="w-52 h-52 rounded-lg border border-border"
                  />
                  <div className="absolute -top-1.5 -right-1.5 flex items-center gap-1 bg-warning/20 border border-warning/30 rounded-full px-2 py-0.5">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-warning" />
                    <span className="text-[10px] text-warning font-medium">Aguardando...</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Abra o WhatsApp → <strong>Configurações</strong> → <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong>
                </p>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1" onClick={refreshQr}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar QR
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={closeQrModal}>
                    <X className="w-3.5 h-3.5 mr-1.5" /> Fechar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="w-10 h-10 text-muted-foreground" />
                <p className="text-xs text-muted-foreground text-center">Não foi possível carregar o QR code.</p>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1" onClick={refreshQr}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Tentar novamente
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={closeQrModal}>Fechar</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal confirmação de exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Deletar cliente permanentemente
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{deleteTarget?.company || deleteTarget?.full_name}</p>
            <p>• Conta e perfil removidos do sistema</p>
            <p>• Leads, mensagens e histórico deletados</p>
            {deleteTarget?.instance_name && <p>• Instância <span className="font-mono">{deleteTarget.instance_name}</span> removida do Evolution e n8n</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" disabled={deleting} onClick={deleteClient}>
              {deleting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Deletando...</> : <><Trash2 className="w-4 h-4 mr-2" />Deletar</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <NewClientDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingProfile(null); }}
        onClientCreated={loadProfiles}
        editingProfile={editingProfile}
      />
    </div>
  );
}
