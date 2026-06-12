"use client";

import * as React from "react";
import { Search, MapPin, CheckCircle2, AlertCircle, Loader2, Upload, SearchX } from "lucide-react";
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
  const [jobTitle, setJobTitle] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  
  const [isSearching, setIsSearching] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<JobMatch[]>([]);

  // When inputs change, allow the user to search again
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJobTitle(e.target.value);
    setHasSearched(false);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value);
    setHasSearched(false);
  };

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
      setHasSearched(false); // Reset search state on new file
    }
  };

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
      setHasSearched(true); // Mark as searched to disable button

    } catch (err: any) {
      setError(err.message);
      setHasSearched(false);
    } finally {
      setIsSearching(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-500";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return "bg-green-600";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-5xl">
      
      {/* Top Search Bar Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative flex items-center rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={jobTitle}
            onChange={handleTitleChange}
            placeholder="Job Title or Keyword"
            className="ml-3 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        <div className="relative flex items-center rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <MapPin className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={location}
            onChange={handleLocationChange}
            placeholder="Location"
            className="ml-3 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Upload Area */}
      <div className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors bg-white ${resumeFile ? 'border-green-300 bg-green-50/30' : 'border-gray-200'}`}>
        {resumeFile ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{resumeFile.name}</p>
              <p className="text-xs text-gray-500">Ready for analysis</p>
            </div>
            <button 
              onClick={() => { setResumeFile(null); setHasSearched(false); setResults([]); }}
              className="mt-1 text-xs text-red-500 hover:text-red-700 hover:underline font-medium"
            >
              Remove file
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Upload className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              Upload your resume
            </h3>
            <p className="mb-4 mt-1 text-xs text-gray-500">
              Allowed formats: PDF, DOC, DOCX
            </p>
            
            <input
              type="file"
              id="resume-match-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
            />
            <label
              htmlFor="resume-match-upload"
              className="inline-flex cursor-pointer items-center justify-center rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              <span className="mr-2">+</span> Choose file
            </label>
          </>
        )}
      </div>

      {/* Action Button & Errors */}
      <div className="flex flex-col items-start gap-3">
        {error && (
          <div className="flex w-full items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        {/* Dynamic Button State */}
        <button
          onClick={handleSearch}
          disabled={isSearching || !resumeFile || hasSearched}
          className="inline-flex h-10 items-center justify-center rounded-full px-6 text-sm font-medium text-white transition-all shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 bg-blue-600 hover:bg-blue-700"
        >
          {isSearching ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
          ) : hasSearched ? (
            <><CheckCircle2 className="mr-2 h-4 w-4" /> Search Complete</>
          ) : (
            "Find Best Matches"
          )}
        </button>
      </div>

      {/* Results Section */}
      <div className="mt-2 flex flex-col gap-4">
        
        {/* Empty State */}
        {hasSearched && results.length === 0 && !isSearching && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 px-4 text-center animate-in fade-in duration-500">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-4">
              <SearchX className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No jobs found matching your resume</h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              We couldn't find any job postings that closely match your skills. Try adjusting your job title or location.
            </p>
          </div>
        )}

        {/* Found Jobs State */}
        {results.length > 0 && results.map((job) => (
          <div key={job.id} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{job.title}</h3>
                <p className="text-sm font-medium text-gray-500 mt-0.5">{job.company} · <span className="font-normal">{job.type}</span></p>
              </div>
              <div className="text-right flex-shrink-0 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <span className={`text-xl font-black tracking-tight ${getScoreColor(job.matchPercentage)}`}>
                  {job.matchPercentage}%
                </span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">ATS Score</p>
              </div>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${getScoreBackground(job.matchPercentage)}`}
                style={{ width: `${job.matchPercentage}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {job.tags.map((tag, i) => (
                <span key={i} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100 capitalize">
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