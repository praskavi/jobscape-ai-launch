"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileStack, Search, Settings as SettingsIcon } from "lucide-react";
import { cn } from "../../lib/utils";

// 1. Added href properties to define the route for each link
const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Resume & Cover Letter", href: "/documents", icon: FileStack }, // Adjust this path if needed
  { label: "Job Searches", href: "/jobsearch", icon: Search },
  { label: "Settings", href: "/settings", icon: SettingsIcon }, // Adjust this path if needed
  { label: "ATS Checker", href: "/atschecker", icon: Search}
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  // 2. This hook lets us know exactly which URL the user is currently on
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="px-2 pb-3">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Jobscape <span className="text-primary">AI</span>
        </span>
      </div>
      
      {NAV.map((item) => {
        // 3. Dynamically check if the current URL matches the link's href
        const isActive = pathname === item.href;

        return (
          // 4. Swapped <button> for <Link> to enable client-side routing
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate} // Still triggers the mobile menu close!
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-foreground/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}