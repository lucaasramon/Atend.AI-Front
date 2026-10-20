import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Bell,
  ScrollText,
  Sun,
  Moon,
  LogOut,
  Menu,
  CalendarDays,
  CalendarRange,
  UserCog,
  MapPin,
  ClipboardCheck,
  Church,
  ClipboardList,
  Clapperboard,
  Eye,
  UsersRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "@/components/ThemeProvider";
import PageHelpBox from "@/components/PageHelpBox";
import { useAuth } from "@/contexts/AuthContext";

type BadgeKey = "notifications" | "approvals";

// team: também aparece para os perfis "agenda" e "viewer"
const navItems: { path: string; label: string; icon: typeof LayoutDashboard; badge?: BadgeKey; team?: boolean }[] = [
  // Ocultos por enquanto (atendimento por IA):
  // { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  // { path: "/admin/clients", label: "Clientes", icon: Users },
  { path: "/admin/agenda", label: "Agenda", icon: CalendarDays, team: true },
  { path: "/admin/calendario", label: "Calendário", icon: CalendarRange, team: true },
  { path: "/admin/locais", label: "Locais", icon: MapPin, team: true },
  { path: "/admin/pops", label: "POPs", icon: ClipboardList, team: true },
  { path: "/admin/escalas", label: "Escalas", icon: UsersRound, team: true },
  { path: "/admin/midia", label: "Mídia", icon: Clapperboard, team: true },
  { path: "/admin/confirmacoes", label: "Confirmações", icon: Eye },
  { path: "/admin/aprovacoes", label: "Aprovações", icon: ClipboardCheck, badge: "approvals" },
  { path: "/admin/ministerios", label: "Ministérios", icon: Church },
  { path: "/admin/usuarios", label: "Usuários", icon: UserCog },
  { path: "/admin/notifications", label: "Notificações", icon: Bell, badge: "notifications" },
  { path: "/admin/audit", label: "Auditoria", icon: ScrollText },
  { path: "/admin/health", label: "Saúde & Logs", icon: Activity },
  { path: "/admin/settings", label: "Configurações", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState<Record<BadgeKey, number>>({ notifications: 0, approvals: 0 });
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === "admin";
  const visibleItems = isAdmin ? navItems : navItems.filter((item) => item.team);
  const current = visibleItems.find(
    (i) => location.pathname === i.path || (i.path !== "/admin" && location.pathname.startsWith(i.path))
  );

  useEffect(() => {
    if (!isAdmin) return;
    loadCounts();
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Fecha a gaveta do celular ao trocar de tela
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const loadCounts = async () => {
    const [n, a] = await Promise.all([
      api.get<{ count: number }>("/api/notifications/admin/unread-count").catch(() => ({ count: 0 })),
      api.get<{ count: number }>("/api/events/pending-count").catch(() => ({ count: 0 })),
    ]);
    setCounts({ notifications: n.count || 0, approvals: a.count || 0 });
  };

  /** Menu (usado na barra lateral do computador e na gaveta do celular) */
  const nav = (compact: boolean) => (
    <>
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border shrink-0">
        <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-md object-contain" />
        {!compact && <span className="font-semibold text-foreground tracking-tight text-sm">D.Sync</span>}
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-2 space-y-1">
        {visibleItems.map((item) => {
          const active = item === current;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={compact ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors relative ${
                active
                  ? "bg-sidebar-accent text-primary shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!compact && <span>{item.label}</span>}
              {item.badge && counts[item.badge] > 0 && (
                <Badge
                  variant="destructive"
                  className={compact ? "absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs" : "ml-auto"}
                >
                  {counts[item.badge]}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border space-y-1 shrink-0">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-full py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!compact && <span className="ml-3 text-sm">{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>}
        </button>
        <button
          onClick={signOut}
          title="Sair"
          className="flex items-center justify-center w-full py-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!compact && <span className="ml-3 text-sm">Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Computador: barra lateral fixa e recolhível */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 h-full z-30 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {nav(collapsed)}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center mx-2 mb-2 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Celular/tablet: menu em gaveta */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0 flex flex-col bg-sidebar">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {nav(false)}
        </SheetContent>
      </Sheet>

      <main className={`flex-1 min-w-0 transition-all duration-300 ${collapsed ? "md:ml-16" : "md:ml-60"}`}>
        <header className="sticky top-0 z-20 h-14 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden -ml-1 p-2 rounded-md hover:bg-muted relative"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
              {isAdmin && counts.approvals + counts.notifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
              )}
            </button>
            <span className="md:hidden font-medium text-sm truncate">{current?.label}</span>
            <span className="hidden md:flex items-center gap-2">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground font-mono">Sistema Operacional</span>
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
            <span className="text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-none">{isAdmin ? "Admin" : user?.email}</span>
          </div>
        </header>
        <div className="p-4 md:p-6">
          <PageHelpBox path={location.pathname} />
          {children}
        </div>
      </main>
    </div>
  );
}
