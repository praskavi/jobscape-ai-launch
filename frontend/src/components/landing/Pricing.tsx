"use client";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { tiers } from "../../lib/landingData";
import { useRouter } from "next/navigation";

function PricingCard({ t }: { t: typeof tiers[0] }) {
  const router = useRouter();
  return (
    <div className={cn(
      "relative flex flex-col rounded-3xl border p-7 transition-all",
      t.highlight ? "border-primary/40 bg-foreground text-background shadow-lift" : "border-border bg-surface hover:shadow-soft"
    )}>
      {t.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-lime-foreground">
          Most Popular
        </span>
      )}
      <div>
        <p className={cn("text-sm font-medium", t.highlight ? "text-background/70" : "text-muted-foreground")}>{t.name}</p>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-semibold tracking-tight">{t.price}</span>
          <span className={cn("text-sm", t.highlight ? "text-background/60" : "text-muted-foreground")}>/month</span>
        </div>
        <p className={cn("mt-1 text-sm", t.highlight ? "text-background/70" : "text-muted-foreground")}>{t.blurb}</p>
      </div>
      <ul className="my-7 space-y-3 text-sm">
        {t.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className={cn("mt-0.5 h-4 w-4 shrink-0", t.highlight ? "text-lime" : "text-primary")} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button onClick={() => router.push("/pricing")} className={cn(
        "mt-auto inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:scale-[1.02]",
        t.highlight ? "bg-background text-foreground" : "bg-foreground text-background"
      )}>
        {t.cta} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="border-y border-border bg-surface/50">
      <div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Pricing</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">Simple pricing for smarter job search</h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when you want AI-powered ATS insights.</p>
        </div>
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {tiers.map((t) => <PricingCard key={t.name} t={t} />)}
        </div>
      </div>
    </section>
  );
}
