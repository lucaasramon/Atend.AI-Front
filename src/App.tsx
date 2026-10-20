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
// import Dashboard from "@/pages/Dashboard"; // oculto
// import Clients from "@/pages/Clients"; // oculto
// import ClientDetail from "@/pages/ClientDetail"; // oculto
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
import UsersPage from "@/pages/UsersPage";
import FirstAccess from "@/pages/FirstAccess";
import MinistriesPage from "@/pages/MinistriesPage";
import LocationsPage from "@/pages/LocationsPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import PopsPage from "@/pages/PopsPage";
import MediaPage from "@/pages/MediaPage";
import AcksPage from "@/pages/AcksPage";
import ConfirmAck from "@/pages/ConfirmAck";
import RosterPage from "@/pages/RosterPage";
import MemberChecklist from "@/pages/MemberChecklist";
import SignupPage from "@/pages/SignupPage";
import EventSignupPage from "@/pages/EventSignupPage";
import PeoplePage from "@/pages/PeoplePage";
import FormsPage from "@/pages/FormsPage";
import SermonsPage from "@/pages/SermonsPage";
import HomePage from "@/pages/HomePage";
import SermonEditorPage from "@/pages/SermonEditorPage";
import PulpitPage from "@/pages/PulpitPage";
import PaymentSuccess from "@/pages/PaymentSuccess";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Perfis da equipe da agenda
const TEAM = ["admin", "agenda", "viewer"];

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
              <Route path="/primeiro-acesso" element={<FirstAccess />} />
              <Route path="/confirmar" element={<ConfirmAck />} />
              <Route path="/checklist" element={<MemberChecklist />} />
              <Route path="/cadastro" element={<SignupPage />} />
              <Route path="/inscricao/:slug" element={<EventSignupPage />} />
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
              {/* Dashboard e Clientes ocultos por enquanto: levam para a Agenda */}
              {/* <Route path="/admin" element={<AdminProtectedRoute><AdminLayout><Dashboard /></AdminLayout></AdminProtectedRoute>} /> */}
              {/* <Route path="/admin/clients" element={<AdminProtectedRoute><AdminLayout><Clients /></AdminLayout></AdminProtectedRoute>} /> */}
              {/* <Route path="/admin/clients/:id" element={<AdminProtectedRoute><AdminLayout><ClientDetail /></AdminLayout></AdminProtectedRoute>} /> */}
              <Route path="/admin" element={<Navigate to="/admin/inicio" replace />} />
              <Route path="/admin/inicio" element={<AdminProtectedRoute roles={TEAM}><AdminLayout><HomePage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/clients/*" element={<Navigate to="/admin/agenda" replace />} />
              <Route path="/admin/agenda" element={<AdminProtectedRoute roles={TEAM}><AdminLayout><Events /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/calendario" element={<AdminProtectedRoute roles={TEAM}><AdminLayout><CalendarPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/locais" element={<AdminProtectedRoute roles={TEAM}><AdminLayout><LocationsPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/pops" element={<AdminProtectedRoute roles={TEAM}><AdminLayout><PopsPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/escalas" element={<AdminProtectedRoute roles={TEAM}><AdminLayout><RosterPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/pregacoes" element={<AdminProtectedRoute roles={TEAM}><AdminLayout><SermonsPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/pregacoes/:id" element={<AdminProtectedRoute roles={TEAM}><AdminLayout><SermonEditorPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/pulpito/:id" element={<AdminProtectedRoute roles={TEAM}><PulpitPage /></AdminProtectedRoute>} />
              <Route path="/admin/inscricoes" element={<AdminProtectedRoute roles={["admin", "agenda"]}><AdminLayout><FormsPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/cadastros" element={<AdminProtectedRoute><AdminLayout><PeoplePage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/midia" element={<AdminProtectedRoute roles={TEAM}><AdminLayout><MediaPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/confirmacoes" element={<AdminProtectedRoute><AdminLayout><AcksPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/aprovacoes" element={<AdminProtectedRoute><AdminLayout><ApprovalsPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/ministerios" element={<AdminProtectedRoute><AdminLayout><MinistriesPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/usuarios" element={<AdminProtectedRoute><AdminLayout><UsersPage /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/notifications" element={<AdminProtectedRoute><AdminLayout><AdminNotifications /></AdminLayout></AdminProtectedRoute>} />
              <Route path="/admin/audit" element={<AdminProtectedRoute><AdminLayout><AuditLogs /></AdminLayout></AdminProtectedRoute>} />
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
