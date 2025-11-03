import React, { useState } from "react";

export default function JobSelector({ onSelect }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to load jobs. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (job) => {
    setSelectedJob(job);
    onSelect(job);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-950 dark:to-black text-gray-800 dark:text-gray-100 transition-colors duration-500 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center font-sans animate-fadeIn">

        {/* Header */}
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent mb-3">
          AI Interview Assistant 🤖
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          🍏 <span className="font-semibold">Job Matching</span> — Select a job before uploading your resume
        </p>

        {/* Load Button */}
        <button
          onClick={loadJobs}
          disabled={loading}
          className={`rounded-lg px-6 py-3 text-white font-semibold shadow transition-all duration-200 active:scale-95 ${
            loading
              ? "bg-gradient-to-r from-blue-400 to-indigo-400 opacity-80 cursor-not-allowed animate-pulse"
              : "bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              Loading…
            </span>
          ) : (
            "Load Jobs"
          )}
        </button>

        {/* Shimmer while loading */}
        {loading && (
          <div className="mt-10 space-y-4 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-gray-200 dark:bg-gray-700 w-full mx-auto"
              ></div>
            ))}
          </div>
        )}

        {/* Job List */}
        {!loading && (
          <div
            className={`mt-10 grid gap-4 transition-all duration-700 ${
              selectedJob ? "opacity-50 blur-sm pointer-events-none" : "opacity-100"
            }`}
          >
            {jobs.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400">
                No jobs loaded yet. Click “Load Jobs” to get started.
              </p>
            )}

            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => handleSelect(job)}
                className={`animate-fadeIn cursor-pointer rounded-xl border p-5 text-left shadow-sm transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg
                  ${
                    selectedJob?.id === job.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  }`}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {job.title || "Untitled Job"}{" "}
                  <span className="font-normal text-gray-500 dark:text-gray-400">
                    — {job.company || "Unknown Company"}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {job.location || "Remote"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Selected Job Summary Modal */}
        {selectedJob && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md text-left animate-fadeIn">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                {selectedJob.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {selectedJob.company} — {selectedJob.location}
              </p>
              {selectedJob.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3">
                  {selectedJob.description}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onSelect(selectedJob)}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
                >
                  Proceed →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
