"use client";
import * as React from "react";
import { Search, History, CheckCircle2, AlertCircle, X } from "lucide-react";

import { StatCard } from "../ui/StatCard";
import { DocumentSection } from "./DocumentSection";
import { RecentSearches } from "./RecentSearches";
import { ConfirmDeleteModal } from "../ui/ConfirmDeleteModal";
import type { UserDocument } from "../../controllers/useDocuments";
import { useRouter } from "next/navigation";
import { supabase } from "@/controllers/suabaseClient";

// Removed the MOCK_USER and MOCK_SEARCHES imports!

interface DashboardPageProps {
  initialUser: { id: string; full_name: string; email: string } | null;
  initialResume: UserDocument | null;
  initialCoverLetter: UserDocument | null;
  initialSearches: any[];
}

export function DashboardPage({
  initialUser,
  initialResume,
  initialCoverLetter,
  initialSearches,
}: DashboardPageProps) {
  const router = useRouter();
  // Added 'id' to the user state so we can query the database and storage safely
  const [user, setUser] = React.useState<{ id: string; full_name: string; email: string } | null>(initialUser);
  const [isLoading, setIsLoading] = React.useState(false);

  const [resume, setResume] = React.useState<UserDocument | null>(initialResume);
  const [coverLetter, setCoverLetter] = React.useState<UserDocument | null>(initialCoverLetter);
  const [searches, setSearches] = React.useState<any[]>(initialSearches);

  const [pendingDelete, setPendingDelete] = React.useState<"resume" | "cover_letter" | null>(null);
  const [mobileNav, setMobileNav] = React.useState(false);

  const handleUpload = async (type: "resume" | "cover_letter", file: File) => {
    if (!user) return;

    try {
      // FIX 1: Use user.id instead of user.email for the storage path
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Changed to true so users can overwrite their old resumes
        });

      if (uploadError) throw uploadError;

      // Generate URL
      const { data: urlData, error: urlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 31536000); // Valid for 1 year instead of 1 hour

      if (urlError) throw urlError;

      const docPayload = {
        id: uploadData.path,
        user_id: user.id,
        document_type: type,
        file_name: file.name,
        file_url: urlData.signedUrl,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(), // <-- ADDED THIS LINE
      };

      // FIX 2: Save metadata to the database so it survives page refreshes
      const { error: dbError } = await supabase
        .from('user_documents')
        .upsert(docPayload); // Upsert allows updating if they already have a resume

      if (dbError) throw dbError;

      // Update UI
      if (type === "resume") setResume(docPayload as UserDocument);
      else setCoverLetter(docPayload as UserDocument);

    } catch (error: any) {
      console.error("Upload Error:", error.message);
      alert("Failed to upload document: " + error.message);
    }
  };

  const confirmDelete = async () => {
    const docToDelete = pendingDelete === "resume" ? resume : coverLetter;
    if (!docToDelete || !user) return setPendingDelete(null);

    try {
      // 1. Delete from Storage
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([docToDelete.id]);

      if (storageError) throw storageError;

      // 2. Delete from Database
      const { error: dbError } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', docToDelete.id);

      if (dbError) throw dbError;

      // 3. Update UI
      if (pendingDelete === "resume") setResume(null);
      if (pendingDelete === "cover_letter") setCoverLetter(null);

      setPendingDelete(null);

    } catch (error: any) {
      console.error("Delete Error:", error.message);
      alert("Failed to delete document.");
      setPendingDelete(null);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading Dashboard...</div>;
  }
  if (!user) return null;

  return (
    <>
      <div className="min-w-0 flex-1">
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

      <ConfirmDeleteModal
        open={pendingDelete !== null}
        type={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export default DashboardPage;
