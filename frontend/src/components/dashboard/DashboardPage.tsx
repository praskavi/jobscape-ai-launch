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
import { useRouter } from "next/navigation";
import { supabase } from "@/controllers/suabaseClient";

export function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<{full_name: string; email: string} | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [resume, setResume] = React.useState<UserDocument | null>(null);
  const [coverLetter, setCoverLetter] = React.useState<UserDocument | null>(null);
  const [searches] = React.useState(MOCK_SEARCHES);
  const [pendingDelete, setPendingDelete] = React.useState<"resume" | "cover_letter" | null>(null);
  const [mobileNav, setMobileNav] = React.useState(false);

  const handleUpload = async (type: "resume" | "cover_letter", file: File) => {
    if (!user) return; // Make sure we have the logged-in user

    try {
      // 1. Create a unique, organized file path in the bucket (e.g., userEmail/resume_12345.pdf)
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `${user.email}/${fileName}`;

      // 2. Upload the physical file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents") // Matches the bucket name you just created
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files with the same name
        });

      if (uploadError) throw uploadError;

      // 3. Generate a secure, temporary link so the user can click "View File" (Valid for 1 hour)
      const { data: urlData, error: urlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 3600);

      if (urlError) throw urlError;

      // 4. Update the UI with the real cloud data
      const doc: UserDocument = {
        id: uploadData.path, // We store the bucket path as the ID so we can easily delete it later
        document_type: type,
        file_name: file.name,
        file_url: urlData.signedUrl,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
      };

      if (type === "resume") setResume(doc);
      else setCoverLetter(doc);

    } catch (error: any) {
      console.error("Error uploading to Supabase:", error.message);
      alert("Failed to upload document: " + error.message);
    }
  };

  const confirmDelete = async () => {
    // Figure out which document we are trying to delete
    const docToDelete = pendingDelete === "resume" ? resume : coverLetter;
    
    if (!docToDelete) {
      setPendingDelete(null);
      return;
    }

    try {
      // 1. Delete the file from the Supabase Storage bucket
      // We pass docToDelete.id because we saved the file's path as the ID during upload
      const { error } = await supabase.storage
        .from("documents")
        .remove([docToDelete.id]);

      if (error) throw error;

      // 2. If successful, remove it from the UI state
      if (pendingDelete === "resume") setResume(null);
      if (pendingDelete === "cover_letter") setCoverLetter(null);
      
      setPendingDelete(null);

    } catch (error: any) {
      console.error("Error deleting from Supabase:", error.message);
      alert("Failed to delete document.");
      setPendingDelete(null);
    }
  };

  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login"); // Kick to login if not authenticated
      } else {
        setUser({
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || "User",
        });
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Prevent UI flashing before session is verified
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading Dashboard...</div>;
  }
  if (!user) return null;

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
          <DashboardHeader user={user} onMenu={() => setMobileNav(true)} onLogout={handleLogout}/>

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
