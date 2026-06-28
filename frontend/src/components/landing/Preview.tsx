import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

function ScorePill({ v, accent }: { v: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", accent ? "bg-accent" : "bg-foreground")} style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs font-medium">{v}</span>
    </div>
  );
}

export function DashboardPreview() {
  const rows = [
    { t: "Salesforce Developer", c: "Acme Cloud", l: "Melbourne", r: 91, a: 88, s: "Recommended", tone: "lime" },
    { t: "CRM Business Analyst", c: "Northwind", l: "Sydney", r: 83, a: 80, s: "Review", tone: "blue" },
    { t: "Data Reporting Analyst", c: "Helio Labs", l: "Remote", r: 74, a: 71, s: "Maybe", tone: "muted" },
  ];
  const chips = ["Top Matches", "Remote", "Recent", "AI Scored"];

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Dashboard</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">See your best-fit jobs first</h2>
          <p className="mt-4 text-muted-foreground">
            Jobscape AI ranks your search results using your resume profile, skills, job title relevance, and missing requirements, so the strongest matches surface first.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Rule-based and AI scores side by side", "Status badges to triage applications fast", "Filter by recent, remote and top matches"].map((x) => (
              <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{x}</li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-tr from-lime/20 via-transparent to-primary/15 blur-2xl" />
          <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-lift">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
              {chips.map((c, i) => (
                <span key={c} className={cn("rounded-full px-3 py-1 text-xs font-medium", i === 0 ? "bg-foreground text-background" : "border border-border text-muted-foreground")}>{c}</span>
              ))}
            </div>
            <div className="hidden grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid">
              <div className="col-span-4">Job</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Rule</div>
              <div className="col-span-2">AI</div>
              <div className="col-span-2">Status</div>
            </div>
            {rows.map((r) => (
              <div key={r.t} className="grid grid-cols-12 items-center gap-2 border-b border-border px-4 py-4 text-sm last:border-0">
                <div className="col-span-12 sm:col-span-4">
                  <p className="font-medium">{r.t}</p>
                  <p className="text-xs text-muted-foreground">{r.c}</p>
                </div>
                <div className="col-span-6 text-muted-foreground sm:col-span-2">{r.l}</div>
                <div className="col-span-3 sm:col-span-2"><ScorePill v={r.r} /></div>
                <div className="col-span-3 sm:col-span-2"><ScorePill v={r.a} accent /></div>
                <div className="col-span-12 sm:col-span-2">
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium",
                    r.tone === "lime" && "bg-lime/40 text-lime-foreground",
                    r.tone === "blue" && "bg-primary/10 text-primary",
                    r.tone === "muted" && "bg-muted text-muted-foreground"
                  )}>{r.s}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
