import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { subscribed, loading: subLoading } = useSubscription();
  const location = useLocation();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (!user) {
      setCheckingOnboarding(false);
      return;
    }
    setCheckingOnboarding(true);
    api.get<{ onboarding_completed: boolean }>("/api/profiles/me")
      .then((p) => setOnboardingCompleted(p.onboarding_completed ?? false))
      .catch(() => setOnboardingCompleted(false))
      .finally(() => setCheckingOnboarding(false));
  }, [user, location.pathname]);

  if (authLoading || subLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const isBillingPage = location.pathname === "/client/billing";
  const isOnboardingPage = location.pathname === "/client/onboarding";

  // Bloqueia acesso à plataforma até ter assinatura ativa
  if (!subscribed && !isBillingPage) {
    return <Navigate to="/client/billing" replace />;
  }

  // Após pagamento, exige onboarding
  if (subscribed && !onboardingCompleted && !isOnboardingPage && !isBillingPage) {
    return <Navigate to="/client/onboarding" replace />;
  }

  return <>{children}</>;
}
