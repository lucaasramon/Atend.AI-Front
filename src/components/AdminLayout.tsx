import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
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
  ClipboardPen,
  UserPlus,
  BookOpen,
  House,
} from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "@/components/ThemeProvider";
import PageHelpBox from "@/components/PageHelpBox";
import InstallAppButton from "@/components/InstallAppButton";
import { useAuth } from "@/contexts/AuthContext";

type BadgeKey = "notifications" | "approvals" | "people";

// team: também aparece para os perfis "agenda" e "viewer"; editors: só admin e agenda
const navItems: { path: string; label: string; icon: typeof LayoutDashboard; badge?: BadgeKey; team?: boolean; editors?: boolean }[] = [
  // Ocultos por enquanto (atendimento por IA):
  // { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  // { path: "/admin/clients", label: "Clientes", icon: Users },
  { path: "/admin/inicio", label: "Início", icon: House, team: true },
  { path: "/admin/agenda", label: "Agenda", icon: CalendarDays, team: true },
  { path: "/admin/calendario", label: "Calendário", icon: CalendarRange, team: true },
  { path: "/admin/locais", label: "Locais", icon: MapPin, team: true },
  { path: "/admin/pops", label: "POPs", icon: ClipboardList, team: true },
  { path: "/admin/escalas", label: "Escalas", icon: UsersRound, team: true },
  { path: "/admin/midia", label: "Mídia", icon: Clapperboard, team: true },
  { path: "/admin/pregacoes", label: "Pregações", icon: BookOpen, team: true },
  { path: "/admin/inscricoes", label: "Inscrições", icon: ClipboardPen, editors: true },
  { path: "/admin/cadastros", label: "Cadastros", icon: UserPlus, badge: "people" },
  { path: "/admin/confirmacoes", label: "Confirmações", icon: Eye },
  { path: "/admin/aprovacoes", label: "Aprovações", icon: ClipboardCheck, badge: "approvals" },
  { path: "/admin/ministerios", label: "Ministérios", icon: Church },
  { path: "/admin/usuarios", label: "Usuários", icon: UserCog },
  { path: "/admin/notifications", label: "Notificações", icon: Bell, badge: "notifications" },
  { path: "/admin/audit", label: "Auditoria", icon: ScrollText },
  { path: "/admin/health", label: "Saúde & Logs", icon: Activity },
  { path: "/admin/settings", label: "Configurações", icon: Settings },
];

const ROLE_LABEL: Record<string, string> = { admin: "Administrador", agenda: "Agenda", viewer: "Visualizador" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState<Record<BadgeKey, number>>({ notifications: 0, approvals: 0, people: 0 });
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === "admin";
  const visibleItems = isAdmin
    ? navItems
    : navItems.filter((item) => item.team || (item.editors && user?.role === "agenda"));
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
    const [n, a, p] = await Promise.all([
      api.get<{ count: number }>("/api/notifications/admin/unread-count").catch(() => ({ count: 0 })),
      api.get<{ count: number }>("/api/events/pending-count").catch(() => ({ count: 0 })),
      api.get<{ count: number }>("/api/people/new-count").catch(() => ({ count: 0 })),
    ]);
    setCounts({ notifications: n.count || 0, approvals: a.count || 0, people: p.count || 0 });
  };

  // Cartão da pessoa logada no rodapé do menu
  const displayName = user?.full_name || user?.email || "";
  const initials = displayName.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const subtitle = user?.church_role || ROLE_LABEL[user?.role || ""] || "";
  const avatarClass = "w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0";
  const iconBtn = "p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0";

  /** Menu (usado na barra lateral do computador e na gaveta do celular) */
  const nav = (compact: boolean) => (
    <>
      <div className={`flex items-center gap-2 h-14 bg-primary shrink-0 ${compact ? "justify-center px-2" : "px-4"}`}>
        <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-md object-contain" />
        {!compact && <span className="font-bold text-primary-foreground tracking-tight">D.Sync</span>}
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
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
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

      {/* Rodapé: instalar o app + cartão da pessoa logada (tema e sair) */}
      <div className="p-2 border-t border-sidebar-border space-y-2 shrink-0">
        <InstallAppButton
          compact={compact}
          className={`flex items-center w-full rounded-md text-sm font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors ${
            compact ? "justify-center py-2.5" : "px-3 py-2.5"
          }`}
        />
        {compact ? (
          <div className="flex flex-col items-center gap-1">
            <span className={avatarClass} title={`${displayName} · ${subtitle}`}>{initials}</span>
            <button onClick={toggleTheme} className={iconBtn} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={signOut} className={`${iconBtn} hover:text-destructive`} title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
            <span className={avatarClass}>{initials}</span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
            </div>
            <button onClick={toggleTheme} className={iconBtn} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={signOut} className={`${iconBtn} hover:text-destructive`} title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
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
        {/* Recolher/expandir: botão redondo na borda do menu */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[18px] w-6 h-6 rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm flex items-center justify-center hover:text-primary hover:border-primary/40 transition-colors"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
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
        {/* Barra do topo na cor da marca */}
        <header className="sticky top-0 z-20 h-14 flex items-center justify-between gap-3 px-4 md:px-6 bg-primary text-primary-foreground shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden -ml-1 p-2 rounded-md hover:bg-black/10 relative"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
              {isAdmin && counts.approvals + counts.notifications + counts.people > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
              )}
            </button>
            {current && <current.icon className="hidden md:block w-4 h-4 shrink-0" />}
            <span className="font-semibold truncate">{current?.label}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium truncate max-w-[140px] sm:max-w-none opacity-80">{displayName}</span>
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
