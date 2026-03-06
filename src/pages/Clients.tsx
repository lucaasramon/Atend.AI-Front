import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Power, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import { mockClients, Client } from "@/data/mockData";
import { toast } from "sonner";
import NewClientDialog from "@/components/NewClientDialog";

export default function Clients() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = clients.filter(
    (c) =>
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleKillSwitch = (id: string) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "blocked" ? "active" : "blocked", whatsappStatus: c.status === "blocked" ? "online" : "offline" }
          : c
      )
    );
    const client = clients.find((c) => c.id === id);
    if (client?.status === "blocked") {
      toast.success(`${client.company} reativado`);
    } else {
      toast.error(`${client?.company} bloqueado — automações pausadas`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">{clients.length} cadastrados</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground border-0 shadow-glow">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por empresa ou nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Empresa</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Plano</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Status</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">WhatsApp</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Vencimento</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Valor</th>
              <th className="text-right px-5 py-3 text-xs text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr key={client.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4">
                  <div>
                    <p className="text-card-foreground font-medium">{client.company}</p>
                    <p className="text-xs text-muted-foreground">{client.name} · {client.phone}</p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs font-mono text-primary">{client.plan}</span>
                </td>
                <td className="px-5 py-4"><StatusBadge status={client.status} /></td>
                <td className="px-5 py-4"><StatusBadge status={client.whatsappStatus} /></td>
                <td className="px-5 py-4 text-card-foreground text-xs font-mono">{client.dueDate}</td>
                <td className="px-5 py-4 text-card-foreground">R$ {client.monthlyValue}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/clients/${client.id}`}>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKillSwitch(client.id)}
                      className={client.status === "blocked" ? "text-success hover:text-success" : "text-destructive hover:text-destructive"}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClientCreated={(client) => setClients((prev) => [client, ...prev])}
      />
    </div>
  );
}
