import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, FileText, LogOut, Zap, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { path: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/client/leads", label: "Leads", icon: Users },
  { path: "/client/templates", label: "Templates", icon: FileText },
  { path: "/client/billing", label: "Pagamento", icon: CreditCard },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
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
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                    active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
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
