"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Briefcase, ArrowRight, Menu, X, LogOut } from "lucide-react";
import { navLinks } from "../../lib/landingData";
import Link from "next/link";
import { supabase } from "@/controllers/suabaseClient";
import { User } from "@supabase/supabase-js";

export function Logo() {
  return (
    <div className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Briefcase className="h-4 w-4" />
      </span>
      <span className="text-[15px]">Jobscape <span className="text-primary">AI</span></span>
    </div>
  );
}

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isAppPath = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/atschecker') ||
    pathname.startsWith('/jobsearch') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/settings');

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Nested MobileMenu component for public pages
  function MobileMenu({ onClose, user, loading }: { onClose: () => void; user: User | null; loading: boolean }) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/" onClick={onClose} className="hover:cursor-pointer">
            <Logo />
          </Link>
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
          {loading ? (
            <div className="h-12 w-full animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <Link href="/dashboard" onClick={onClose} className="flex items-center justify-center rounded-full bg-foreground py-3 text-sm font-medium text-background">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" onClick={onClose} className="flex items-center justify-center rounded-full border border-border py-3 text-sm font-medium">
                Login
              </Link>
              <Link href="/register" onClick={onClose} className="flex items-center justify-center rounded-full bg-foreground py-3 text-sm font-medium text-background">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur shrink-0">
      <div className={`flex h-16 items-center justify-between px-5 ${isAppPath ? "w-full" : "mx-auto max-w-[1280px] lg:px-8"
        }`}>
        <Link href="/" className="hover:cursor-pointer">
          <Logo />
        </Link>

        {/* Landing links - hidden on app pages */}
        {!isAppPath && (
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-[100px] animate-pulse h-8 rounded-full bg-muted" />
          ) : isAppPath ? (
            user && (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm"
                  aria-label={`${user.user_metadata?.full_name || "User"} avatar`}
                >
                  {getInitials(user.user_metadata?.full_name || user.user_metadata?.name || user.email || "User")}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )
          ) : user ? (
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:scale-[1.02]">
              <span className="hidden sm:inline">Go to </span>Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                Login
              </Link>
              <Link href="/register" className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:scale-[1.02]">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* Hamburger Menu button */}
          <button
            onClick={() => {
              if (isAppPath && onMenuToggle) {
                onMenuToggle();
              } else {
                setOpen(true);
              }
            }}
            aria-label="Open menu"
            className="grid h-10 w-10 place-items-center rounded-lg border border-border md:hidden hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      {!isAppPath && open && <MobileMenu onClose={() => setOpen(false)} user={user} loading={loading} />}
    </header>
  );
}
