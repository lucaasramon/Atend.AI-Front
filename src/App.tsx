import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
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
            <Route path="/client/dashboard" element={<ProtectedRoute><ClientLayout><ClientDashboard /></ClientLayout></ProtectedRoute>} />
            <Route path="/client/leads" element={<ProtectedRoute><ClientLayout><ClientLeads /></ClientLayout></ProtectedRoute>} />
            <Route path="/client/billing" element={<ProtectedRoute><ClientLayout><ClientBilling /></ClientLayout></ProtectedRoute>} />
            <Route path="/client/templates" element={<ProtectedRoute><ClientLayout><ClientTemplates /></ClientLayout></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
            <Route path="/admin/clients" element={<AdminLayout><Clients /></AdminLayout>} />
            <Route path="/admin/clients/:id" element={<AdminLayout><ClientDetail /></AdminLayout>} />
            <Route path="/admin/automations" element={<AdminLayout><Automations /></AdminLayout>} />
            <Route path="/admin/health" element={<AdminLayout><Health /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
