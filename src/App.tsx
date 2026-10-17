import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import ClientLayout from "@/components/ClientLayout";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Automations from "@/pages/Automations";
import Health from "@/pages/Health";
import SettingsPage from "@/pages/SettingsPage";
import AuditLogs from "@/pages/AuditLogs";
// Landing page desativada: o acesso à raiz vai direto para o login
// import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import ResetPassword from "@/pages/ResetPassword";
import EmailConfirmed from "@/pages/EmailConfirmed";
import ClientDashboard from "@/pages/client/ClientDashboard";
import ClientLeads from "@/pages/client/ClientLeads";
import ClientBilling from "@/pages/client/ClientBilling";
import ClientTemplates from "@/pages/client/ClientTemplates";
import ClientOnboarding from "@/pages/client/ClientOnboarding";
import ClientProfile from "@/pages/client/ClientProfile";
import ClientKnowledgeBase from "@/pages/client/ClientKnowledgeBase";
import ClientHelp from "@/pages/client/ClientHelp";
import AdminNotifications from "@/pages/AdminNotifications";
import Events from "@/pages/Events";
import CalendarPage from "@/pages/CalendarPage";
import PaymentSuccess from "@/pages/PaymentSuccess";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public */}
              {/* <Route path="/" element={<LandingPage />} /> */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/email-confirmed" element={<EmailConfirmed />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />

              {/* Client Area - Protected */}
              <Route path="/client/onboarding" element={<ProtectedRoute><ClientOnboarding /></ProtectedRoute>} />
              <Route path="/client/dashboard" element={<ProtectedRoute><ClientLayout><ClientDashboard /></ClientLayout></ProtectedRoute>} />
              <Route path="/client/leads" element={<ProtectedRoute><ClientLayout><ClientLeads /></ClientLayout></ProtectedRoute>} />
              <Route path="/client/billing" element={<ProtectedRoute><ClientLayout><ClientBilling /></ClientLayout></ProtectedRoute>} />
              <Route path="/client/templates" element={<ProtectedRoute><ClientLayout><ClientTemplates /></ClientLayout></ProtectedRoute>} />
              <Route path="/client/profile" element={<ProtectedRoute><ClientLayout><ClientProfile /></ClientLayout></ProtectedRoute>} />
              <Route path="/client/knowledge" element={<ProtectedRoute><ClientLayout><ClientKnowledgeBase /></ClientLayout></ProtectedRoute>} />
              <Route path="/client/help" element={<ProtectedRoute><ClientLayout><ClientHelp /></ClientLayout></ProtectedRoute>} />

              {/* Admin Area - Protected */}
              <Route path="/admin" element={<AdminProtectedRoute><AdminLayout><Dashboard /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/clients" element={<AdminProtectedRoute><AdminLayout><Clients /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/clients/:id" element={<AdminProtectedRoute><AdminLayout><ClientDetail /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/agenda" element={<AdminProtectedRoute roles={["admin", "agenda"]}><AdminLayout><Events /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/calendario" element={<AdminProtectedRoute roles={["admin", "agenda"]}><AdminLayout><CalendarPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/notifications" element={<AdminProtectedRoute><AdminLayout><AdminNotifications /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/audit" element={<AdminProtectedRoute><AdminLayout><AuditLogs /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/automations" element={<AdminProtectedRoute><AdminLayout><Automations /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/health" element={<AdminProtectedRoute><AdminLayout><Health /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/settings" element={<AdminProtectedRoute><AdminLayout><SettingsPage /></AdminLayout></AdminProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
