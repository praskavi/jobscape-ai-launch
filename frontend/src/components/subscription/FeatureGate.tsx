"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useFeatureAccess } from "@/contexts/SubscriptionContext";

type FeatureGateProps = {
  featureCode: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function FeatureGate({ featureCode, children, fallback }: FeatureGateProps) {
  const { feature, isLoading, isEnabled } = useFeatureAccess(featureCode);

  if (isLoading) {
    return <div className="h-10 w-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (isEnabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {feature?.feature_name ?? "This feature"} is locked
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upgrade your plan to use this feature.
          </p>
          <Link
            href="/subscription"
            className="mt-3 inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-semibold text-background hover:opacity-90"
          >
            View plans
          </Link>
        </div>
      </div>
    </div>
  );
}
