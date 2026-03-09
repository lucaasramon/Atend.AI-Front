import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPlanByPriceId } from "@/lib/stripe-plans";

interface CardInfo {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface SubscriptionState {
  subscribed: boolean;
  priceId: string | null;
  planId: string | null;
  subscriptionEnd: string | null;
  cardInfo: CardInfo | null;
  loading: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    priceId: null,
    planId: null,
    subscriptionEnd: null,
    cardInfo: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      const plan = data.price_id ? getPlanByPriceId(data.price_id) : null;
      setState({
        subscribed: data.subscribed ?? false,
        priceId: data.price_id ?? null,
        planId: plan?.id ?? null,
        subscriptionEnd: data.subscription_end ?? null,
        cardInfo: data.card_info ?? null,
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return { ...state, refresh: checkSubscription };
}
