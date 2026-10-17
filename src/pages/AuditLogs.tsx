import { useEffect, useState } from "react";
import { Loader2, ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: AuditLog[]; total: number }>(`/api/audit?page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => { setLogs(res.data || []); setTotal(res.total || 0); })
      .catch((err) => console.error("Error loading audit logs:", err))
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.target_type.toLowerCase().includes(search.toLowerCase()) ||
      (l.target_id || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Log de Auditoria</h1>
        <p className="text-sm text-muted-foreground mt-1">Registro de ações administrativas</p>
      </div>

      <div className="relative max-w-sm">
        <ScrollText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Filtrar por ação ou tipo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ScrollText className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Data</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Ação</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Tipo</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Alvo</th>
                <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                    {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-5 py-3 text-card-foreground font-medium">{log.action}</td>
                  <td className="px-5 py-3 text-xs font-mono text-primary">{log.target_type}</td>
                  <td className="px-5 py-3 text-xs font-mono text-muted-foreground truncate max-w-[200px]">{log.target_id || "—"}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground truncate max-w-[250px]">
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{total} registros</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
