"use client";
import * as React from "react";
import { Search, History, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { StatCard } from "../ui/StatCard";
import { DocumentSection } from "./DocumentSection";
import { RecentSearches } from "./RecentSearches";
import { ConfirmDeleteModal } from "../ui/ConfirmDeleteModal";
import { MOCK_USER, MOCK_SEARCHES } from "../../lib/mockData";
import type { UserDocument } from "../../controllers/useDocuments";

export function DashboardPage() {
  const [user] = React.useState(MOCK_USER);
  const [resume, setResume] = React.useState<UserDocument | null>(null);
  const [coverLetter, setCoverLetter] = React.useState<UserDocument | null>(null);
  const [searches] = React.useState(MOCK_SEARCHES);
  const [pendingDelete, setPendingDelete] = React.useState<"resume" | "cover_letter" | null>(null);
  const [mobileNav, setMobileNav] = React.useState(false);

  const handleUpload = (type: "resume" | "cover_letter", file: File) => {
    const doc: UserDocument = {
      id: crypto.randomUUID(),
      document_type: type,
      file_name: file.name,
      file_url: URL.createObjectURL(file),
      mime_type: file.type,
      uploaded_at: new Date().toISOString(),
    };
    if (type === "resume") setResume(doc);
    else setCoverLetter(doc);
  };

  const confirmDelete = () => {
    if (pendingDelete === "resume") setResume(null);
    if (pendingDelete === "cover_letter") setCoverLetter(null);
    setPendingDelete(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:block">
          <div className="sticky top-0 h-screen">
            <Sidebar />
          </div>
        </aside>

        {/* Mobile sidebar drawer */}
        {mobileNav && (
          <div
            className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
            onClick={() => setMobileNav(false)}
          >
            <div
              className="h-full w-72 bg-surface"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4">
                <span className="text-base font-semibold">Menu</span>
                <button
                  onClick={() => setMobileNav(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Sidebar onNavigate={() => setMobileNav(false)} />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <DashboardHeader user={user} onMenu={() => setMobileNav(true)} />

          <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
            {/* Welcome */}
            <section className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Welcome back, {user.full_name.split(" ")[0]}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your resume, cover letter, and job search activity.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Search className="h-4 w-4" /> Start New Job Search
                </button>
                <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-muted">
                  <History className="h-4 w-4" /> View Search History
                </button>
              </div>
            </section>

            {/* Stats */}
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Total Searches" value={searches.length} hint="All time" />
              <StatCard
                label="Resume Status"
                value={
                  <span className="inline-flex items-center gap-2">
                    {resume ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                    {resume ? "Uploaded" : "Missing"}
                  </span>
                }
                tone={resume ? "good" : "warn"}
              />
              <StatCard
                label="Cover Letter Status"
                value={
                  <span className="inline-flex items-center gap-2">
                    {coverLetter ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                    {coverLetter ? "Uploaded" : "Missing"}
                  </span>
                }
                tone={coverLetter ? "good" : "warn"}
              />
            </section>

            {/* Documents */}
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <DocumentSection
                title="Resume"
                type="resume"
                doc={resume}
                onUpload={(f) => handleUpload("resume", f)}
                onRequestDelete={() => setPendingDelete("resume")}
              />
              <DocumentSection
                title="Cover Letter"
                type="cover_letter"
                doc={coverLetter}
                onUpload={(f) => handleUpload("cover_letter", f)}
                onRequestDelete={() => setPendingDelete("cover_letter")}
              />
            </div>

            {/* Recent searches */}
            <RecentSearches searches={searches} />
          </main>
        </div>
      </div>

      <ConfirmDeleteModal
        open={pendingDelete !== null}
        type={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default DashboardPage;
