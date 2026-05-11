import * as React from "react";
import { LayoutDashboard, FileStack, Search, Settings as SettingsIcon } from "lucide-react";
import { cn } from "../../lib/utils";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Resume & Cover Letter", icon: FileStack, active: false },
  { label: "Job Searches", icon: Search, active: false },
  { label: "Settings", icon: SettingsIcon, active: false },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="px-2 pb-3">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Jobscape <span className="text-primary">AI</span>
        </span>
      </div>
      {NAV.map((item) => (
        <button
          key={item.label}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            item.active
              ? "bg-foreground/[0.06] text-foreground"
              : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
