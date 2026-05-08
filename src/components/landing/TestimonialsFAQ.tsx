"use client";
import { useState } from "react";
import { Star, Plus, Minus, ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { testimonials, faqs } from "../../lib/landingData";
import { useRouter } from "next/navigation";

export function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Testimonials</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">Loved by focused job seekers</h2>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {testimonials.map((t) => (
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

export function FAQSection() {
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

export function CTASection() {
  const router = useRouter();
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
            <button onClick={() => router.push("/register")} className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground hover:scale-[1.02]">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => router.push("/dashboard")} className="inline-flex items-center justify-center rounded-full border border-background/20 bg-background/5 px-6 py-3 text-sm font-semibold text-background hover:bg-background/10">
              View Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
