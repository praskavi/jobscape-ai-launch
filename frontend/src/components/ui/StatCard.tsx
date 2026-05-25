import * as React from "react";
import { cn } from "../../lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "good" | "warn";
}

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  const dot =
    tone === "good"
      ? "bg-emerald-500"
      : tone === "warn"
      ? "bg-amber-500"
      : "bg-blue-500";

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full", dot)} />
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
