import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Bot,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  Bell,
  ScrollText,
  Sun,
  Moon,
  LogOut,
  CalendarDays,
} from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/clients", label: "Clientes", icon: Users },
  { path: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { path: "/admin/notifications", label: "Notificações", icon: Bell, badge: true },
  { path: "/admin/audit", label: "Auditoria", icon: ScrollText },
  { path: "/admin/automations", label: "Automações", icon: Bot },
  { path: "/admin/health", label: "Saúde & Logs", icon: Activity },
  { path: "/admin/settings", label: "Configurações", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  const handleLogout = () => signOut();

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const data = await api.get<{ count: number }>("/api/notifications/admin/unread-count");
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed top-0 left-0 h-full z-30 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-md object-contain" />
          {!collapsed && (
            <span className="font-semibold text-foreground tracking-tight text-sm">
              N8N Orchestrator
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path ||
              (item.path !== "/admin" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative ${
                  active
                    ? "bg-sidebar-accent text-primary shadow-glow"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {item.badge && unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className={`${collapsed ? 'absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs' : 'ml-auto'}`}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-sidebar-border space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-full py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={handleLogout}
            title="Sair"
            className="flex items-center justify-center w-full py-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-3 text-sm">Sair</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-16" : "ml-60"}`}>
        <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground font-mono">Sistema Operacional</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
