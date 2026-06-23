"use client";
import * as React from "react";
import { Search, History, CheckCircle2, AlertCircle, X } from "lucide-react";

import { StatCard } from "../ui/StatCard";
import { DocumentSection } from "./DocumentSection";
import { DocumentGenerators } from "./DocumentGenerators";
import { RecentSearches } from "./RecentSearches";
import { PlanUsageSummary } from "@/components/subscription/PlanUsageSummary";
import { ConfirmDeleteModal } from "../ui/ConfirmDeleteModal";
import type { UserDocument } from "../../controllers/useDocuments";
import { useRouter } from "next/navigation";
import { supabase } from "@/controllers/suabaseClient";
import { useSubscription } from "@/contexts/SubscriptionContext";

// Removed the MOCK_USER and MOCK_SEARCHES imports!

interface DashboardPageProps {
  initialUser: { id: string; full_name: string; email: string; profileId: string } | null;
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
  const { refresh: refreshSubscription } = useSubscription();
  // Added 'id' and 'profileId' to the user state so we can query the database and storage safely
  const [user, setUser] = React.useState<{ id: string; full_name: string; email: string; profileId: string } | null>(initialUser);
  const [isLoading, setIsLoading] = React.useState(false);
  const [uploadingType, setUploadingType] = React.useState<"resume" | "cover_letter" | null>(null);
  const [uploadErrors, setUploadErrors] = React.useState<Record<"resume" | "cover_letter", string | null>>({
    resume: null,
    cover_letter: null,
  });

  const [resume, setResume] = React.useState<UserDocument | null>(initialResume);
  const [coverLetter, setCoverLetter] = React.useState<UserDocument | null>(initialCoverLetter);
  const [searches, setSearches] = React.useState<any[]>(initialSearches);

  const [pendingDelete, setPendingDelete] = React.useState<"resume" | "cover_letter" | null>(null);
  const [mobileNav, setMobileNav] = React.useState(false);

  const getApiErrorMessage = async (response: Response, fallback: string) => {
    const errorData = await response.json().catch(() => null);

    if (response.status === 402) {
      if (errorData?.reason === "usage_limit_reached") {
        return "Your monthly resume upload allowance has been used. Upgrade your plan or try again next month.";
      }

      if (errorData?.reason === "feature_not_enabled") {
        return "Resume uploads are not included in your current plan.";
      }

      return errorData?.error || "Resume upload is not available on your current subscription.";
    }

    return errorData?.message || errorData?.error || fallback;
  };

  const handleUpload = async (type: "resume" | "cover_letter", file: File) => {
    if (!user || !user.profileId) return;

    const STORAGE_BUCKET = "user-documents"; // correct bucket name (was: "documents")

    setUploadingType(type);
    setUploadErrors((current) => ({ ...current, [type]: null }));

    try {
      if (type === "resume") {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

        const formData = new FormData();
        formData.append("resume", file);

        const response = await fetch("/api/upload-resume", {
          method: "POST",
          headers,
          body: formData,
        });

        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, "Failed to upload resume."));
        }

        const data = await response.json();
        const uploadedFile = data.file;

        if (!uploadedFile) {
          throw new Error("Resume uploaded, but the server did not return file metadata.");
        }

        setResume({
          id: uploadedFile.id,
          file_type: "resume",
          file_name: uploadedFile.file_name,
          file_path: uploadedFile.file_path,
          file_url: uploadedFile.file_url || "",
          mime_type: uploadedFile.mime_type,
          file_size_bytes: uploadedFile.file_size_bytes,
          created_at: uploadedFile.created_at || new Date().toISOString(),
        });

        await refreshSubscription();
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`; // store under auth UID folder

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 2. Generate a short-lived signed URL for immediate UI display
      const { data: urlData, error: urlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 3600); // 1-hour URL; re-fetched on next page load

      if (urlError) throw urlError;

      // 3. Save/update file metadata in user_files
      //    user_profile_id = surrogate PK from user_profiles (NOT auth UID)
      //    file_type replaces document_type; file_path is the storage path for later ops
      const { data: upsertData, error: dbError } = await supabase
        .from('user_files')                   // was: 'user_documents'
        .upsert({
          user_profile_id: user.profileId,    // was: user_id: user.id — must use surrogate PK
          file_type: type,                    // was: document_type: type
          file_name: file.name,
          file_path: filePath,               // storage path — required for delete and signed URL
          bucket_name: STORAGE_BUCKET,
          mime_type: file.type,
          file_size_bytes: file.size,
        }, {
          onConflict: 'user_profile_id,file_type', // matches one_file_per_user_per_type constraint
        })
        .select('id, created_at')
        .single();

      if (dbError) throw dbError;

      // 4. Update UI state with the full document shape
      const newDoc: UserDocument = {
        id: upsertData?.id || '',
        file_type: type,
        file_name: file.name,
        file_path: filePath,
        file_url: urlData?.signedUrl || '',
        mime_type: file.type,
        file_size_bytes: file.size,
        created_at: upsertData?.created_at || new Date().toISOString(),
      };

      setCoverLetter(newDoc);

    } catch (error: any) {
      console.error("Upload Error:", error.message);
      setUploadErrors((current) => ({
        ...current,
        [type]: error.message || "Failed to upload document.",
      }));
    } finally {
      setUploadingType(null);
    }
  };

  const confirmDelete = async () => {
    const docToDelete = pendingDelete === "resume" ? resume : coverLetter;
    if (!docToDelete || !user) return setPendingDelete(null);

    const STORAGE_BUCKET = "user-documents"; // correct bucket name (was: "documents")

    try {
      // 1. Delete from Storage using file_path (was incorrectly using docToDelete.id)
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([docToDelete.file_path]);   // was: [docToDelete.id] — file_path is the storage key

      if (storageError) throw storageError;

      // 2. Delete row from user_files (was: 'user_documents')
      const { error: dbError } = await supabase
        .from('user_files')               // was: 'user_documents'
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

          <PlanUsageSummary />

          {/* Documents */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DocumentSection
              title="Resume"
              type="resume"
              doc={resume}
              isUploading={uploadingType === "resume"}
              uploadError={uploadErrors.resume}
              onUpload={(f) => handleUpload("resume", f)}
              onRequestDelete={() => setPendingDelete("resume")}
            />
            <DocumentSection
              title="Cover Letter"
              type="cover_letter"
              doc={coverLetter}
              isUploading={uploadingType === "cover_letter"}
              uploadError={uploadErrors.cover_letter}
              onUpload={(f) => handleUpload("cover_letter", f)}
              onRequestDelete={() => setPendingDelete("cover_letter")}
            />
          </div>

          <DocumentGenerators />

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
