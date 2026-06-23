"use client";

import { Gauge } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useFeatureAccess } from "@/contexts/SubscriptionContext";

type UsageCounterProps = {
  featureCode: string;
  label: string;
  compact?: boolean;
  className?: string;
};

export function UsageCounter({
  featureCode,
  label,
  compact,
  className,
}: UsageCounterProps) {
  const { feature, isLoading } = useFeatureAccess(featureCode);

  if (isLoading) {
    return (
      <div className={cn("rounded-lg border border-border bg-surface p-3", className)}>
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-2 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!feature) return null;

  const used = feature.usage_count ?? 0;
  const limit = feature.usage_limit;
  const isBoolean = feature.feature_type === "boolean";
  const hasNumericLimit = typeof limit === "number" && limit > 0 && !isBoolean;
  const percentage = hasNumericLimit ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = hasNumericLimit && percentage >= 80;

  return (
    <div className={cn("rounded-lg border border-border bg-surface p-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {!feature.is_enabled
              ? "Locked on current plan"
              : isBoolean
                ? "Included in current plan"
                : limit === null
                  ? "Unlimited this month"
                  : `${used} / ${limit} used`}
          </p>
        </div>
        <Gauge className={cn("h-4 w-4", isNearLimit ? "text-amber-500" : "text-muted-foreground")} />
      </div>

      {!compact && hasNumericLimit && (
        <Progress
          value={percentage}
          className={cn("mt-3 h-2", isNearLimit && "[&>div]:bg-amber-500")}
        />
      )}
    </div>
  );
}
