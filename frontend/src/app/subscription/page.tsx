import { createClient } from "@/utils/supabase/server";
import { BillingActionButton } from "@/components/subscription/BillingActionButton";
import { Check, Crown, Gauge, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Subscription - Jobscape AI",
  description: "View your Jobscape AI plan, usage limits, and upgrade options.",
};

const plans = [
  {
    name: "Free",
    code: "free",
    price: "$0",
    description: "For getting started with resume matching.",
    features: [
      "Unlimited job search",
      "1 active resume",
      "3 ATS checks / month",
      "AI job match disabled",
      "Basic dashboard",
    ],
  },
  {
    name: "Basic",
    code: "basic",
    price: "$19",
    description: "For active job seekers using AI-powered matching.",
    highlighted: true,
    features: [
      "Unlimited job search",
      "1 active resume",
      "10 ATS checks / month",
      "20 AI job matches / month",
      "10 resume enhancements / month",
      "10 cover letters / month",
      "Top 10 premium recommendations",
    ],
  },
  {
    name: "Premium",
    code: "premium",
    price: "$49",
    description: "For power users who need deeper AI assistance.",
    features: [
      "Unlimited job search",
      "3 active resumes",
      "60 ATS checks / month",
      "50 AI job matches / month",
      "30 resume enhancements / month",
      "20 cover letters / month",
      "Top 20 premium recommendations",
    ],
  },
];

type SubscriptionFeature = {
  feature_code: string;
  feature_name: string;
  feature_type?: string;
  is_enabled: boolean;
  usage_limit: number | null;
  usage_count: number | null;
  remaining: number | null;
};

type SubscriptionSummary = {
  plan: {
    plan_code: string;
    plan_name: string;
    status: string;
  } | null;
  features: SubscriptionFeature[];
};

const fallbackSummary: SubscriptionSummary = {
  plan: {
    plan_code: "free",
    plan_name: "Free",
    status: "free",
  },
  features: [
    { feature_code: "resume_upload", feature_name: "Resume uploads", is_enabled: true, usage_limit: 1, usage_count: 0, remaining: 1 },
    { feature_code: "job_search", feature_name: "Job searches", is_enabled: true, usage_limit: null, usage_count: null, remaining: null },
    { feature_code: "ats_score", feature_name: "ATS checks", is_enabled: true, usage_limit: 3, usage_count: 0, remaining: 3 },
    { feature_code: "ai_job_match", feature_name: "AI job matches", is_enabled: false, usage_limit: 0, usage_count: 0, remaining: 0 },
    { feature_code: "resume_generate", feature_name: "Resume enhancements", is_enabled: false, usage_limit: 0, usage_count: 0, remaining: 0 },
    { feature_code: "cover_letter_generate", feature_name: "Cover letters", is_enabled: false, usage_limit: 0, usage_count: 0, remaining: 0 },
    { feature_code: "premium_recommendations", feature_name: "Premium recommendations", feature_type: "boolean", is_enabled: false, usage_limit: 0, usage_count: null, remaining: null },
  ],
};

const usageFeatureOrder = [
  "resume_upload",
  "job_search",
  "ats_score",
  "ai_job_match",
  "resume_generate",
  "cover_letter_generate",
  "premium_recommendations",
];

const featureLabels: Record<string, string> = {
  resume_upload: "Resume uploads",
  job_search: "Job searches",
  ats_score: "ATS checks",
  ai_job_match: "AI job matches",
  resume_generate: "Resume enhancements",
  cover_letter_generate: "Cover letters",
  premium_recommendations: "Premium recommendations",
};

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subscriptionData } = await supabase.rpc("get_user_subscription_summary");
  const summary = (subscriptionData as SubscriptionSummary | null) ?? fallbackSummary;
  const currentPlanCode = summary.plan?.plan_code ?? "free";
  const currentPlan = plans.find((plan) => plan.code === currentPlanCode) ?? plans[0];
  const usageRows = usageFeatureOrder.map((featureCode) => {
    const feature = summary.features.find((item) => item.feature_code === featureCode)
      ?? fallbackSummary.features.find((item) => item.feature_code === featureCode)!;

    return {
      label: featureLabels[feature.feature_code] ?? feature.feature_name,
      used: feature.usage_count ?? 0,
      limit: feature.usage_limit,
      remaining: feature.remaining,
      enabled: feature.is_enabled,
      isBoolean: feature.feature_type === "boolean",
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Subscription
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Plan and usage
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage monthly allowances for resume uploads, job searches, AI job
            matching, and ATS scoring.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Current plan
          </p>
          <div className="mt-1 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">
              {summary.plan?.plan_name ?? currentPlan.name}
            </span>
          </div>
          <p className="mt-1 text-xs capitalize text-muted-foreground">
            {summary.plan?.status ?? "free"}
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {usageRows.map((row) => {
          const numericLimit = typeof row.limit === "number" ? row.limit : null;
          const percentage = !row.isBoolean && numericLimit && numericLimit > 0
            ? Math.min((row.used / numericLimit) * 100, 100)
            : 0;
          const primaryValue = row.isBoolean
            ? row.enabled && numericLimit ? `Top ${numericLimit}` : "Locked"
            : row.used;
          const limitLabel = row.isBoolean
            ? "included"
            : numericLimit === null ? "Unlimited" : numericLimit;

          return (
            <div key={row.label} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {primaryValue}
                <span className="text-sm font-medium text-muted-foreground">
                  {" "}
                  {row.isBoolean ? limitLabel : `/ ${limitLabel}`}
                </span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {!row.enabled
                  ? "Not included in this plan"
                  : row.isBoolean
                    ? "Included with this plan"
                  : row.remaining === null
                    ? "Unlimited this month"
                    : `${row.remaining} remaining this month`}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlan.code;
          const isEmphasized = isCurrent || (currentPlan.code === "free" && plan.highlighted);

          return (
            <div
              key={plan.code}
              className={`rounded-lg border p-6 ${
                isEmphasized
                  ? "border-primary/40 bg-foreground text-background shadow-lift"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isEmphasized ? "text-background/70" : "text-muted-foreground"
                    }`}
                  >
                    {plan.name}
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {plan.price}
                    <span
                      className={`text-sm font-medium ${
                        isEmphasized ? "text-background/60" : "text-muted-foreground"
                      }`}
                    >
                      /month
                    </span>
                  </p>
                </div>
                {plan.code === "premium" ? (
                  <Crown className="h-5 w-5 text-primary" />
                ) : null}
              </div>

              <p
                className={`mt-3 text-sm ${
                  isEmphasized ? "text-background/70" : "text-muted-foreground"
                }`}
              >
                {plan.description}
              </p>

              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isEmphasized ? "text-lime" : "text-primary"
                      }`}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <BillingActionButton
                planCode={plan.code}
                planName={plan.name}
                currentPlanCode={currentPlan.code}
                isCurrent={isCurrent}
                highlighted={isEmphasized}
              />
            </div>
          );
        })}
      </section>
    </div>
  );
}
