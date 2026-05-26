import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const metadata = {
  title: "Settings - Jobscape AI",
  description: "Manage your Jobscape AI account settings.",
};

export default function Settings() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:block">
          <div className="sticky top-0 h-screen">
            <Sidebar />
          </div>
        </aside>
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-12">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Settings
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Account settings are coming soon
          </h1>
          <p className="mt-4 text-muted-foreground">
            Profile, notification, and billing controls will live here. For now,
            your dashboard is the source of truth for documents and job search
            activity.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex w-fit items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Back to dashboard
          </Link>
        </main>
      </div>
    </div>
  );
}
