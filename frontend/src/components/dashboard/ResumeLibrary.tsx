"use client";
// KAN-37: Premium resume library — shows up to 3 stored resumes with
// Active badge and Set Active button. Only rendered for premium plan users.

import * as React from "react";
import { FileText, ExternalLink, Trash2, CheckCircle2, Loader2, Upload } from "lucide-react";
import { FileTypeBadge } from "../ui/FileTypeBadge";
import { UploadBox } from "./UploadBox";
import { validateFile } from "../../models/documentModel";
import { supabase } from "@/controllers/suabaseClient";
import type { UserDocument } from "../../controllers/useDocuments";

const PREMIUM_RESUME_LIMIT = 3;

interface ResumeLibraryProps {
  resumes: UserDocument[];          // all stored resumes for this premium user
  isUploading: boolean;
  uploadError: string | null;
  onUpload: (file: File) => void;
  onDelete: (resume: UserDocument) => void;
  onSetActive: (resumeId: string) => void;
}

function getFileTypeLabel(mime: string, name: string): "PDF" | "DOC" | "DOCX" {
  if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "PDF";
  if (name.toLowerCase().endsWith(".docx")) return "DOCX";
  return "DOC";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ResumeLibrary({
  resumes,
  isUploading,
  uploadError,
  onUpload,
  onDelete,
  onSetActive,
}: ResumeLibraryProps) {
  const [settingActiveId, setSettingActiveId] = React.useState<string | null>(null);
  const [setActiveError, setSetActiveError] = React.useState<string | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const atLimit = resumes.length >= PREMIUM_RESUME_LIMIT;

  const handleFile = (file: File) => {
    const err = validateFile(file);
    if (err) { setLocalError(err); return; }
    setLocalError(null);
    onUpload(file);
  };

  const handleSetActive = async (resumeId: string) => {
    setSettingActiveId(resumeId);
    setSetActiveError(null);

    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    try {
      const response = await fetch(`/api/resume/${resumeId}/set-active`, {
        method: "PATCH",
        headers,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || body?.error || "Failed to set active resume.");
      }

      onSetActive(resumeId);
    } catch (err: any) {
      setSetActiveError(err.message || "Could not switch active resume.");
    } finally {
      setSettingActiveId(null);
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Resumes{" "}
          <span className="font-normal text-muted-foreground">
            {resumes.length} of {PREMIUM_RESUME_LIMIT} stored
          </span>
        </h3>
      </div>

      {/* Resume cards */}
      <div className="space-y-3">
        {resumes.map((resume) => {
          const isActive = resume.is_current === true;
          const isSettingThis = settingActiveId === resume.id;
          const fileType = getFileTypeLabel(resume.mime_type, resume.file_name);

          return (
            <div
              key={resume.id}
              className={`rounded-2xl border bg-surface p-5 shadow-soft transition-colors ${
                isActive ? "border-primary/40 bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    isActive ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {resume.file_name}
                    </p>
                    <FileTypeBadge type={fileType} />
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Uploaded {formatDate(resume.created_at)}
                  </p>

                  {/* Actions row */}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {resume.file_url && (
                      <a
                        href={resume.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}

                    {!isActive && (
                      <button
                        type="button"
                        disabled={!!settingActiveId}
                        onClick={() => handleSetActive(resume.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSettingThis ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Setting active…</>
                        ) : (
                          "Set Active"
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => onDelete(resume)}
                  aria-label={`Delete ${resume.file_name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Set-active error */}
        {setActiveError && (
          <p className="text-xs font-medium text-red-600">{setActiveError}</p>
        )}

        {/* Upload area — hidden when at limit */}
        {atLimit ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium text-foreground">Resume library full</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Delete a resume above to upload a new one.
            </p>
          </div>
        ) : (
          <UploadBox
            label="Upload another resume"
            onFile={handleFile}
            error={localError || uploadError}
            isLoading={isUploading}
          />
        )}
      </div>
    </section>
  );
}
