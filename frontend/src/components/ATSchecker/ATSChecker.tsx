"use client";

import * as React from "react";
import { Upload, Plus, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";

export function ATSChecker() {
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  const [jobDescription, setJobDescription] = React.useState("");
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

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
      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("jobDescription", jobDescription);

      const response = await fetch("http://localhost:8000/api/analyze-ats", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze the resume. Please try again.");
      }

      const data = await response.json();
      
      setSuccess(true);
      console.log("Analysis Result:", data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    // 1. Added a full-screen flex container to hold the sidebar and main content
    <div className="flex h-screen w-full bg-background overflow-hidden">
      
      {/* 2. Left Side: Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-surface">
        <Sidebar />
      </aside>

      {/* 3. Right Side: Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto">
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
        </div>
      </main>
    </div>
  );
}