"use client";
import { ArrowRight, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function Footer() {
  const router = useRouter();
  const cols = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "/#features" },
        { label: "Pricing", href: "/pricing" },
        { label: "Dashboard", href: "/dashboard" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "FAQ", href: "/#faq" },
        { label: "ATS Checker", href: "/atschecker" },
        { label: "AI Job Match", href: "/aijobmatch" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  ];
  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight hover:cursor-pointer">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Briefcase className="h-4 w-4" />
            </span>
            <span className="text-[15px]">Jobscape <span className="text-primary">AI</span></span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            AI-powered job search and resume matching. Apply smarter, not harder.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground">Get Started</p>
          <button onClick={() => router.push("/register")} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
            Start Free <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row lg:px-8">
          <p>Copyright 2026 Jobscape AI. All rights reserved.</p>
          <p>Made for smarter job seekers.</p>
        </div>
      </div>
    </footer>
  );
}
