"use client";

import * as React from "react";
import { 
  Search, MapPin, AlertCircle, FileText, UploadCloud, X, Briefcase, Sparkles
} from "lucide-react";
import { supabase } from "@/controllers/suabaseClient";
import { useRouter } from "next/navigation";

interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  work_arrangement: string;
  matchPercentage: number;
  tags: string[];
  apply_url: string;
  description?: string; // Added to hold the job description for the modal
}

export function AIJobMatch() {
  const router = useRouter();

  const [jobTitle, setJobTitle] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  
  const [isSearching, setIsSearching] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<JobMatch[]>([]);
  
  // State for the Modal
  const [selectedJob, setSelectedJob] = React.useState<JobMatch | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      setError("Invalid format. Please upload a PDF or Word document.");
      return;
    }
    setError(null);
    setResumeFile(file);
    setHasSearched(false);
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
        throw new Error(errorData?.error || "Failed to find matches.");
      }

      const data = await response.json();
      setResults(data.matches || []);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message);
      setHasSearched(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAtsEnhancer = (job: JobMatch) => {
    const params = new URLSearchParams();
    if (job.description) {
      params.set("jd", job.description);
    }
    router.push(`/atschecker?${params.toString()}`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl py-6 px-4">
      <div className="flex flex-col gap-6">
        
        {/* Search Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => { setJobTitle(e.target.value); setHasSearched(false); }}
              placeholder="Target Role (e.g. Salesforce Developer)"
              className="w-full pl-11 pr-4 py-3.5 text-base rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => { setLocation(e.target.value); setHasSearched(false); }}
              placeholder="Location (e.g. Melbourne)"
              className="w-full pl-11 pr-4 py-3.5 text-base rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
            />
          </div>
        </div>

        {/* Upload Area */}
        {!resumeFile ? (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-10 px-6 text-center transition-all duration-200 
              ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
          >
            <UploadCloud className="h-8 w-8 text-blue-600 mb-3" />
            <p className="text-base font-medium text-gray-900">Drag & drop your resume</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">PDF, DOC, DOCX up to 5MB</p>
            <label htmlFor="resume-upload" className="cursor-pointer inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
              Browse Files
            </label>
            <input id="resume-upload" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                <span className="text-base font-medium text-gray-900 truncate">
                  {resumeFile.name}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full uppercase tracking-wide">
                  Selected
                </span>
                <button 
                  onClick={() => { setResumeFile(null); setHasSearched(false); }}
                  className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <button
              onClick={handleSearch}
              disabled={isSearching || hasSearched}
              className="w-full h-12 inline-flex items-center justify-center rounded-xl text-base font-semibold text-white transition-all shadow-sm 
                disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 
                bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.99]"
            >
              {isSearching ? "Analyzing Profile..." : hasSearched ? "Analysis Complete" : "Find Best Matches"}
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 border border-rose-100">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {isSearching && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="text-gray-600 font-medium">Scanning thousands of active jobs...</p>
          </div>
        )}

        {!isSearching && !hasSearched && resumeFile && (
           <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 mt-4">
             <Briefcase className="h-10 w-10 text-gray-300 mb-3" />
             <h3 className="text-gray-500 font-medium text-sm">Ready to scan against active job listings</h3>
           </div>
        )}

        {/* Results List */}
        {!isSearching && hasSearched && (
          <div className="space-y-4 mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {results.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-gray-500 text-base">No highly matched jobs found. Try adjusting your search filters.</p>
              </div>
            ) : (
              results.map((job, idx) => (
                <div 
                  key={job.id} 
                  onClick={() => setSelectedJob(job)}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col gap-5 cursor-pointer"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">
                        {job.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {job.company} · {job.type} {job.location ? `· ${job.location}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-2xl font-bold text-blue-600 leading-none">
                        {job.matchPercentage}%
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Match
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${job.matchPercentage}%` }} 
                    />
                  </div>

                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((tag, i) => (
                        <span 
                          key={i} 
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* NEW: Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-100">
              <div className="pr-8">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{selectedJob.title}</h2>
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md">
                    {selectedJob.matchPercentage}% Match
                  </span>
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  {selectedJob.company} • {selectedJob.location} • {selectedJob.type}
                </p>
              </div>
              <button 
                onClick={() => setSelectedJob(null)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable Job Description) */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Job Description</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {selectedJob.description || "No description provided by the database."}
              </div>
            </div>

            {/* Modal Footer with Action Buttons */}
            <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={() => setSelectedJob(null)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>

              {selectedJob.apply_url && (
                <a 
                  href={selectedJob.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm hover:shadow transition-all flex items-center justify-center"
                >
                  Apply Now
                </a>
              )}
              
              <button 
                onClick={() => handleAtsEnhancer(selectedJob)}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm hover:shadow transition-all flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI Enhancer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}