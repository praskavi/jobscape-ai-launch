"use client";
import { Sparkles, ArrowRight, Search, MapPin, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "../../lib/utils";
import Link from "next/link";

export function HeroSection() {
  const router = useRouter();
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.55_0.21_265/0.10),transparent)]" />
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Job Search Assistant
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            Find better jobs with <span className="text-primary">AI-powered</span> resume matching
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground md:text-lg lg:mx-0">
            Upload your resume, search live job listings, and instantly see which roles are worth applying for — before spending time on long applications.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start sm:justify-center">
            <button onClick={() => router.push("/register")} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02] sm:w-auto">
              Start Free <ArrowRight className="h-4 w-4" />
            </button>
            <Link href="#how" className="inline-flex w-full items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted sm:w-auto">
              See How It Works
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground lg:justify-start">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-6 w-6 rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-lime/60" />)}
            </div>
            Trusted by 2,400+ job seekers
          </div>
        </div>
        <ProductMockup />
      </div>
    </section>
  );
}

export function ProductMockup() {
  const jobs = [
    { title: "Salesforce Developer", company: "Acme Cloud", score: 92, tag: "ATS ready" },
    { title: "Business Analyst", company: "Northwind", score: 84, tag: "Skills matched" },
    { title: "Data Analyst", company: "Helio Labs", score: 76, tag: "AI summary" },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-br from-primary/10 via-transparent to-lime/20 blur-2xl" />
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-lift">
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="ml-3 text-xs text-muted-foreground">jobscape.ai / dashboard</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Salesforce Developer</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Melbourne</span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm">Prashant_Resume.pdf</span>
          </div>
          <span className="rounded-full bg-lime/40 px-2 py-0.5 text-[11px] font-medium text-lime-foreground">selected</span>
        </div>
        <div className="mt-4 space-y-2">
          {jobs.map((j) => (
            <div key={j.title} className="rounded-2xl border border-border bg-background p-4 transition-colors hover:bg-muted/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{j.title}</p>
                  <p className="text-xs text-muted-foreground">{j.company} · Full-time</p>
                </div>
                <div className="text-right">
                  <div className={cn("text-sm font-semibold", j.score >= 85 ? "text-primary" : "text-foreground")}>{j.score}%</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">match</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${j.score}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{j.tag}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Skills matched</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrustStrip() {
  const items = ["Resume Match", "Job Search", "ATS Score", "Cover Letter Assist", "Application Tracker"];
  return (
    <section className="border-y border-border bg-surface/50">
      <div className="mx-auto max-w-[1280px] px-5 py-10 lg:px-8">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Built for job seekers who want smarter applications
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {items.map((i) => (
            <span key={i} className="rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground">{i}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
