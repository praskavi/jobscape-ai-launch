import { features, steps } from "../../lib/landingData";

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

export function FeaturesSection() {
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
        {features.map((f) => <FeatureCard key={f.title} {...f} />)}
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how" className="border-y border-border bg-surface/50">
      <div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">How it Works</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">From resume to apply, in four steps</h2>
        </div>
        <div className="relative mt-14 grid gap-4 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
          {steps.map((s) => (
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
