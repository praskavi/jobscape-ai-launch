"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/controllers/suabaseClient';
import { useRouter } from 'next/navigation'; // NEW: Import Next.js router
import { Search, X } from 'lucide-react'; // NEW: Added X icon for modal close

// Define the Job structure based on your Supabase columns
interface Job {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  city: string;
  state: string;
  salary: string;
  description: string;
  country: string;
  classification: string;
  sub_classification: string;
  work_arrangement: string;
  employment_type: string;
  apply_url: string;
}

const JobSearchPage: React.FC = () => {
  const router = useRouter(); // NEW: Initialize router

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string }>({
    full_name: 'User',
    email: '',
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const item_per_page = 100;

  // NEW: State to track which job is currently selected for the modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // 1. Fetch current user from Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          let finalName = 'User';

          // Step A: Fetch the name from the custom profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .single();

          if (profileData && profileData.full_name) {
            finalName = profileData.full_name;
          } else {
            // Step B: Fallback
            finalName = user.user_metadata?.full_name
              || user.user_metadata?.name
              || user.email?.split('@')[0]
              || 'User';
          }

          setUserProfile({
            full_name: finalName,
            email: user.email || '',
          });
        }

        // 2. Fetch Jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('id, source, title, company, location, city, state, salary, description, country, classification, sub_classification, work_arrangement, employment_type, apply_url'); // MODIFIED: Added 'id' to select if not already there

        if (jobsError) throw jobsError;
        if (jobsData) setJobs(jobsData as Job[]);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; 
  };

  
  const filteredJobs = jobs.filter((job) => {
    const query = searchQuery.toLowerCase();
    return (
      job.title?.toLowerCase().includes(query) ||
      job.company?.toLowerCase().includes(query) ||
      job.location?.toLowerCase().includes(query) ||
      job.city?.toLowerCase().includes(query) ||
      job.classification?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const indexOfLastItem = currentPage * item_per_page;
  const indexOfFirstItem = indexOfLastItem - item_per_page;
  const currentJobs = filteredJobs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredJobs.length / item_per_page);

  const handleAtsCheck = (job: Job) => {
    const params = new URLSearchParams();
    params.set('jd', job.description);
    router.push(`/atschecker?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
          Job Searches for {userProfile.full_name}
        </h1>
        <p className="text-gray-500 text-sm">
          Review and track your automated job search results.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
          placeholder="Search by title, company, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Data Table Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {jobs.length === 0
              ? "No jobs found. Start a search to populate data."
              : "No jobs match your search criteria."}
          </div>
        ) : (
          <React.Fragment>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="px-4 py-4 w-12 text-center">#</th>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Arrangement / Type</th>
                    <th className="px-6 py-4">Salary</th>
                    <th className="px-6 py-4">Classification</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                  {currentJobs.map((job, index) => {
                    const globalIndex = indexOfFirstItem + index + 1;
                    return (
                      <tr 
                        key={index} 
                        // MODIFIED: Added onClick to open modal and cursor-pointer
                        onClick={() => setSelectedJob(job)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-4 text-center font-mono text-xs text-gray-400">
                          {globalIndex}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="font-semibold text-gray-900 line-clamp-1">{job.title}</div>
                          <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{job.description}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{job.company}</td>
                        <td className="px-6 py-4">
                          <div>{job.location || `${job.city}, ${job.state}`}</div>
                          <div className="text-xs text-gray-400">{job.country}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 mr-1">
                            {job.work_arrangement}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {job.employment_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{job.salary || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">{job.classification}</div>
                          <div className="text-xs text-gray-400">{job.sub_classification}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 capitalize">{job.source}</td>
                        
                        {/* MODIFIED: Added e.stopPropagation() so clicking Apply doesn't open the modal */}
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleAtsCheck(job)} className='inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition'>
                            ATS Check
                          </button>

                          {job.apply_url ? (
                            <a
                              href={job.apply_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
                            >
                              Apply
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">No URL</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination block remains unchanged */}
            <div className="bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 gap-4">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{filteredJobs.length === 0 ? 0 : indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastItem, filteredJobs.length)}</span> of{' '}
                <span className="font-medium">{filteredJobs.length}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition"
                >
                  Next
                </button>
              </div>
            </div>
          </React.Fragment>
        )}
      </div>

      {/* NEW: Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedJob.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedJob.company} • {selectedJob.location || selectedJob.city}</p>
              </div>
              <button 
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body (Scrollable Job Description) */}
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Job Description</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {selectedJob.description || "No description provided."}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default JobSearchPage;