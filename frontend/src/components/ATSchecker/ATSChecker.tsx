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

export function ATSChecker() {
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
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

    if (!resumeFile) return setError("Please upload a resume first.");
    if (!jobDescription.trim()) return setError("Please provide a job description.");

    setIsAnalyzing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("jobDescription", jobDescription);
      formData.append("fetchAdvancedAI", "false"); // Tell backend to skip AI

      const response = await fetch("/api/analyze-ats", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to analyze the resume. Please try again.");

      const data = await response.json();
      setSuccess(true);
      setResult(data.analysis); 

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Advanced scan: Calls the AI only when clicked
  const handleFetchAdvancedAI = async () => {
    if (!resumeFile || !jobDescription) return;
    
    setAiError(null);
    setIsFetchingAI(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {};

      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("jobDescription", jobDescription);
      formData.append("fetchAdvancedAI", "true"); // Trigger AI logic in backend

      const response = await fetch("/api/analyze-ats", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to generate AI recommendations.");

      const data = await response.json();
      
      // Update the existing result object with just the AI recommendations
      setResult(prev => prev ? { ...prev, aiRecommendations: data.analysis.aiRecommendations } : null);

    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsFetchingAI(false);
    }
  };

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
        <p className="mt-1 text-sm text-muted-foreground">Upload your resume and paste a job description to see how well you match.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Resume</label>
          <div className={`flex min-h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${resumeFile ? "border-primary/50 bg-primary/[0.02]" : "border-border bg-surface"}`}>
            {resumeFile ? (
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
                <h3 className="text-base font-semibold text-foreground">Upload your resume</h3>
                <p className="mb-6 mt-1 text-sm text-muted-foreground">Allowed formats: PDF, DOC, DOCX</p>
                <input type="file" id="resume-upload" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                <label htmlFor="resume-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
                  <Plus className="h-4 w-4" /> Choose file
                </label>
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
            disabled={isAnalyzing || success || !resumeFile || !jobDescription.trim()}
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