import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, FileText, LogOut, Zap, Menu, X, Lock, UserCircle, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/components/ThemeProvider";
import SupportDialog from "@/components/SupportDialog";

const navItems = [
  { path: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard, requiredFeature: null },
  { path: "/client/leads", label: "Leads", icon: Users, requiredFeature: "canAccessLeads" as const },
  { path: "/client/templates", label: "Templates", icon: FileText, requiredFeature: null },
  { path: "/client/billing", label: "Pagamento", icon: CreditCard, requiredFeature: null },
  { path: "/client/profile", label: "Perfil", icon: UserCircle, requiredFeature: null },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useAuth();
  const features = usePlanFeatures();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const isFeatureLocked = (requiredFeature: string | null) => {
    if (!requiredFeature || features.loading) return false;
    return !(features as any)[requiredFeature];
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/client/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">AtendIA</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = location.pathname === item.path;
                const locked = isFeatureLocked(item.requiredFeature);

                if (locked) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground/50 cursor-not-allowed">
                          <item.icon className="w-4 h-4" />
                          {item.label}
                          <Lock className="w-3 h-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent><p>Disponível no plano Pro ou superior</p></TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="hidden md:flex" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-border px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const locked = isFeatureLocked(item.requiredFeature);
              return (
                <Link
                  key={item.path}
                  to={locked ? "#" : item.path}
                  onClick={(e) => { if (locked) e.preventDefault(); else setMobileOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                    locked ? "text-muted-foreground/50 cursor-not-allowed" : active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {locked && <Lock className="w-3 h-3 ml-auto" />}
                </Link>
              );
            })}
            <button onClick={() => { setMobileOpen(false); handleLogout(); }} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground w-full">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        )}
      </nav>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
