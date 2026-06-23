"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, History, Search } from "lucide-react";

import { PlanUsageSummary } from "@/components/subscription/PlanUsageSummary";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/controllers/suabaseClient";
import type { UserDocument } from "../../controllers/useDocuments";
import { ConfirmDeleteModal } from "../ui/ConfirmDeleteModal";
import { StatCard } from "../ui/StatCard";
import { DocumentGenerators } from "./DocumentGenerators";
import { DocumentSection } from "./DocumentSection";
import { RecentSearches } from "./RecentSearches";
import { ResumeLibrary } from "./ResumeLibrary";

interface DashboardPageProps {
  initialUser: { id: string; full_name: string; email: string; profileId: string } | null;
  initialResume: UserDocument | null;
  initialResumes?: UserDocument[];
  initialCoverLetter: UserDocument | null;
  initialSearches: any[];
}

const STORAGE_BUCKET = "user-documents";

export function DashboardPage({
  initialUser,
  initialResume,
  initialResumes,
  initialCoverLetter,
  initialSearches,
}: DashboardPageProps) {
  const { summary, refresh: refreshSubscription } = useSubscription();
  const planCode = summary?.plan?.plan_code ?? "free";
  const isPremium = planCode === "premium";

  const [user] = React.useState(initialUser);
  const [isLoading] = React.useState(false);
  const [resumes, setResumes] = React.useState<UserDocument[]>(
    isPremium
      ? (initialResumes ?? (initialResume ? [initialResume] : []))
      : (initialResume ? [initialResume] : []),
  );
  const activeResume = resumes.find((r) => r.is_current !== false) ?? resumes[0] ?? null;

  const [coverLetter, setCoverLetter] = React.useState<UserDocument | null>(initialCoverLetter);
  const [searches] = React.useState<any[]>(initialSearches);
  const [uploadingType, setUploadingType] = React.useState<"resume" | "cover_letter" | null>(null);
  const [uploadErrors, setUploadErrors] = React.useState<Record<"resume" | "cover_letter", string | null>>({
    resume: null,
    cover_letter: null,
  });
  const [pendingDeleteDoc, setPendingDeleteDoc] = React.useState<UserDocument | null>(null);

  const getApiErrorMessage = async (response: Response, fallback: string) => {
    const body = await response.json().catch(() => null);
    if (response.status === 402) {
      if (body?.reason === "storage_limit_reached") {
        return body.message ?? "Resume library full.";
      }
      if (body?.reason === "usage_limit_reached") {
        return "Monthly allowance reached. Upgrade or wait until next month.";
      }
      if (body?.reason === "feature_not_enabled") {
        return "This feature is not available on your current plan.";
      }
      return body?.error ?? "Feature not available on your current plan.";
    }
    return body?.message ?? body?.error ?? fallback;
  };

  const handleUpload = async (type: "resume" | "cover_letter", file: File) => {
    if (!user?.profileId) {
      return;
    }

    setUploadingType(type);
    setUploadErrors((cur) => ({ ...cur, [type]: null }));

    try {
      if (type === "resume") {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

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
        const uploaded = data.file as UserDocument & { file_url?: string };
        const newDoc: UserDocument = {
          id: uploaded.id,
          file_type: "resume",
          file_name: uploaded.file_name,
          file_path: uploaded.file_path,
          file_url: uploaded.file_url ?? "",
          mime_type: uploaded.mime_type,
          file_size_bytes: uploaded.file_size_bytes,
          created_at: uploaded.created_at ?? new Date().toISOString(),
          is_current: true,
        };

        if (isPremium) {
          setResumes((prev) =>
            [newDoc, ...prev.map((r) => ({ ...r, is_current: false }))].slice(0, 3),
          );
        } else {
          setResumes([newDoc]);
        }

        await refreshSubscription();
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, { cacheControl: "3600", upsert: true });
      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData, error: urlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 3600);
      if (urlError) {
        throw urlError;
      }

      const { data: upsertData, error: dbError } = await supabase
        .from("user_files")
        .upsert(
          {
            user_profile_id: user.profileId,
            file_type: type,
            file_name: file.name,
            file_path: filePath,
            bucket_name: STORAGE_BUCKET,
            mime_type: file.type,
            file_size_bytes: file.size,
            is_current: true,
          },
          { onConflict: "user_profile_id,file_type" },
        )
        .select("id, created_at")
        .single();
      if (dbError) {
        throw dbError;
      }

      setCoverLetter({
        id: upsertData?.id ?? "",
        file_type: type,
        file_name: file.name,
        file_path: filePath,
        file_url: urlData?.signedUrl ?? "",
        mime_type: file.type,
        file_size_bytes: file.size,
        created_at: upsertData?.created_at ?? new Date().toISOString(),
        is_current: true,
      });
    } catch (err: any) {
      console.error("Upload error:", err.message);
      setUploadErrors((cur) => ({
        ...cur,
        [type]: err.message ?? "Failed to upload document.",
      }));
    } finally {
      setUploadingType(null);
    }
  };

  const handleSetActive = (resumeId: string) => {
    setResumes((prev) =>
      prev.map((r) => ({ ...r, is_current: r.id === resumeId })),
    );
  };

  const confirmDelete = async () => {
    const doc = pendingDeleteDoc;
    if (!doc || !user) {
      setPendingDeleteDoc(null);
      return;
    }

    try {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([doc.file_path]);
      if (storageError) {
        throw storageError;
      }

      const { error: dbError } = await supabase
        .from("user_files")
        .delete()
        .eq("id", doc.id);
      if (dbError) {
        throw dbError;
      }

      if (doc.file_type === "resume") {
        setResumes((prev) => {
          const remaining = prev.filter((r) => r.id !== doc.id);
          if (doc.is_current && remaining.length > 0) {
            return [{ ...remaining[0], is_current: true }, ...remaining.slice(1)];
          }
          return remaining;
        });
      } else {
        setCoverLetter(null);
      }

      setPendingDeleteDoc(null);
    } catch (err: any) {
      console.error("Delete error:", err.message);
      alert("Failed to delete document. Please try again.");
      setPendingDeleteDoc(null);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading Dashboard...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
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

          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Searches" value={searches.length} hint="All time" />
            <StatCard
              label="Resume Status"
              value={
                <span className="inline-flex items-center gap-2">
                  {activeResume ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  {activeResume ? "Uploaded" : "Missing"}
                </span>
              }
              tone={activeResume ? "good" : "warn"}
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

          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {isPremium ? (
              <ResumeLibrary
                resumes={resumes}
                isUploading={uploadingType === "resume"}
                uploadError={uploadErrors.resume}
                onUpload={(f) => handleUpload("resume", f)}
                onDelete={(r) => setPendingDeleteDoc(r)}
                onSetActive={handleSetActive}
              />
            ) : (
              <DocumentSection
                title="Resume"
                type="resume"
                doc={activeResume}
                isUploading={uploadingType === "resume"}
                uploadError={uploadErrors.resume}
                onUpload={(f) => handleUpload("resume", f)}
                onRequestDelete={() => activeResume && setPendingDeleteDoc(activeResume)}
              />
            )}

            <DocumentSection
              title="Cover Letter"
              type="cover_letter"
              doc={coverLetter}
              isUploading={uploadingType === "cover_letter"}
              uploadError={uploadErrors.cover_letter}
              onUpload={(f) => handleUpload("cover_letter", f)}
              onRequestDelete={() => coverLetter && setPendingDeleteDoc(coverLetter)}
            />
          </div>

          <DocumentGenerators />

          <RecentSearches searches={searches} />
        </main>
      </div>

      <ConfirmDeleteModal
        open={pendingDeleteDoc !== null}
        type={pendingDeleteDoc?.file_type ?? null}
        onCancel={() => setPendingDeleteDoc(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export default DashboardPage;
