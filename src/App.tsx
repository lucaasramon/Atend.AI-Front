import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Client Area */}
          <Route path="/client/dashboard" element={<ClientLayout><ClientDashboard /></ClientLayout>} />
          <Route path="/client/leads" element={<ClientLayout><ClientLeads /></ClientLayout>} />
          <Route path="/client/billing" element={<ClientLayout><ClientBilling /></ClientLayout>} />
          <Route path="/client/templates" element={<ClientLayout><ClientTemplates /></ClientLayout>} />

          {/* Admin */}
          <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
          <Route path="/admin/clients" element={<AdminLayout><Clients /></AdminLayout>} />
          <Route path="/admin/clients/:id" element={<AdminLayout><ClientDetail /></AdminLayout>} />
          <Route path="/admin/automations" element={<AdminLayout><Automations /></AdminLayout>} />
          <Route path="/admin/health" element={<AdminLayout><Health /></AdminLayout>} />
          <Route path="/admin/settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
