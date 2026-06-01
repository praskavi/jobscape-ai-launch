"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileStack, Search, Settings as SettingsIcon, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Resume & Cover Letter", href: "/documents", icon: FileStack },
  { label: "Job Searches", href: "/jobsearch", icon: Search },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
  { label: "ATS Checker", href: "/atschecker", icon: FileSearch }
];

export function Sidebar({ onNavigate, isCollapsed }: { onNavigate?: () => void; isCollapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex h-full flex-col gap-1 p-4", isCollapsed && "items-center px-2")}>
      {NAV.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            title={isCollapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              isCollapsed && "justify-center px-0 py-2.5 gap-0 w-10 h-10",
              isActive
                ? "bg-foreground/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
