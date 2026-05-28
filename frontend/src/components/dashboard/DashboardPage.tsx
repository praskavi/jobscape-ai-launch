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

export function DashboardPage() {
  const router = useRouter();
  // user.id = auth UID (auth.users.id); user.profileId = user_profiles.id (surrogate PK for FK inserts)
  const [user, setUser] = React.useState<{ id: string; profileId: string; full_name: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const [resume, setResume] = React.useState<UserDocument | null>(null);
  const [coverLetter, setCoverLetter] = React.useState<UserDocument | null>(null);
  const [searches, setSearches] = React.useState<any[]>([]); // Dynamic searches state

  const [pendingDelete, setPendingDelete] = React.useState<"resume" | "cover_letter" | null>(null);
  const [mobileNav, setMobileNav] = React.useState(false);

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const userId = session.user.id;

      // 1. Fetch User Profile — correct table: user_profiles, match on user_id (auth UUID column)
      let finalName = 'User';
      let profileId = '';
      const { data: profileData } = await supabase
        .from('user_profiles')        // was: 'profiles'
        .select('id, full_name')      // include 'id' (surrogate PK) for FK inserts
        .eq('user_id', userId)        // was: .eq('id', userId) — user_id holds the auth UUID
        .single();

      if (profileData) {
        profileId = profileData.id;
        finalName = profileData.full_name
          || session.user.user_metadata?.full_name
          || session.user.user_metadata?.name
          || session.user.email?.split('@')[0]
          || 'User';
      } else {
        finalName = session.user.user_metadata?.full_name
          || session.user.user_metadata?.name
          || session.user.email?.split('@')[0]
          || 'User';
      }

      setUser({
        id: userId,
        profileId,                    // surrogate PK — required for inserts into user_files / job_searches
        email: session.user.email || "",
        full_name: finalName,
      });

      // 2. Fetch User Files — correct table: user_files; RLS filters by authenticated user automatically
      const STORAGE_BUCKET = "user-documents"; // correct bucket name
      const { data: filesData } = await supabase
        .from('user_files')           // was: 'user_documents'
        .select('id, file_type, file_name, file_path, bucket_name, mime_type, file_size_bytes, created_at')
        .order('created_at', { ascending: false });

      if (filesData && filesData.length > 0) {
        // Generate signed URLs for each file from file_path (stored path in bucket)
        const withUrls: UserDocument[] = await Promise.all(
          filesData.map(async (f) => {
            const { data: urlData } = await supabase.storage
              .from(f.bucket_name || STORAGE_BUCKET)
              .createSignedUrl(f.file_path, 3600); // 1-hour signed URL
            return {
              id: f.id,
              file_type: f.file_type as "resume" | "cover_letter",  // was: document_type
              file_name: f.file_name,
              file_path: f.file_path,
              file_url: urlData?.signedUrl || '',
              mime_type: f.mime_type,
              file_size_bytes: f.file_size_bytes,
              created_at: f.created_at,              // was: uploaded_at
            };
          })
        );

        const res = withUrls.find(d => d.file_type === 'resume');
        const cl = withUrls.find(d => d.file_type === 'cover_letter');
        if (res) setResume(res);
        if (cl) setCoverLetter(cl);
      }

      // 3. Fetch Recent Searches — correct table: job_searches; RLS handles user filter
      const { data: searchData } = await supabase
        .from('job_searches')         // was: 'search_history'
        .select('id, keyword, location, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (searchData) {
        setSearches(searchData);
      }

      setIsLoading(false);
    };

    fetchDashboardData();
  }, [router]);

  const handleUpload = async (type: "resume" | "cover_letter", file: File) => {
    if (!user || !user.profileId) return;

    const STORAGE_BUCKET = "user-documents"; // correct bucket name (was: "documents")

    try {
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

      if (type === "resume") setResume(newDoc);
      else setCoverLetter(newDoc);

    } catch (error: any) {
      console.error("Upload Error:", error.message);
      alert("Failed to upload document: " + error.message);
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
