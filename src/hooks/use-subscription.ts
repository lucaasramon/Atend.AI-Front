import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface SubscriptionState {
  subscribed: boolean;
  planId: string | null;
  subscriptionEnd: string | null;
  cardInfo: { brand: string; last4: string; exp_month: number; exp_year: number } | null;
  loading: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    planId: null,
    subscriptionEnd: null,
    cardInfo: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({ subscribed: false, planId: null, subscriptionEnd: null, cardInfo: null, loading: false });
      return;
    }
    try {
      const profile = await api.get<any>("/api/profiles/me");
      const subscribed = profile.subscription_status === "active" || profile.subscription_status === "trialing";
      setState({
        subscribed,
        planId: profile.plan || null,
        subscriptionEnd: profile.subscription_end || null,
        cardInfo: profile.card_last4
          ? { brand: profile.card_brand, last4: profile.card_last4, exp_month: profile.card_exp_month, exp_year: profile.card_exp_year }
          : null,
        loading: false,
      });
    } catch {
      setState({ subscribed: false, planId: null, subscriptionEnd: null, cardInfo: null, loading: false });
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return { ...state, refresh: checkSubscription };
}
