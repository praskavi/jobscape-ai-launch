"use client";

import * as React from "react";
import { CircleSlash, CreditCard, Loader2 } from "lucide-react";

type BillingActionButtonProps = {
  planCode: string;
  planName: string;
  currentPlanCode: string;
  isCurrent: boolean;
  highlighted?: boolean;
};

export function BillingActionButton({
  planCode,
  planName,
  currentPlanCode,
  isCurrent,
  highlighted = false,
}: BillingActionButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    if (planCode === "free") {
      return;
    }

    setIsLoading(true);
    setError(null);

    const shouldUsePortal = isCurrent || currentPlanCode !== "free";
    const endpoint = shouldUsePortal ? "/api/billing/portal" : "/api/billing/checkout";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: isCurrent ? undefined : JSON.stringify({ planCode }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.url) {
      setError(data?.error ?? "Unable to start billing flow.");
      setIsLoading(false);
      return;
    }

    window.location.href = data.url;
  };

  if (isCurrent && planCode === "free") {
    return (
      <button
        type="button"
        disabled
        className="mt-7 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground"
      >
        <CircleSlash className="h-4 w-4" />
        Current plan
      </button>
    );
  }

  return (
    <div className="mt-7 space-y-2">
      <button
        type="button"
        disabled={isLoading}
        onClick={handleClick}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${
          highlighted
            ? "bg-background text-foreground"
            : "bg-foreground text-background"
        }`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {isCurrent ? "Manage billing" : currentPlanCode === "free" ? `Choose ${planName}` : `Switch to ${planName}`}
      </button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
