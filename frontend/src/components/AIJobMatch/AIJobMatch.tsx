"use client";

import * as React from "react";
import { Search, MapPin, FileText, CheckCircle2, AlertCircle, Loader2, Upload } from "lucide-react";
import { supabase } from "@/controllers/suabaseClient";

// Define the shape of our matched job data
interface JobMatch {
  id: string;
  title: string;
  company: string;
  type: string;
  matchPercentage: number;
  tags: string[];
}

export function AIJobMatch() {
  const [jobTitle, setJobTitle] = React.useState("Salesforce Developer");
  const [location, setLocation] = React.useState("Melbourne");
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<JobMatch[]>([]);

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
        return;
      }
      
      setError(null);
      setResumeFile(file);
    }
  };

  // Handle sending data to the backend for vector search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!resumeFile) {
      setError("Please upload your resume to find matches.");
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("jobTitle", jobTitle);
      formData.append("location", location);

      const response = await fetch("/api/find-jobs", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to find job matches. Please try again.");
      }

      const data = await response.json();
      setResults(data.matches || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
      
      {/* Top Search Bar */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative flex items-center rounded-full border border-border bg-surface px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Job Title or Keyword"
            className="ml-3 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="relative flex items-center rounded-full border border-border bg-surface px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="ml-3 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Selected File Area */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium text-foreground">
            {resumeFile ? resumeFile.name : "No resume selected"}
          </span>
        </div>
        
        {resumeFile ? (
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              selected
            </span>
            <button 
              onClick={() => setResumeFile(null)}
              className="text-xs text-destructive hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="relative">
             <input
                type="file"
                id="resume-match-upload"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              <label
                htmlFor="resume-match-upload"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
              >
                <Upload className="h-4 w-4" />
                Upload Resume
              </label>
          </div>
        )}
      </div>

      {/* Action Button & Errors */}
      <div className="flex flex-col items-end gap-2 mt-2">
        {error && (
          <div className="flex w-full items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        <button
          onClick={handleSearch}
          disabled={isSearching || !resumeFile}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSearching ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Matching Jobs...</>
          ) : (
            "Find Matches"
          )}
        </button>
      </div>

      {/* Results List */}
      <div className="mt-4 flex flex-col gap-4">
        {results.map((job) => (
          <div key={job.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
            
            {/* Header & Percentage */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{job.title}</h3>
                <p className="text-sm text-muted-foreground">{job.company} · {job.type}</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-blue-600">{job.matchPercentage}%</span>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Match</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/50">
              <div 
                className="h-full rounded-full bg-blue-600 transition-all duration-1000 ease-out"
                style={{ width: `${job.matchPercentage}%` }}
              />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 pt-1">
              {job.tags.map((tag, i) => (
                <span key={i} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                  {tag}
                </span>
              ))}
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}