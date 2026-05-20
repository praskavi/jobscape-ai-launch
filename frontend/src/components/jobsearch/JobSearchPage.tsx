import React, { useEffect, useState } from 'react';
import { supabase } from '@/controllers/suabaseClient'; // Adjust path based on your setup
import { Sidebar } from '../dashboard/Sidebar';

// Define the Job structure based on your Supabase columns
interface Job {
  id: string; // Assuming there's a primary key id
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>('Nikhilesh'); // Fallback or fetch dynamically

  const [currentPage, setCurrentPage] = useState<number>(1);
  const item_per_page = 100;

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        // Fetching the columns you specified
        const { data, error } = await supabase
          .from('jobs') // Replace with your actual table name if different
          .select('source, title, company, location, city, state, salary, description, country, classification, sub_classification, work_arrangement, employment_type, apply_url');

        if (error) throw error;
        if (data) setJobs(data as Job[]);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const indexOfLastItem = currentPage * item_per_page;
  const indexOfFirstItem = indexOfLastItem - item_per_page;
  const currentJobs = jobs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(jobs.length/item_per_page);

  return (
    <div className="flex min-h-screen bg-[#F9F9FB]">
      
      {/* sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white hidden md:block">
        <Sidebar />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-x-hidden">
        {/* Top Navbar Header */}
        <div className="flex justify-end items-center mb-8 space-x-4">
          <span className="text-sm text-gray-600">nikhileshatal@gmail.com</span>
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            NA
          </div>
          <button className="flex items-center space-x-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 transition">
            <span>Logout</span>
          </button>
        </div>

        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Job Searches for {userName}
          </h1>
          <p className="text-gray-500 text-sm">
            Review and track your automated job search results.
          </p>
        </div>

        {/* Data Table Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No jobs found. Start a search to populate data.</div>
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
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
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
                          <td className="px-6 py-4 whitespace-nowrap">
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
              <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing <span className="font-medium">{jobs.length === 0 ? 0 : indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(indexOfLastItem, jobs.length)}</span> of{' '}
                  <span className="font-medium">{jobs.length}</span> results
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
      </main>
    </div>
  );
};

export default JobSearchPage;