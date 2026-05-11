import * as React from "react";
import { Menu, LogOut } from "lucide-react";

export function DashboardHeader({
  user,
  onMenu,
}: {
  user: { full_name: string; email: string };
  onMenu: () => void;
}) {
  const getInitials = (name: string) =>
    name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="text-base font-semibold tracking-tight text-foreground md:hidden">
          Jobscape <span className="text-primary">AI</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          aria-label={`${user.full_name} avatar`}
        >
          {getInitials(user.full_name)}
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
