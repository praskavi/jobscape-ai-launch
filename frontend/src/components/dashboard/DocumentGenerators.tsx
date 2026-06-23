"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Copy, FileText, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/controllers/suabaseClient";
import { UsageCounter } from "@/components/subscription/UsageCounter";
import { useSubscription } from "@/contexts/SubscriptionContext";

type EnhancementResult = {
  summary?: string;
  bulletImprovements?: Array<{
    before?: string;
    after?: string;
  }>;
  keywordsToAdd?: string[];
  formattingAdvice?: string[];
};

type CoverLetterResult = {
  coverLetter?: string;
  subjectLine?: string;
  keySellingPoints?: string[];
};

async function getApiErrorMessage(response: Response, fallback: string) {
  const errorData = await response.json().catch(() => null);

  if (response.status === 402) {
    if (errorData?.reason === "usage_limit_reached") {
      return "Your monthly allowance for this feature has been used. Upgrade your plan or try again next month.";
    }

    if (errorData?.reason === "feature_not_enabled") {
      return "This feature is not included in your current plan.";
    }

    return errorData?.error || "This feature is not available on your current subscription.";
  }

  return errorData?.message || errorData?.error || fallback;
}

function resultToText(
  result: EnhancementResult | CoverLetterResult | null,
  mode: "resume" | "cover",
) {
  if (!result) return "";

  if (mode === "cover") {
    const coverResult = result as CoverLetterResult;
    return [
      coverResult.subjectLine ? `Subject: ${coverResult.subjectLine}` : "",
      coverResult.coverLetter || "",
      coverResult.keySellingPoints?.length ? `Key points:\n${coverResult.keySellingPoints.map((point) => `- ${point}`).join("\n")}` : "",
    ].filter(Boolean).join("\n\n");
  }

  const enhancementResult = result as EnhancementResult;
  return [
    enhancementResult.summary ? `Summary:\n${enhancementResult.summary}` : "",
    enhancementResult.bulletImprovements?.length
      ? `Bullet improvements:\n${enhancementResult.bulletImprovements.map((item) => `Before: ${item.before || ""}\nAfter: ${item.after || ""}`).join("\n\n")}`
      : "",
    enhancementResult.keywordsToAdd?.length ? `Keywords to add:\n${enhancementResult.keywordsToAdd.join(", ")}` : "",
    enhancementResult.formattingAdvice?.length ? `Formatting advice:\n${enhancementResult.formattingAdvice.map((item) => `- ${item}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

export function DocumentGenerators() {
  const { refresh: refreshSubscription } = useSubscription();
  const [mode, setMode] = React.useState<"resume" | "cover">("resume");
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  const [jobDescription, setJobDescription] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [roleTitle, setRoleTitle] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [enhancement, setEnhancement] = React.useState<EnhancementResult | null>(null);
  const [coverLetter, setCoverLetter] = React.useState<CoverLetterResult | null>(null);

  const activeResult = mode === "resume" ? enhancement : coverLetter;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF, DOC, or DOCX resume.");
      setResumeFile(null);
      return;
    }

    setError(null);
    setResumeFile(file);
  };

  const generate = async () => {
    setError(null);
    setSuccess(null);

    if (!resumeFile) {
      setError("Please upload a resume.");
      return;
    }

    if (mode === "cover" && jobDescription.trim().length < 20) {
      setError("Please provide a job description.");
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("jobDescription", jobDescription);

      const endpoint = mode === "resume"
        ? "/api/generate-resume-enhancement"
        : "/api/generate-cover-letter";

      if (mode === "cover") {
        formData.append("companyName", companyName);
        formData.append("roleTitle", roleTitle);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Generation failed."));
      }

      const data = await response.json();

      if (mode === "resume") {
        setEnhancement(data.enhancement || null);
        setSuccess("Resume enhancement generated.");
      } else {
        setCoverLetter(data.coverLetter || null);
        setSuccess("Cover letter generated.");
      }
      await refreshSubscription();
    } catch (err: any) {
      setError(err.message || "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyResult = async () => {
    const text = resultToText(activeResult, mode);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard.");
  };

  return (
    <section className="mb-8 rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI document tools</h3>
          <p className="mt-1 text-sm text-muted-foreground">Generate resume improvements and cover letters.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <UsageCounter featureCode="resume_generate" label="Resume enhancements" compact />
          <UsageCounter featureCode="cover_letter_generate" label="Cover letters" compact />
        </div>
        <div className="inline-flex rounded-lg border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setMode("resume")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "resume" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => setMode("cover")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "cover" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Cover letter
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Resume</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
            />
          </label>

          {resumeFile && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span className="truncate">{resumeFile.name}</span>
            </div>
          )}

          {mode === "cover" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Role</span>
                <input
                  value={roleTitle}
                  onChange={(event) => setRoleTitle(event.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Company</span>
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Job description</span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              className="mt-2 min-h-40 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{success}</p>
            </div>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={isGenerating}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {mode === "resume" ? "Generate Enhancement" : "Generate Cover Letter"}
          </button>
        </div>

        <div className="min-h-80 rounded-lg border border-border bg-background p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Output</h4>
            </div>
            <button
              type="button"
              onClick={copyResult}
              disabled={!activeResult}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>

          {activeResult ? (
            <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
              {resultToText(activeResult, mode)}
            </pre>
          ) : (
            <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              No output yet
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
