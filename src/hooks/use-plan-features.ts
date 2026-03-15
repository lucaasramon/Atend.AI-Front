import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";

export interface PlanFeatures {
  canAccessLeads: boolean;
  canSendAudio: boolean;
  canSendFiles: boolean;
  canUseMultiChannel: boolean;
  canUseKnowledgeBase: boolean;
  canUseSentimentAnalysis: boolean;
  canUseApi: boolean;
  canUseWebhooks: boolean;
  maxChannels: number;
  planId: string | null;
  loading: boolean;
}

const PLAN_FEATURES: Record<string, Partial<PlanFeatures>> = {
  starter: {
    canAccessLeads: false,
    canSendAudio: false,
    canSendFiles: false,
    canUseMultiChannel: false,
    canUseKnowledgeBase: false,
    canUseSentimentAnalysis: false,
    canUseApi: false,
    canUseWebhooks: false,
    maxChannels: 1,
  },
  pro: {
    canAccessLeads: true,
    canSendAudio: true,
    canSendFiles: true,
    canUseMultiChannel: true,
    canUseKnowledgeBase: true,
    canUseSentimentAnalysis: true,
    canUseApi: false,
    canUseWebhooks: false,
    maxChannels: 3,
  },
  business: {
    canAccessLeads: true,
    canSendAudio: true,
    canSendFiles: true,
    canUseMultiChannel: true,
    canUseKnowledgeBase: true,
    canUseSentimentAnalysis: true,
    canUseApi: true,
    canUseWebhooks: true,
    maxChannels: 999,
  },
};

const DEFAULT_FEATURES: PlanFeatures = {
  canAccessLeads: false,
  canSendAudio: false,
  canSendFiles: false,
  canUseMultiChannel: false,
  canUseKnowledgeBase: false,
  canUseSentimentAnalysis: false,
  canUseApi: false,
  canUseWebhooks: false,
  maxChannels: 1,
  planId: null,
  loading: true,
};

export function usePlanFeatures(): PlanFeatures {
  const { user } = useAuth();
  const { planId, loading: subLoading } = useSubscription();
  const [profilePlan, setProfilePlan] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      setProfilePlan(data?.plan || null);
      setProfileLoading(false);
    };
    load();
  }, [user]);

  const effectivePlan = planId || profilePlan || "starter";
  const features = PLAN_FEATURES[effectivePlan] || PLAN_FEATURES.starter;

  return {
    ...DEFAULT_FEATURES,
    ...features,
    planId: effectivePlan,
    loading: subLoading || profileLoading,
  };
}
