import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import ResetPassword from "@/pages/ResetPassword";
import ClientDashboard from "@/pages/client/ClientDashboard";
import ClientLeads from "@/pages/client/ClientLeads";
import ClientBilling from "@/pages/client/ClientBilling";
import ClientTemplates from "@/pages/client/ClientTemplates";
import ClientOnboarding from "@/pages/client/ClientOnboarding";
import ClientProfile from "@/pages/client/ClientProfile";
import AdminNotifications from "@/pages/AdminNotifications";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Client Area - Protected */}
            <Route path="/client/onboarding" element={<ProtectedRoute><ClientOnboarding /></ProtectedRoute>} />
            <Route path="/client/dashboard" element={<ProtectedRoute><ClientLayout><ClientDashboard /></ClientLayout></ProtectedRoute>} />
            <Route path="/client/leads" element={<ProtectedRoute><ClientLayout><ClientLeads /></ClientLayout></ProtectedRoute>} />
            <Route path="/client/billing" element={<ProtectedRoute><ClientLayout><ClientBilling /></ClientLayout></ProtectedRoute>} />
            <Route path="/client/templates" element={<ProtectedRoute><ClientLayout><ClientTemplates /></ClientLayout></ProtectedRoute>} />
            <Route path="/client/profile" element={<ProtectedRoute><ClientLayout><ClientProfile /></ClientLayout></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<AdminProtectedRoute><AdminLayout><Dashboard /></AdminLayout></AdminProtectedRoute>} />
            <Route path="/admin/clients" element={<AdminProtectedRoute><AdminLayout><Clients /></AdminLayout></AdminProtectedRoute>} />
            <Route path="/admin/clients/:id" element={<AdminProtectedRoute><AdminLayout><ClientDetail /></AdminLayout></AdminProtectedRoute>} />
            <Route path="/admin/notifications" element={<AdminProtectedRoute><AdminLayout><AdminNotifications /></AdminLayout></AdminProtectedRoute>} />
            <Route path="/admin/automations" element={<AdminProtectedRoute><AdminLayout><Automations /></AdminLayout></AdminProtectedRoute>} />
            <Route path="/admin/health" element={<AdminProtectedRoute><AdminLayout><Health /></AdminLayout></AdminProtectedRoute>} />
            <Route path="/admin/settings" element={<AdminProtectedRoute><AdminLayout><SettingsPage /></AdminLayout></AdminProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
