"use client";

import * as React from "react";
import { supabase } from "@/controllers/suabaseClient";

export type SubscriptionFeature = {
  feature_code: string;
  feature_name: string;
  feature_type?: string | null;
  is_enabled: boolean;
  usage_limit: number | null;
  usage_count: number | null;
  remaining: number | null;
};

export type SubscriptionSummary = {
  plan: {
    plan_code: string;
    plan_name: string;
    status: string;
  } | null;
  features: SubscriptionFeature[];
};

type SubscriptionContextValue = {
  summary: SubscriptionSummary | null;
  features: Record<string, SubscriptionFeature>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getFeature: (featureCode: string) => SubscriptionFeature | null;
};

const SubscriptionContext = React.createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = React.useState<SubscriptionSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("get_user_subscription_summary");

    if (rpcError) {
      console.error("Could not load subscription summary", rpcError);
      setError("Could not load subscription details.");
      setSummary(null);
      setIsLoading(false);
      return;
    }

    setSummary((data as SubscriptionSummary | null) ?? null);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (isMounted) {
        setIsLoading(true);
      }
      await refresh();
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) {
        setIsLoading(true);
      }
      void refresh();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refresh]);

  const features = React.useMemo(() => {
    return Object.fromEntries(
      (summary?.features ?? []).map((feature) => [feature.feature_code, feature]),
    );
  }, [summary]);

  const value = React.useMemo<SubscriptionContextValue>(
    () => ({
      summary,
      features,
      isLoading,
      error,
      refresh,
      getFeature: (featureCode: string) => features[featureCode] ?? null,
    }),
    [error, features, isLoading, refresh, summary],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = React.useContext(SubscriptionContext);

  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }

  return context;
}

export function useFeatureAccess(featureCode: string) {
  const { getFeature, isLoading } = useSubscription();
  const feature = getFeature(featureCode);

  return {
    feature,
    isLoading,
    isEnabled: Boolean(feature?.is_enabled),
    remaining: feature?.remaining ?? null,
    usageLimit: feature?.usage_limit ?? null,
    usageCount: feature?.usage_count ?? null,
  };
}
