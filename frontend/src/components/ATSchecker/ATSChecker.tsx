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
  Sparkles 
} from "lucide-react";
import { supabase } from "@/controllers/suabaseClient"; // Fixed typo in import if you renamed it, otherwise keep suabaseClient
import { useSearchParams } from "next/navigation";

// Define the shape of our API response
interface AnalysisResult {
  score: number;
  status: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  aiRecommendations: string |{
    feedback?: string;
    strengths?: string | string[];
  };
}

export function ATSChecker() {
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  const [jobDescription, setJobDescription] = React.useState("");
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  
  // NEW: State to hold the backend analysis results
  const [result, setResult] = React.useState<AnalysisResult | null>(null);

  const searchParams = useSearchParams();
  
  React.useEffect(() => {
    const jdFromUrl = searchParams.get("jd");
    if (jdFromUrl) {
      setJobDescription(jdFromUrl);
    }
  }, [searchParams]);
  
  // Handle file selection
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
    }
  };

  // Handle sending data to the backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setResult(null); // Clear previous results

    if (!resumeFile) {
      setError("Please upload a resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please provide a job description.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("jobDescription", jobDescription);

      const response = await fetch("/api/analyze-ats", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze the resume. Please try again.");
      }

      const data = await response.json();
      
      setSuccess(true);
      setResult(data.analysis); // Save the results to state

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to determine score color
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          ATS Resume Checker
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your resume and paste a job description to see how well you match.
        </p>
      </div>

      {/* Main Content Grid */}
      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
        {/* Left Side: Resume Upload */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Resume</label>
          <div
            className={`flex min-h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              resumeFile ? "border-primary/50 bg-primary/[0.02]" : "border-border bg-surface"
            }`}
          >
            {resumeFile ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{resumeFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResumeFile(null)}
                  className="mt-2 text-sm text-destructive hover:underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Upload your resume
                </h3>
                <p className="mb-6 mt-1 text-sm text-muted-foreground">
                  Allowed formats: PDF, DOC, DOCX
                </p>
                
                <input
                  type="file"
                  id="resume-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="resume-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  <Plus className="h-4 w-4" />
                  Choose file
                </label>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Job Description Textarea */}
        <div className="flex flex-col gap-2">
          <label htmlFor="jd-input" className="text-sm font-semibold text-foreground">
            Job Description
          </label>
          <div className="relative flex-1">
            <textarea
              id="jd-input"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description here..."
              className="h-full min-h-[300px] w-full resize-none rounded-xl border border-border bg-surface p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <FileText className="absolute right-4 top-4 h-5 w-5 text-muted-foreground/50" />
          </div>
        </div>

        {/* Status Messages & Submit Button */}
        <div className="col-span-full flex flex-col items-end gap-4 border-t border-border pt-6">
          {error && (
            <div className="flex w-full items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="flex w-full items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Analysis complete! Check the results below.
            </div>
          )}

          <button
            type="submit"
            disabled={isAnalyzing || !resumeFile || !jobDescription.trim()}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-8 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Match...
              </>
            ) : (
              "Analyze Match"
            )}
          </button>
        </div>
      </form>

      {/* NEW: Analysis Results Section */}
      {result && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            
            {/* Header / Score Area */}
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

            {/* Keyword Data Grid */}
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              
              {/* Matched Keywords */}
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

              {/* Missing Keywords */}
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

            {/* AI Recommendations */}
<div className="p-6 bg-blue-50/50 border-t border-border">
  <div className="flex items-center gap-2 mb-4">
    <Sparkles className="h-5 w-5 text-blue-600" />
    <h3 className="font-semibold text-gray-900">AI Recommendations</h3>
  </div>
  <div className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
    
    {/* Check if aiRecommendations is an object (from your AI backend) or a string */}
    {typeof result.aiRecommendations === 'object' && result.aiRecommendations !== null ? (
      <div className="space-y-4">
        
        {/* Render Feedback */}
        {result.aiRecommendations.feedback && (
          <div>
            <span className="font-semibold text-gray-900 block mb-1">Feedback:</span>
            <p className="whitespace-pre-wrap">{result.aiRecommendations.feedback}</p>
          </div>
        )}

        {/* Render Strengths */}
        {result.aiRecommendations.strengths && (
          <div>
            <span className="font-semibold text-gray-900 block mb-1">Strengths:</span>
            {Array.isArray(result.aiRecommendations.strengths) ? (
              <ul className="list-disc pl-5 space-y-1">
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
      /* Fallback if the AI returns a raw string instead of an object */
      <div className="whitespace-pre-wrap">{String(result.aiRecommendations)}</div>
    )}

  </div>
</div>

          </div>
        </div>
      )}
    </div>
  );
}