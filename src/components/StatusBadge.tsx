import { Badge } from "@/components/ui/badge";

type Status = "active" | "inactive" | "blocked" | "online" | "offline" | "warning";

const statusConfig: Record<Status, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-success/15 text-success border-success/30 hover:bg-success/20" },
  inactive: { label: "Inativo", className: "bg-muted text-muted-foreground border-border hover:bg-muted" },
  blocked: { label: "Bloqueado", className: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20" },
  online: { label: "Online", className: "bg-success/15 text-success border-success/30 hover:bg-success/20" },
  offline: { label: "Offline", className: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20" },
  warning: { label: "Atenção", className: "bg-warning/15 text-warning border-warning/30 hover:bg-warning/20" },
};

export default function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === "active" || status === "online" ? "bg-success" :
        status === "blocked" || status === "offline" ? "bg-destructive" :
        status === "warning" ? "bg-warning" : "bg-muted-foreground"
      }`} />
      {label || config.label}
    </Badge>
  );
}
