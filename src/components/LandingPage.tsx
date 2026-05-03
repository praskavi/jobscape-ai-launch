import { useEffect, useState } from "react";
import {
  Menu, X, Upload, Search, Gauge, Sparkles, History, Wallet,
  FileText, MapPin, Check, ArrowRight, Star, ChevronDown, Briefcase,
  Plus, Minus,
} from "lucide-react";

/* ---------- shared utils ---------- */
const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const go = (path: string) => () => { window.location.hash = path; };

/* ---------- Header ---------- */
const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Briefcase className="h-4 w-4" />
      </span>
      <span className="text-[15px]">Jobscape <span className="text-primary">AI</span></span>
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <button onClick={go("/login")} className="rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Login</button>
          <button onClick={go("/register")} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:scale-[1.02]">
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-lg border border-border md:hidden">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open && <MobileMenu onClose={() => setOpen(false)} />}
    </header>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Logo />
        <button onClick={onClose} aria-label="Close menu" className="grid h-10 w-10 place-items-center rounded-lg border border-border">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-2 p-6">
        {navLinks.map(l => (
          <a key={l.href} href={l.href} onClick={onClose} className="rounded-xl px-4 py-3 text-lg font-medium hover:bg-muted">{l.label}</a>
        ))}
      </nav>
      <div className="flex flex-col gap-3 border-t border-border p-6">
        <button onClick={go("/login")} className="rounded-full border border-border py-3 text-sm font-medium">Login</button>
        <button onClick={go("/register")} className="rounded-full bg-foreground py-3 text-sm font-medium text-background">Get Started</button>
      </div>
    </div>
  );
}

/* ---------- Hero ---------- */
function HeroSection() {
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
            <button onClick={go("/register")} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02] sm:w-auto">
              Start Free <ArrowRight className="h-4 w-4" />
            </button>
            <a href="#how" className="inline-flex w-full items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted sm:w-auto">
              See How It Works
            </a>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground lg:justify-start">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-6 w-6 rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-lime/60" />)}
            </div>
            Trusted by 2,400+ job seekers
          </div>
        </div>
        <ProductMockup />
      </div>
    </section>
  );
}

