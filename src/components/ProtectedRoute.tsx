import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { subscribed, loading: subLoading } = useSubscription();
  const location = useLocation();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setOnboardingCompleted(data?.onboarding_completed ?? false);
      } catch (error) {
        console.error("Error checking onboarding:", error);
        setOnboardingCompleted(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [user]);

  if (authLoading || subLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Allow access to billing page without subscription
  const isBillingPage = location.pathname === "/client/billing";
  const isOnboardingPage = location.pathname === "/client/onboarding";

  if (!subscribed && !isBillingPage && !isOnboardingPage) {
    return <Navigate to="/client/billing" replace />;
  }

  // If user is subscribed but hasn't completed onboarding, redirect to onboarding
  // (except if already on onboarding or billing pages)
  if (
    subscribed && 
    !onboardingCompleted && 
    !isOnboardingPage &&
    !isBillingPage
  ) {
    return <Navigate to="/client/onboarding" replace />;
  }

  return <>{children}</>;
}
