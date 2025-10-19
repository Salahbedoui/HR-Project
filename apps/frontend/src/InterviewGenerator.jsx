import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

// ✨ Typing Animation Component
const TypingEffect = ({ text, speed = 25 }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return <span>{displayed}</span>;
};

function InterviewGenerator() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [score, setScore] = useState(null);
  const [intro, setIntro] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [conversation, setConversation] = useState([]);
  const [finalSummary, setFinalSummary] = useState("");
  const [stage, setStage] = useState("upload"); // upload | intro | interview | summary
  const [isTyping, setIsTyping] = useState(false);

  const maxQuestions = 5;

  const handleFileChange = (e) => setFile(e.target.files[0]);

  // ---------------------- Step 1: Upload Resume ----------------------
  const handleUpload = async () => {
    if (!file) return alert("Please select a file first!");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsLoading(true);
      const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");

      // Analyze resume
      const analyzeRes = await fetch("/api/interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: data.text_content }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.detail);

      setScore(analyzeData.score);
      setIntro(analyzeData.intro);
      setResumeData({
        ...data,
        session_id: analyzeData.session_id,
      });
      setStage("intro");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------- Step 2: Start Interview ----------------------
  const startInterview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/interview/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: resumeData.session_id,
          resume_text: resumeData.text_content,
          score,
          last_answer: null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setQuestion(data.question);
      setStage("interview");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------- Step 3: Handle Answer (Auto Next) ----------------------
  const handleNextQuestion = async () => {
    if (!answer.trim()) return;

    const updatedConversation = [...conversation, { question, answer }];
    setConversation(updatedConversation);
    setAnswer("");
    setIsLoading(true);

    // ✅ Check if finished
    if (updatedConversation.length >= maxQuestions) {
      await generateSummary(updatedConversation);
      setStage("summary");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/interview/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: resumeData.session_id,
          resume_text: resumeData.text_content,
          score,
          last_answer: answer,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      // ✅ Handle completed interview
      if (data.completed) {
        await generateSummary(updatedConversation);
        setStage("summary");
        setIsLoading(false);
        return;
      }

      // 🧠 Simulate typing animation
      setIsTyping(true);
      let text = "";
      const chars = (data.question || "").split("");
      for (let i = 0; i < chars.length; i++) {
        text += chars[i];
        setQuestion(text);
        await new Promise((r) => setTimeout(r, 20)); // typing speed
      }
      setIsTyping(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------- Step 4: Generate Summary ----------------------
  const generateSummary = async (conversationData) => {
    try {
      const res = await fetch("/api/interview/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeData.text_content,
          score,
          conversation: conversationData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setFinalSummary(data.summary);
    } catch (err) {
      setError(err.message);
    }
  };

  // ---------------------- Step 5: UI ----------------------
  return (
    <div style={{ maxWidth: 700, margin: "80px auto", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>AI Interview Assistant 🤖</h1>

      {/* 🧱 Upload Stage */}
      {stage === "upload" && (
        <div style={{ textAlign: "center" }}>
          <input type="file" accept=".pdf,.docx" onChange={handleFileChange} />
          <button
            onClick={handleUpload}
            disabled={isLoading}
            style={{
              marginLeft: 10,
              padding: "8px 16px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {isLoading ? "Uploading..." : "Analyze Resume"}
          </button>
          {error && <p style={{ color: "red", marginTop: 10 }}>❌ {error}</p>}
        </div>
      )}

      {/* 🧠 Intro Stage */}
      {stage === "intro" && (
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <h3>✅ Resume Analysis Complete</h3>
          <p>
            <strong>Score:</strong> {score}/100
          </p>
          <div
            style={{
              background: "#f9fafb",
              borderRadius: 8,
              padding: 16,
              border: "1px solid #e5e7eb",
              textAlign: "left",
            }}
          >
            <ReactMarkdown>{intro}</ReactMarkdown>
          </div>
          <button
            onClick={startInterview}
            style={{
              marginTop: 20,
              background: "#22c55e",
              color: "white",
              border: "none",
              borderRadius: 5,
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Start Interview
          </button>
        </div>
      )}

      {/* 🗣️ Interview Stage */}
      {stage === "interview" && (
        <div style={{ marginTop: 40 }}>
          <h3>📝 Interview in Progress</h3>
          <p>
            🕐 Question {conversation.length + 1} / {maxQuestions}
          </p>

          {conversation.map((turn, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <p>
                <strong>Q{i + 1}:</strong> {turn.question}
              </p>
              <p>
                <em>Answer:</em> {turn.answer}
              </p>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <p style={{ backgroundColor: "#eef", padding: 10, borderRadius: 5 }}>
              <strong>Q{conversation.length + 1}:</strong>{" "}
              <TypingEffect text={question} />
            </p>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              placeholder="Type your answer and press Enter..."
              style={{
                width: "100%",
                marginTop: 10,
                padding: 8,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  await handleNextQuestion();
                }
              }}
              disabled={isLoading}
            />

            {(isTyping || isLoading) && (
              <p style={{ color: "#666", fontStyle: "italic", marginTop: 10 }}>
                🤖 AI is typing...
              </p>
            )}
          </div>
        </div>
      )}

      {/* 🎯 Summary Stage */}
      {stage === "summary" && (
        <div style={{ marginTop: 40 }}>
          <h3>🎯 Interview Summary</h3>

          {/* Score + Intro Dashboard Card */}
          <div
            style={{
              background: "#f0f9ff",
              border: "2px solid #bae6fd",
              borderRadius: "1rem",
              padding: "1.5rem",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "#0c4a6e", fontSize: "1.5rem", marginBottom: "0.5rem" }}>
              Final Score: {score}/100
            </h2>
            <p style={{ color: "#0369a1" }}>{intro}</p>
          </div>

          {/* Summary Section */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              padding: 15,
              borderRadius: 8,
            }}
          >
            <ReactMarkdown>{finalSummary}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewGenerator;
