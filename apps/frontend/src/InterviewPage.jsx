import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { startSpeechRecognition, speakText } from "./SpeechHandler";

const TypingEffect = ({ text, speed = 20 }) => {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!text) return setOut("");
    let i = 0;
    const id = setInterval(() => {
      setOut(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span>{out}</span>;
};

export default function InterviewPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const resumeData = state?.resumeData || {};
  const sessionId = resumeData.session_id;
  const score = resumeData.score ?? 0;
  const intro = resumeData.intro ?? "";
  const resumeText =
    state?.resumeText ||
    resumeData.resume_text ||
    state?.resume_full_text ||
    "";

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [autoClosing, setAutoClosing] = useState(false);
  const [summary, setSummary] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [stage, setStage] = useState("intro");
  const [micActive, setMicActive] = useState(false);
  const maxQuestions = 5;
  const timerRef = useRef(null);

  const progressPct = useMemo(
    () => Math.min(100, Math.round((conversation.length / maxQuestions) * 100)),
    [conversation.length]
  );

  const ensureCanStart = useMemo(() => {
    if (!sessionId) return "Missing session_id (go back and analyze resume again).";
    if (!resumeText) return "Missing resume text (navigation should pass it).";
    return null;
  }, [sessionId, resumeText]);

  useEffect(() => {
    if (stage !== "interview" || autoClosing) return;
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => {
      timerRef.current && clearInterval(timerRef.current);
    };
  }, [stage, question, autoClosing]);

  useEffect(() => {
    if (stage === "interview" && timeLeft === 0) {
      handleSubmitAnswer(true);
    }
  }, [timeLeft]); // eslint-disable-line

  const getNextQuestion = async (lastAnswer = null) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/interview/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          resume_text: resumeText,
          score,
          last_answer: lastAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to get next question");

      if (data.completed) {
        setAutoClosing(true);
        const closing =
          data.message ||
          "🤖 Interview completed. Generating your performance summary...";
        setQuestion(closing);
        await generateSummary();
        setTimeout(() => {
          setAutoClosing(false);
          setStage("summary");
        }, 1200);
        return;
      }

      const q = data.question || "";
      setIsTyping(true);
      setQuestion("");
      for (let i = 0; i < q.length; i++) {
        await new Promise((r) => setTimeout(r, 12));
        setQuestion((prev) => prev + q[i]);
      }
      setIsTyping(false);
      speakText(q);
      setTimeLeft(60);
    } catch (err) {
      console.error(err);
      alert("Could not fetch next question: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = async () => {
    try {
      const res = await fetch("/api/interview/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, score, conversation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to summarize interview");
      setSummary(data.summary || "Interview complete!");
    } catch (e) {
      console.error(e);
      setSummary("Interview complete!");
    }
  };

  const handleStart = async () => {
    if (ensureCanStart) {
      alert(ensureCanStart);
      return;
    }
    setStage("interview");
    await getNextQuestion(null);
  };

  const handleSubmitAnswer = async (fromTimer = false) => {
    if (!fromTimer && !answer.trim()) return;
    const commitAnswer = answer.trim();
    const newConversation = [...conversation];
    if (question) newConversation.push({ question, answer: commitAnswer });
    setConversation(newConversation);
    setAnswer("");

    if (newConversation.length >= maxQuestions) {
      setAutoClosing(true);
      setQuestion("🤖 Interview completed. Generating your performance summary...");
      await generateSummary();
      setTimeout(() => {
        setAutoClosing(false);
        setStage("summary");
      }, 1200);
      return;
    }
    await getNextQuestion(commitAnswer);
  };

  const handleMic = () => {
    try {
      setMicActive(true);
      startSpeechRecognition(
        (transcript) => {
          if (!transcript) return;
          setAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
        },
        () => setMicActive(false)
      );
    } catch (e) {
      console.error(e);
      setMicActive(false);
      alert("Microphone not available in this browser.");
    }
  };

  // 🌈 Modern Intro UI
  if (stage === "intro") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-950 dark:to-black text-gray-800 dark:text-gray-100 font-sans relative">
        <div className="absolute top-6 left-6 flex justify-between w-[calc(100%-3rem)]">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
          >
            ← Back to Job Selection
          </button>
          <div className="text-right text-sm text-gray-500 dark:text-gray-400">
            <div>
              Session ID: <span className="font-medium">{sessionId ?? "—"}</span>
            </div>
            <div>
              Score: <span className="font-semibold text-blue-600">{score}</span>
            </div>
          </div>
        </div>

        <div className="max-w-2xl w-full text-center animate-fadeIn">
          <h1 className="text-4xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
            🎤 Interview in Progress
          </h1>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 text-left transition-all duration-300 hover:shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">
              Intro
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {intro || "This is where the candidate introduction or summary will appear."}
            </p>
          </div>

          <button
            onClick={handleStart}
            disabled={!!ensureCanStart || isLoading}
            className="mt-10 inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? "Starting…" : "Start Interview"}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          {ensureCanStart && (
            <p className="mt-3 text-sm text-red-600">{ensureCanStart}</p>
          )}
        </div>
      </div>
    );
  }

  // 🎯 Interview and Summary UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-950 dark:to-black text-gray-800 dark:text-gray-100 transition-colors duration-500">
      <div className="mx-auto max-w-3xl px-6 py-10 font-sans">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition"
          >
            ← Back to Job Selection
          </button>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Session ID: <span className="font-medium">{sessionId ?? "—"}</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Score: <span className="font-medium">{score}</span>
            </div>
          </div>
        </div>

        <h1 className="mb-4 text-3xl font-bold">🎤 Interview in Progress</h1>

        {stage === "interview" && (
          <>
            <div className="mb-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div>Question {conversation.length + 1} / {maxQuestions}</div>
              <div className="flex items-center gap-2">
                <span className="inline-block rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
                  ⏳ {timeLeft}s
                </span>
                <span>•</span>
                <span>Progress: {progressPct}%</span>
              </div>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full transition-[width] duration-300"
                style={{
                  width: `${progressPct}%`,
                  background:
                    progressPct >= 80
                      ? "#22c55e"
                      : progressPct >= 50
                      ? "#f59e0b"
                      : "#3b82f6",
                }}
              />
            </div>

            <div className="mt-6 rounded-lg border border-indigo-100 bg-indigo-50 dark:bg-indigo-900/20 p-4 shadow-sm">
              <div className="mb-1 text-sm font-medium text-indigo-900 dark:text-indigo-300">
                Question
              </div>
              <div className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
                {isTyping ? <TypingEffect text={question} /> : question}
              </div>
            </div>

            {!autoClosing && (
              <div className="mt-4">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                  placeholder="Speak or type your answer…"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-3 outline-none focus:border-blue-400"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      await handleSubmitAnswer(false);
                    }
                  }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleMic}
                    className={`rounded-md px-4 py-2 font-medium text-white transition-all duration-200 ${
                      micActive
                        ? "bg-green-600 shadow-md animate-pulse"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {micActive ? "🎙️ Listening…" : "🎙️ Use Mic"}
                  </button>
                  <button
                    onClick={() => handleSubmitAnswer(false)}
                    disabled={isLoading}
                    className="rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? "Submitting…" : "Submit Answer"}
                  </button>
                  <button
                    onClick={() => setAnswer("")}
                    className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Clear
                  </button>
                </div>
                {(isTyping || isLoading) && (
                  <p className="mt-2 text-sm italic text-gray-500 dark:text-gray-400">
                    🤖 AI is thinking…
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {stage === "summary" && (
          <div className="mt-10">
            <h2 className="mb-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
              ✅ Interview Completed
            </h2>
            <div className="my-4 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${score}%`,
                  background:
                    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
            <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Final Score: <span className="font-semibold">{score}/100</span>
            </div>

            <div className="mb-4 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 p-4">
              <h4 className="mb-1 font-semibold text-sky-900 dark:text-sky-300">
                📄 Candidate Overview
              </h4>
              <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
                {intro}
              </ReactMarkdown>
            </div>

            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
              <h4 className="mb-1 font-semibold text-emerald-900 dark:text-emerald-300">
                🧠 AI Summary
              </h4>
              <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
                {summary || "Interview complete!"}
              </ReactMarkdown>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => navigate("/")}
                className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                ← Back to Jobs
              </button>
              <button
                onClick={() => {
                  setConversation([]);
                  setQuestion("");
                  setAnswer("");
                  setSummary("");
                  setTimeLeft(60);
                  setStage("intro");
                }}
                className="rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
              >
                🔄 Restart Interview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
