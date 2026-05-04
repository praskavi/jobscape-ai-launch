"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ArrowRight, Menu, X } from "lucide-react";
import { navLinks } from "../../lib/landingData";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Briefcase className="h-4 w-4" />
      </span>
      <span className="text-[15px]">Jobscape <span className="text-primary">AI</span></span>
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Login
          </Link>
          <Link href="/register" className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:scale-[1.02]">
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
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
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Logo />
        <button onClick={onClose} aria-label="Close menu" className="grid h-10 w-10 place-items-center rounded-lg border border-border">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-2 p-6">
        {navLinks.map((l) => (
          <Link key={l.href} href={l.href} onClick={onClose} className="rounded-xl px-4 py-3 text-lg font-medium hover:bg-muted">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-3 border-t border-border p-6">
        <Link href="/login" onClick={onClose} className="flex items-center justify-center rounded-full border border-border py-3 text-sm font-medium">
          Login
        </Link>
        <Link href="/register" onClick={onClose} className="flex items-center justify-center rounded-full bg-foreground py-3 text-sm font-medium text-background">
          Get Started
        </Link>
      </div>
    </div>
  );
}
