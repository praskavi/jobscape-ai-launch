"use client";

import * as React from "react";
import { 
  Upload, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  XCircle, 
  Sparkles,
  Lock
} from "lucide-react";
import { supabase } from "@/controllers/suabaseClient"; 
import { useSearchParams } from "next/navigation";
import { UsageCounter } from "@/components/subscription/UsageCounter";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface AnalysisResult {
  score: number;
  status: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  aiRecommendations: string | {
    feedback?: string;
    strengths?: string | string[];
  } | null;
}

interface StoredResume {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
  is_current?: boolean;
}

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

export function ATSChecker() {
  const { refresh: refreshSubscription } = useSubscription();
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  const [storedResumes, setStoredResumes] = React.useState<StoredResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = React.useState<string>("");
  const [isLoadingResumes, setIsLoadingResumes] = React.useState(true);
  const [jobDescription, setJobDescription] = React.useState("");
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  
  const [result, setResult] = React.useState<AnalysisResult | null>(null);
  
  // NEW: State specifically for the AI generation phase
  const [isFetchingAI, setIsFetchingAI] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  const searchParams = useSearchParams();
  
  React.useEffect(() => {
    const jdFromUrl = searchParams.get("jd");
    if (jdFromUrl) {
      setJobDescription(jdFromUrl);
    }
  }, [searchParams]);

  React.useEffect(() => {
    let isMounted = true;

    async function loadStoredResumes() {
      setIsLoadingResumes(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) {
          setStoredResumes([]);
          setSelectedResumeId("");
          setIsLoadingResumes(false);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle<{ id: string }>();

      if (!profile?.id) {
        if (isMounted) {
          setStoredResumes([]);
          setSelectedResumeId("");
          setIsLoadingResumes(false);
        }
        return;
      }

      const { data: resumes, error: resumesError } = await supabase
        .from("user_files")
        .select("id, file_name, file_path, mime_type, file_size_bytes, created_at, is_current")
        .eq("user_profile_id", profile.id)
        .eq("file_type", "resume")
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (resumesError || !resumes?.length) {
        setStoredResumes([]);
        setSelectedResumeId("");
        setIsLoadingResumes(false);
        return;
      }

      setStoredResumes(resumes);
      setSelectedResumeId((current) => {
        if (current && resumes.some((resume) => resume.id === current)) {
          return current;
        }
        return resumes.find((resume) => resume.is_current)?.id ?? resumes[0].id;
      });
      setIsLoadingResumes(false);
    }

    loadStoredResumes();

    return () => {
      isMounted = false;
    };
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      
      if (!validTypes.includes(file.type)) {
        setError("Please upload a valid PDF, DOC, or DOCX file.");
        setResumeFile(null);
        return;
      }
      
      setError(null);
      setResumeFile(file);
      setSelectedResumeId("");
      
      // Unlock the scan button when a new file is added
      setSuccess(false); 
      setResult(null);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJobDescription(e.target.value);
    // Unlock the scan button when text is edited
    setSuccess(false);
    setResult(null);
  };

  // Base scan: Just math and keywords, NO AI.
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(false);
    setResult(null); 

    if (!resumeFile && !selectedResumeId) return setError("Please choose a saved resume or upload one first.");
    if (!jobDescription.trim()) return setError("Please provide a job description.");

    setIsAnalyzing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const formData = new FormData();
      if (selectedResumeId) {
        formData.append("resumeFileId", selectedResumeId);
      } else if (resumeFile) {
        formData.append("resume", resumeFile);
      }
      formData.append("jobDescription", jobDescription);
      formData.append("fetchAdvancedAI", "false"); // Tell backend to skip AI

      const response = await fetch("/api/analyze-ats", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Failed to analyze the resume. Please try again."));
      }

      const data = await response.json();
      setSuccess(true);
      setResult(data.analysis); 
      await refreshSubscription();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Advanced scan: Calls the AI only when clicked
  const handleFetchAdvancedAI = async () => {
    if ((!resumeFile && !selectedResumeId) || !jobDescription) return;
    
    setAiError(null);
    setIsFetchingAI(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {};

      const formData = new FormData();
      if (selectedResumeId) {
        formData.append("resumeFileId", selectedResumeId);
      } else if (resumeFile) {
        formData.append("resume", resumeFile);
      }
      formData.append("jobDescription", jobDescription);
      formData.append("fetchAdvancedAI", "true"); // Trigger AI logic in backend

      const response = await fetch("/api/analyze-ats", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Failed to generate AI recommendations."));
      }

      const data = await response.json();
      
      // Update the existing result object with just the AI recommendations
      setResult(prev => prev ? { ...prev, aiRecommendations: data.analysis.aiRecommendations } : null);
      await refreshSubscription();

    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsFetchingAI(false);
    }
  };

  const selectedStoredResume = storedResumes.find((resume) => resume.id === selectedResumeId);
  const hasResumeInput = Boolean(selectedResumeId || resumeFile);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">ATS Resume Checker</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose one of your saved resumes and paste a job description to see how well you match.</p>
      </div>
      <UsageCounter featureCode="ats_score" label="ATS checks" className="max-w-sm" />

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Resume</label>
          <div className={`flex min-h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${hasResumeInput ? "border-primary/50 bg-primary/[0.02]" : "border-border bg-surface"}`}>
            {isLoadingResumes ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Loading saved resumes...</p>
              </div>
            ) : selectedStoredResume ? (
              <div className="flex w-full max-w-sm flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedStoredResume.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedStoredResume.file_size_bytes
                      ? `${(selectedStoredResume.file_size_bytes / 1024 / 1024).toFixed(2)} MB`
                      : "Saved resume"}
                    {selectedStoredResume.is_current ? " - Active resume" : ""}
                  </p>
                </div>

                {storedResumes.length > 1 && (
                  <select
                    value={selectedResumeId}
                    onChange={(event) => {
                      setSelectedResumeId(event.target.value);
                      setResumeFile(null);
                      setSuccess(false);
                      setResult(null);
                    }}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {storedResumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>
                        {resume.file_name}{resume.is_current ? " (active)" : ""}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedResumeId("");
                      setSuccess(false);
                      setResult(null);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Upload a different file
                  </button>
                </div>
              </div>
            ) : resumeFile ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{resumeFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={() => { setResumeFile(null); setSuccess(false); setResult(null); }} className="mt-2 text-sm text-destructive hover:underline">
                  Remove file
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {storedResumes.length ? "Upload a different resume" : "Upload your resume"}
                </h3>
                <p className="mb-6 mt-1 text-sm text-muted-foreground">
                  {storedResumes.length
                    ? "Or choose one saved in Documents."
                    : "No saved resume found. Allowed formats: PDF, DOC, DOCX"}
                </p>
                <input type="file" id="resume-upload" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {storedResumes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedResumeId(storedResumes.find((resume) => resume.is_current)?.id ?? storedResumes[0].id);
                        setResumeFile(null);
                        setSuccess(false);
                        setResult(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <FileText className="h-4 w-4" /> Use saved resume
                    </button>
                  )}
                  <label htmlFor="resume-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
                    <Plus className="h-4 w-4" /> Choose file
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="jd-input" className="text-sm font-semibold text-foreground">Job Description</label>
          <div className="relative flex-1">
            <textarea
              id="jd-input"
              value={jobDescription}
              onChange={handleTextChange}
              placeholder="Paste the target job description here..."
              className="h-full min-h-[300px] w-full resize-none rounded-xl border border-border bg-surface p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <FileText className="absolute right-4 top-4 h-5 w-5 text-muted-foreground/50" />
          </div>
        </div>

        <div className="col-span-full flex flex-col items-end gap-4 border-t border-border pt-6">
          {error && (
            <div className="flex w-full items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          {success && (
            <div className="flex w-full items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Analysis complete! Check the results below.
            </div>
          )}

          <button
            type="submit"
            disabled={isAnalyzing || success || !hasResumeInput || !jobDescription.trim()}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-8 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-400"
          >
            {isAnalyzing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
            ) : success ? (
              <><CheckCircle2 className="mr-2 h-4 w-4" /> Match Analyzed</>
            ) : (
              "Analyze Match"
            )}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            
            <div className="border-b border-border bg-gray-50 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Analysis Results</h2>
                <p className="text-sm text-gray-500 mt-1">Based on text comparison and keyword frequency.</p>
              </div>
              <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Match Score</p>
                  <p className="text-sm font-medium text-gray-900">{result.status}</p>
                </div>
                <div className={`text-4xl font-extrabold ${getScoreColor(result.score)}`}>
                  {result.score}%
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold text-gray-900">Matched Keywords</h3>
                  <span className="ml-auto text-xs font-medium bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                    {result.matchedKeywords.length}
                  </span>
                </div>
                {result.matchedKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.matchedKeywords.map((kw, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200 capitalize">
                        {kw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No exact matches found.</p>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold text-gray-900">Missing Keywords</h3>
                  <span className="ml-auto text-xs font-medium bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                    {result.missingKeywords.length}
                  </span>
                </div>
                {result.missingKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((kw, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-100 capitalize">
                        {kw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Excellent! No major keywords missing.</p>
                )}
              </div>
            </div>

            {/* AI Recommendations Gated Area */}
            <div className="p-6 bg-blue-50/50 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Advanced AI Insights</h3>
              </div>

              {!result.aiRecommendations ? (
                <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border border-blue-100 shadow-sm text-center">
                  {result.score >= 75 ? (
                    <>
                      <p className="text-sm text-gray-600 mb-4">
                        Your resume passed the ATS threshold! Unlock personalized AI recommendations to perfect your phrasing and stand out.
                      </p>
                      <button 
                        onClick={handleFetchAdvancedAI}
                        disabled={isFetchingAI}
                        className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isFetchingAI ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Insights...</> : "Unlock AI Feedback"}
                      </button>
                      {aiError && <p className="mt-3 text-xs text-red-500">{aiError}</p>}
                    </>
                  ) : (
                    <>
                      <Lock className="h-8 w-8 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-700">AI Insights Locked</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-md">
                        Please update your resume to include the missing keywords and achieve a score of at least 75% before generating AI recommendations.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-700 leading-relaxed bg-white p-6 rounded-lg border border-blue-100 shadow-sm">
                  {typeof result.aiRecommendations === 'object' && result.aiRecommendations !== null ? (
                    <div className="space-y-6">
                      {result.aiRecommendations.feedback && (
                        <div>
                          <span className="font-bold text-gray-900 block mb-2 text-base">Constructive Feedback:</span>
                          <p className="whitespace-pre-wrap">{result.aiRecommendations.feedback}</p>
                        </div>
                      )}
                      {result.aiRecommendations.strengths && (
                        <div>
                          <span className="font-bold text-gray-900 block mb-2 text-base">Key Strengths:</span>
                          {Array.isArray(result.aiRecommendations.strengths) ? (
                            <ul className="list-disc pl-5 space-y-1 marker:text-green-500">
                              {result.aiRecommendations.strengths.map((strength: string, i: number) => (
                                <li key={i}>{strength}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="whitespace-pre-wrap">{result.aiRecommendations.strengths}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{String(result.aiRecommendations)}</div>
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
