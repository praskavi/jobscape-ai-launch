"use client";
import * as React from "react";
import { Sidebar } from "./Sidebar";
import { Header, Logo } from "./Header";
import { supabase } from "@/controllers/suabaseClient";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileNav, setMobileNav] = React.useState(false);

  React.useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Listen to active auth session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check if we are on an auth path (login / register)
  const isAuthPath = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Check if we are on a dashboard/app page
  const isAppPath = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/atschecker') ||
    pathname.startsWith('/jobsearch') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/aijobmatch');

  // We conditionally render the sidebar if user is logged in AND they are on a dashboard/app path
  const showSidebar = user !== null && isAppPath;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="animate-pulse font-medium text-sm">Loading Application...</div>
      </div>
    );
  }

  // If on login/register paths, render standalone pages without global layout
  if (isAuthPath) {
    return <>{children}</>;
  }

  // If not in the authenticated application routes (e.g. landing page, about, terms, privacy, pricing)
  if (!showSidebar) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  // Authenticated App layout: sticky header at top, sidebar + main content below
  return (
    <div className="flex h-screen w-full flex-col bg-background overflow-hidden">
      <Header onMenuToggle={() => setMobileNav(true)} />

      <div className="flex flex-1 w-full overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`hidden border-r border-border bg-surface md:flex flex-col transition-all duration-300 relative ${
            isCollapsed ? "w-16" : "w-64"
          }`}
        >
          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto">
            <Sidebar isCollapsed={isCollapsed} />
          </div>

          {/* Floating Toggle Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 z-10 grid h-6 w-6 place-items-center rounded-full border border-border bg-surface shadow-soft hover:bg-muted transition-colors animate-fade-in"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3 text-foreground" />
            ) : (
              <ChevronLeft className="h-3 w-3 text-foreground" />
            )}
          </button>
        </aside>

        {/* Mobile Menu Drawer (Responsive) */}
        {mobileNav && (
          <div
            className="fixed inset-0 z-40 bg-foreground/40 md:hidden animate-fade-in"
            onClick={() => setMobileNav(false)}
          >
            <div
              className="h-full w-72 bg-surface flex flex-col shadow-lift animate-slide-in-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-5">
                <Link href="/" onClick={() => setMobileNav(false)} className="hover:cursor-pointer">
                  <Logo />
                </Link>
                <button
                  onClick={() => setMobileNav(false)}
                  aria-label="Close menu"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <Sidebar onNavigate={() => setMobileNav(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
