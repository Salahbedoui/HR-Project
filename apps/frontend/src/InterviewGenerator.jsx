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
  const [autoClosing, setAutoClosing] = useState(false); // 🌟 new state

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

  // ---------------------- Step 3: Handle Answer (Auto Next + Auto Close) ----------------------
  const handleNextQuestion = async () => {
    if (!answer.trim()) return;

    const updatedConversation = [...conversation, { question, answer }];
    setConversation(updatedConversation);
    setAnswer("");
    setIsLoading(true);

    // ✅ When last question answered — show closing message
    if (updatedConversation.length >= maxQuestions) {
      setAutoClosing(true);
      setQuestion("🤖 Interview completed. Generating your performance summary...");
      await generateSummary(updatedConversation);

      setTimeout(() => {
        setAutoClosing(false);
        setStage("summary");
      }, 3000);
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

      if (data.completed) {
        setAutoClosing(true);
        setQuestion(data.message || "🤖 Interview completed. Generating summary...");
        await generateSummary(updatedConversation);
        setTimeout(() => {
          setAutoClosing(false);
          setStage("summary");
        }, 3000);
        setIsLoading(false);
        return;
      }

      // 🧠 Simulated typing animation
      setIsTyping(true);
      let text = "";
      const chars = (data.question || "").split("");
      for (let i = 0; i < chars.length; i++) {
        text += chars[i];
        setQuestion(text);
        await new Promise((r) => setTimeout(r, 20));
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
        <div style={{ marginTop: 40, transition: "opacity 0.8s ease" }}>
          <h3>📝 Interview in Progress</h3>
          <p>
            🕐 Question {conversation.length + 1} / {maxQuestions}
          </p>

          {/* 🔵 Live Progress Bar */}
          <div
            style={{
              width: "100%",
              background: "#e5e7eb",
              borderRadius: "9999px",
              height: "12px",
              marginTop: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(conversation.length / maxQuestions) * 100}%`,
                height: "100%",
                background:
                  conversation.length / maxQuestions >= 0.8
                    ? "#22c55e"
                    : conversation.length / maxQuestions >= 0.5
                    ? "#f59e0b"
                    : "#3b82f6",
                transition: "width 0.5s ease",
              }}
            ></div>
          </div>

          <p
            style={{
              marginTop: "8px",
              fontSize: "0.9rem",
              color: "#6b7280",
              textAlign: "right",
            }}
          >
            Progress: {Math.round((conversation.length / maxQuestions) * 100)}%
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

            {!autoClosing && (
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
            )}

            {(isTyping || isLoading) && (
              <p style={{ color: "#666", fontStyle: "italic", marginTop: 10 }}>
                🤖 AI is typing...
              </p>
            )}
          </div>
        </div>
      )}

      {/* 🎯 Summary Dashboard */}
      {stage === "summary" && (
        <div
          style={{
            marginTop: 40,
            opacity: 1,
            transition: "opacity 1s ease",
            textAlign: "center",
          }}
        >
          <h3 style={{ fontSize: "1.8rem" }}>🎯 Interview Performance Dashboard</h3>

          {/* Score Bar Visualization */}
          <div
            style={{
              margin: "20px auto",
              width: "80%",
              background: "#e5e7eb",
              borderRadius: "9999px",
              overflow: "hidden",
              height: "20px",
            }}
          >
            <div
              style={{
                width: `${score}%`,
                height: "100%",
                background:
                  score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444",
                transition: "width 1.2s ease",
              }}
            ></div>
          </div>

          <h2
            style={{
              color: score >= 80 ? "#166534" : score >= 60 ? "#78350f" : "#7f1d1d",
              marginTop: "10px",
              fontSize: "1.4rem",
            }}
          >
            Final Score: {score}/100
          </h2>

          {/* Candidate Intro Card */}
          <div
            style={{
              background: "#f0f9ff",
              border: "2px solid #bae6fd",
              borderRadius: "1rem",
              padding: "1.5rem",
              margin: "1.5rem 0",
              textAlign: "left",
            }}
          >
            <h4 style={{ color: "#0369a1" }}>📄 Candidate Overview</h4>
            <ReactMarkdown>{intro}</ReactMarkdown>
          </div>

          {/* AI Summary Card */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              padding: 15,
              borderRadius: 8,
              textAlign: "left",
            }}
          >
            <h4 style={{ color: "#166534" }}>🧠 AI Summary</h4>
            <ReactMarkdown>{finalSummary}</ReactMarkdown>
          </div>

          {/* Restart Button */}
          <button
            onClick={() => {
              setStage("upload");
              setConversation([]);
              setQuestion("");
              setAnswer("");
              setFinalSummary("");
              setFile(null);
            }}
            style={{
              marginTop: 25,
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            🔄 Restart Interview
          </button>
        </div>
      )}
    </div>
  );
}

export default InterviewGenerator;
