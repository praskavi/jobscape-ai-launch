import { Footer } from "@/components/layout/Footer";
import { absoluteUrl, siteName } from "@/lib/seo";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type FeatureSeoPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  primaryHref: string;
  secondaryCta?: string;
  secondaryHref?: string;
  pagePath: string;
  benefits: string[];
  steps: Array<{
    title: string;
    description: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

export function FeatureSeoPage({
  eyebrow,
  title,
  description,
  primaryCta,
  primaryHref,
  secondaryCta = "View pricing",
  secondaryHref = "/pricing",
  pagePath,
  benefits,
  steps,
  faqs,
}: FeatureSeoPageProps) {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: absoluteUrl(pagePath),
      isPartOf: {
        "@type": "WebSite",
        name: siteName,
        url: absoluteUrl("/"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="border-b border-border bg-surface/50">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.02]"
              >
                {primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                {secondaryCta}
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-background p-6 shadow-soft">
            <p className="text-sm font-semibold">What you can do</p>
            <ul className="mt-5 space-y-4">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            A focused workflow for better applications
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-border bg-surface p-6">
              <div className="text-xs font-semibold tracking-widest text-muted-foreground">
                STEP {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface/50">
        <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Common questions
          </h2>
          <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-background">
            {faqs.map((faq) => (
              <div key={faq.question} className="p-6">
                <h3 className="text-base font-semibold">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-16 text-center lg:px-8 lg:py-24">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Start with your resume and find stronger-fit jobs
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Create a free account to use Jobscape AI's protected tools and keep your resume data secure.
        </p>
        <Link
          href={primaryHref}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.02]"
        >
          {primaryCta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <Footer />
    </div>
  );
}
