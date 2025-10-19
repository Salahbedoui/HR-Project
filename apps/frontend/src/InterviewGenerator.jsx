import React, { useState } from "react";

function InterviewGenerator() {
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError("");
  };

  const handleUpload = async () => {
    if (!file) return setError("Please select a PDF or DOCX file first!");
    setLoading(true);
    setError("");
    setQuestions([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Upload failed");

      setResumeText(data.text_content);
    } catch (err) {
      console.error("❌ Upload error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!resumeText) return setError("Please upload a resume first!");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/interview/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || data.error || "Generation failed");

      setQuestions(data.questions || []);
    } catch (err) {
      console.error("❌ Generation error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "80px auto",
        textAlign: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>AI Interview Question Generator 🤖</h1>

      <input type="file" accept=".pdf,.docx" onChange={handleFileChange} />
      <button
        onClick={handleUpload}
        disabled={loading}
        style={{
          marginLeft: 10,
          padding: "8px 16px",
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        {loading ? "Uploading..." : "Upload Resume"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 20 }}>❌ Error: {error}</p>
      )}

      {resumeText && (
        <div style={{ marginTop: 30, textAlign: "left" }}>
          <h3>✅ Resume Uploaded Successfully</h3>
          <h4>Extracted Text:</h4>
          <pre
            style={{
              backgroundColor: "#f4f4f4",
              padding: 10,
              borderRadius: 5,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {resumeText.slice(0, 400)}...
          </pre>

          <button
            onClick={handleGenerateQuestions}
            disabled={loading}
            style={{
              marginTop: 20,
              padding: "8px 16px",
              backgroundColor: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate Questions"}
          </button>
        </div>
      )}

      {questions.length > 0 && (
        <div style={{ marginTop: 30, textAlign: "left" }}>
          <h3>🎯 Generated Interview Questions:</h3>
          <ol>
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default InterviewGenerator;
