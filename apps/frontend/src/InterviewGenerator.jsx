import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function InterviewGenerator() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [jobList, setJobList] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDropdownOpen, setJobDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleFileChange = (e) => setFile(e.target.files[0]);

  // ✅ Load jobs on mount
  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/jobs/remoteok");
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to load jobs");
        setJobList(data.jobs || []);
      } catch (err) {
        setError("Failed to load jobs: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const handleJobSelection = (job) => {
    setSelectedJob(job);
    setJobDropdownOpen(false);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first!");
    const formData = new FormData();
    formData.append("file", file);

    try {
      setAnalyzing(true);
      const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");

      const analyzeRes = await fetch("/api/interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: data.text_content }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.detail);

      setResumeData(analyzeData);
      navigate("/interview", {
        state: { resumeData: analyzeData, resumeText: data.text_content },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // ✅ Filter jobs by search term
  const filteredJobs = jobList.filter((job) => {
    const search = searchTerm.toLowerCase();
    return (
      job.title?.toLowerCase().includes(search) ||
      job.company?.toLowerCase().includes(search) ||
      job.location?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-800 px-6 py-10 font-sans transition-all duration-500">
      {/* Header */}
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
          AI Interview Assistant 🤖
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          🍏 <span className="font-semibold">Job Matching</span> — Select a job before uploading your resume
        </p>

        {/* Job Selection */}
        <div className="relative inline-block text-left mb-10 w-80">
          <button
            onClick={() => setJobDropdownOpen((prev) => !prev)}
            disabled={isLoading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-3 text-white font-semibold shadow hover:from-blue-700 hover:to-indigo-600 transition disabled:opacity-50"
          >
            {isLoading ? "Loading Jobs…" : selectedJob ? selectedJob.title : "Select a Job"}
          </button>

          {jobDropdownOpen && (
            <div className="absolute mt-3 w-full max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-10 animate-fadeIn">
              {/* Search Input */}
              <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                <input
                  type="text"
                  placeholder="Search jobs..."
                  className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Job List */}
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => handleJobSelection(job)}
                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition ${
                      selectedJob?.id === job.id ? "bg-blue-100" : ""
                    }`}
                  >
                    <p className="font-semibold text-gray-800">{job.title}</p>
                    <p className="text-sm text-gray-500">
                      {job.company} — {job.location || "Remote"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-3 text-gray-500 text-sm text-center">No jobs found.</div>
              )}
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-8 shadow-lg max-w-xl mx-auto transition-transform hover:shadow-2xl">
          <h3 className="text-2xl font-semibold mb-4 text-gray-900 text-center">
            Upload Your Resume
          </h3>

          <label className="block mb-4 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition">
            <input type="file" accept=".pdf,.docx" onChange={handleFileChange} className="hidden" />
            <span className="text-gray-600">
              {file ? `📄 ${file.name}` : "Click to choose or drag & drop your file here"}
            </span>
          </label>

          <button
            onClick={handleUpload}
            disabled={analyzing}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-3 font-semibold hover:from-indigo-600 hover:to-blue-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {analyzing ? (
              <div className="flex justify-center items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l3 3-3 3v-4a8 8 0 01-8-8z"
                  ></path>
                </svg>
                <span>Analyzing Resume…</span>
              </div>
            ) : (
              "Analyze Resume"
            )}
          </button>

          {error && <p className="mt-3 text-sm text-red-500 text-center">❌ {error}</p>}
        </div>
      </div>
    </div>
  );
}
