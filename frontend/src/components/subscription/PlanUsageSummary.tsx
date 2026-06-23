"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { UsageCounter } from "./UsageCounter";
import { useSubscription } from "@/contexts/SubscriptionContext";

const dashboardFeatures = [
  { code: "ats_score", label: "ATS checks" },
  { code: "ai_job_match", label: "AI job matches" },
  { code: "resume_generate", label: "Resume enhancements" },
  { code: "cover_letter_generate", label: "Cover letters" },
];

export function PlanUsageSummary() {
  const { summary, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <section className="mb-8 rounded-lg border border-border bg-surface p-5">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {dashboardFeatures.map((feature) => (
            <div key={feature.code} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {summary?.plan?.plan_name ?? "Free"} plan
            </p>
            <p className="text-xs capitalize text-muted-foreground">
              {summary?.plan?.status ?? "active"}
            </p>
          </div>
        </div>

        <Link
          href="/subscription"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          Manage plan
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {dashboardFeatures.map((feature) => (
          <UsageCounter
            key={feature.code}
            featureCode={feature.code}
            label={feature.label}
          />
        ))}
      </div>
    </section>
  );
}