function ProductMockup() {
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
          {jobs.map(j => (
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

/* ---------- Trust strip ---------- */
function TrustStrip() {
  const items = ["Resume Match", "Job Search", "ATS Score", "Cover Letter Assist", "Application Tracker"];
  return (
    <section className="border-y border-border bg-surface/50">
      <div className="mx-auto max-w-[1280px] px-5 py-10 lg:px-8">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Built for job seekers who want smarter applications
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {items.map(i => (
            <span key={i} className="rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground">{i}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Features ---------- */
const features = [
  { icon: Upload, title: "Resume Upload", desc: "Upload PDF or Word resumes and create a reusable resume profile." },
  { icon: Search, title: "Smart Job Search", desc: "Search jobs by keyword, location, role type, and source." },
  { icon: Gauge, title: "Rule-Based Pre-Scoring", desc: "Quickly compare resume skills against job descriptions before using AI." },
  { icon: Sparkles, title: "AI ATS Scoring", desc: "Get deeper scoring, summaries, and suggestions for selected roles." },
  { icon: History, title: "Search History", desc: "Track previous searches and matched jobs from your dashboard." },
  { icon: Wallet, title: "Cost-Controlled AI", desc: "Use rule-based filtering first so AI scoring is only used where it matters." },
];

function FeatureCard({ icon: Icon, title, desc }: typeof features[number]) {
  return (
    <div className="group rounded-3xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:shadow-lift">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Features</span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
          Everything you need to apply smarter
        </h2>
        <p className="mt-4 text-muted-foreground">
          From resume parsing to AI-powered ATS scoring — Jobscape AI brings every step of the search into one focused workflow.
        </p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(f => <FeatureCard key={f.title} {...f} />)}
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
const steps = [
  { n: "01", title: "Upload Resume", desc: "Drop in your PDF or Word resume — we extract skills automatically.", icon: Upload },
  { n: "02", title: "Search Jobs", desc: "Pull live listings by keyword, location and source.", icon: Search },
  { n: "03", title: "Compare Match Scores", desc: "See rule-based and AI scores side by side.", icon: Gauge },
  { n: "04", title: "Apply With Confidence", desc: "Spend time only on roles where you actually fit.", icon: Check },
];

function HowItWorksSection() {
  return (
    <section id="how" className="border-y border-border bg-surface/50">
      <div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">How it Works</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">From resume to apply, in four steps</h2>
        </div>
        <div className="relative mt-14 grid gap-4 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
          {steps.map(s => (
            <div key={s.n} className="relative rounded-3xl border border-border bg-background p-6">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-surface text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-xs font-semibold tracking-widest text-muted-foreground">STEP {s.n}</div>
              <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Dashboard preview ---------- */
function DashboardPreview() {
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
            Jobscape AI ranks your search results using your resume profile, skills, job title relevance, and missing requirements — so the strongest matches surface first.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Rule-based and AI scores side by side", "Status badges to triage applications fast", "Filter by recent, remote and top matches"].map(x => (
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
            {rows.map(r => (
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

/* ---------- Pricing ---------- */
const tiers = [
  {
    name: "Free", price: "$0", blurb: "For getting started", cta: "Start Free", highlight: false,
    features: ["Upload 1 resume", "5 job searches / month", "Rule-based scoring", "Basic dashboard"]
  },
  {
    name: "Pro", price: "$19", blurb: "For active job seekers", cta: "Start Pro", highlight: true,
    features: ["Unlimited job searches", "Resume + cover letter upload", "AI ATS scoring credits", "Match explanations", "Search history"]
  },
  {
    name: "Business", price: "$49", blurb: "For coaches & teams", cta: "Contact Us", highlight: false,
    features: ["Multiple client profiles", "Bulk resume matching", "Export reports", "Priority support"]
  },
];

function PricingCard({ t }: { t: typeof tiers[number] }) {
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
        {t.features.map(f => (
          <li key={f} className="flex items-start gap-2">
            <Check className={cn("mt-0.5 h-4 w-4 shrink-0", t.highlight ? "text-lime" : "text-primary")} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button onClick={go("/pricing")} className={cn(
        "mt-auto inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:scale-[1.02]",
        t.highlight ? "bg-background text-foreground" : "bg-foreground text-background"
      )}>
        {t.cta} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="border-y border-border bg-surface/50">
      <div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Pricing</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">Simple pricing for smarter job search</h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when you want AI-powered ATS insights.</p>
        </div>
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {tiers.map(t => <PricingCard key={t.name} t={t} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
const testimonials = [
  { q: "I stopped applying randomly and focused only on jobs where my resume had a real chance.", n: "Aarav S.", r: "Software Engineer" },
  { q: "The match score helped me understand which skills I needed to add.", n: "Mei L.", r: "Business Analyst" },
  { q: "Great tool for quickly filtering job listings before applying.", n: "Daniel K.", r: "Data Analyst" },
];

function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Testimonials</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">Loved by focused job seekers</h2>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {testimonials.map(t => (
          <figure key={t.n} className="flex flex-col rounded-3xl border border-border bg-surface p-7">
            <div className="flex gap-0.5 text-primary">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed">“{t.q}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-lime/70 text-sm font-semibold text-background">
                {t.n[0]}
              </div>
              <div>
                <p className="text-sm font-semibold">{t.n}</p>
                <p className="text-xs text-muted-foreground">{t.r}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
const faqs = [
  { q: "What is Jobscape AI?", a: "Jobscape AI is an AI-powered job search and resume matching platform that helps you find roles where you actually have a strong fit." },
  { q: "Do I need to upload a resume?", a: "Yes — uploading at least one resume lets us extract your skills and produce accurate match scores against live job listings." },
  { q: "How does the match score work?", a: "We combine rule-based comparison (skills, title relevance, missing requirements) with optional AI ATS scoring for deeper analysis." },
  { q: "Does it apply to jobs automatically?", a: "No. Jobscape AI helps you decide which jobs to apply for. You stay in control of every application." },
  { q: "Can I connect this to Supabase later?", a: "Yes. The frontend is structured so authentication and data can be wired into Supabase (or Lovable Cloud) without rewrites." },
  { q: "Can AI scoring be controlled to reduce cost?", a: "Absolutely. Rule-based filtering runs first, so AI ATS scoring is only spent on the jobs you actually want to evaluate." },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-y border-border bg-surface/50">
      <div className="mx-auto max-w-3xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="text-center">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">FAQ</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">Frequently asked questions</h2>
        </div>
        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="overflow-hidden rounded-2xl border border-border bg-background">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium md:text-base">{f.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border">
                    {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </button>
                <div className={cn("grid transition-all duration-300 ease-out", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */
function CTASection() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8">
      <div className="relative overflow-hidden rounded-[32px] border border-border bg-foreground px-8 py-16 text-center text-background lg:px-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,oklch(0.55_0.21_265/0.45),transparent)]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[120%] -translate-x-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,oklch(0.92_0.16_125/0.25),transparent)]" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
            Ready to find better-fit jobs?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-background/70">
            Upload your resume and start ranking jobs by match quality, not guesswork.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={go("/register")} className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground hover:scale-[1.02]">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={go("/dashboard")} className="inline-flex items-center justify-center rounded-full border border-background/20 bg-background/5 px-6 py-3 text-sm font-semibold text-background hover:bg-background/10">
              View Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  const cols = [
    { title: "Product", links: ["Features", "Pricing", "Dashboard"] },
    { title: "Resources", links: ["Blog", "Help", "Contact"] },
    { title: "Company", links: ["About", "Privacy", "Terms"] },
  ];
  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            AI-powered job search and resume matching. Apply smarter, not harder.
          </p>
        </div>
        {cols.map(c => (
          <div key={c.title}>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(l => (
                <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-foreground">{l}</a></li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground">Get Started</p>
          <button onClick={go("/register")} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
            Start Free <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row lg:px-8">
          <p>© 2026 Jobscape AI. All rights reserved.</p>
          <p>Made for smarter job seekers.</p>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Page ---------- */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Header />
      <main>
        <HeroSection />
        <TrustStrip />
        <FeaturesSection />
        <HowItWorksSection />
        <DashboardPreview />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
