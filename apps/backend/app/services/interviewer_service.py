import os, time, re, json
import google.generativeai as genai
from app.core.config import settings
from app.models.interview import InterviewSession, InterviewMessage
from app.core.database import SessionLocal

# ===== GEMINI CONFIGURATION =====
print("🔑 GEMINI_API_KEY loaded:", settings.GEMINI_API_KEY[:10] + "...")
print("🧠 GEMINI_MODEL:", settings.GEMINI_MODEL)
genai.configure(api_key=settings.GEMINI_API_KEY)

# ===== HELPER: RETRY WRAPPER =====
def _gen_with_retry(model, prompt, retries=3, delay=2):
    """Retry wrapper for Gemini API calls"""
    last_error = None
    for attempt in range(retries):
        try:
            print(f"🧠 Attempt {attempt+1}: Sending prompt to Gemini...")
            response = model.generate_content(prompt)
            print("✅ Gemini responded successfully.")
            return response
        except Exception as e:
            print(f"⚠️ Gemini error on attempt {attempt+1}: {e}")
            last_error = e
            time.sleep(delay)
    raise last_error

# ===== DATABASE HELPERS =====
def create_session(candidate_name, resume_text, score, intro):
    """Create a new interview session in DB"""
    db = SessionLocal()
    try:
        session = InterviewSession(
            candidate_name=candidate_name,
            resume_text=resume_text,
            score=score,
            intro=intro
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        print(f"✅ Interview session created (ID: {session.id})")
        return session
    finally:
        db.close()

def save_message(session_id, role, content):
    """Save interviewer/candidate messages"""
    db = SessionLocal()
    try:
        msg = InterviewMessage(session_id=session_id, role=role, content=content)
        db.add(msg)
        db.commit()
        db.refresh(msg)
        print(f"💬 Saved message ({role}) for session {session_id}")
        return msg
    finally:
        db.close()

# ===== 1️⃣ ANALYZE RESUME: AI-BASED SCORING =====
def analyze_resume(resume_text: str):
    """Use AI to realistically evaluate the resume and generate a professional intro."""
    print(f"📊 Analyzing resume (length: {len(resume_text)} chars)")

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = f"""
        You are an experienced HR recruiter and AI career evaluator.
        Analyze the following candidate resume carefully and evaluate their professional profile.

        Your tasks:
        1️⃣ Rate the candidate from 0 to 100, based on these weighted factors:
            • Technical & professional skills (40%)
            • Work experience and achievements (30%)
            • Education & certifications (15%)
            • Communication clarity and resume structure (10%)
            • Relevance of career goals to the job market (5%)

        2️⃣ Then write a short 2–3 sentence introduction describing the candidate's profile, strengths, and overall impression.

        🎯 Output strictly in this JSON format:
        {{
          "score": <number between 0 and 100>,
          "intro": "<short professional introduction>"
        }}

        Resume:
        {resume_text}
        """

        response = _gen_with_retry(model, prompt)
        text = response.text.strip()
        print("🧩 Gemini scoring raw output:", text)

        # Try to extract JSON response
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            score = int(parsed.get("score", 75))
            intro = parsed.get("intro", "").strip()
        else:
            score_match = re.search(r'"?score"?\s*[:\-]?\s*(\d{1,3})', text, re.IGNORECASE)
            intro_match = re.search(r'"?intro"?\s*[:\-]?\s*(.*)', text, re.IGNORECASE | re.DOTALL)
            score = int(score_match.group(1)) if score_match else 75
            intro = intro_match.group(1).strip() if intro_match else "No summary generated."

        score = max(0, min(score, 100))  # Clamp safely

        print(f"✅ Final extracted score: {score}")
        print(f"✅ Final intro: {intro}")

        return {"score": score, "intro": intro}

    except Exception as e:
        print(f"❌ Error analyzing resume: {e}")
        return {"error": str(e)}

# ===== 2️⃣ GENERATE FIRST OR NEXT QUESTION =====
def generate_next_question(session_id: int, resume_text: str, score: int, last_answer: str = None):
    """Generate the next interview question, enforcing a 5-question limit."""
    db = SessionLocal()
    try:
        session = db.query(InterviewSession).get(session_id)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        previous_qs = [m.content for m in session.messages if m.role == "interviewer"]
        question_count = len(previous_qs)
        print(f"🧾 Current question count: {question_count}")

        # ✅ Stop at 5 questions
        if question_count >= 5:
            print("✅ Interview limit reached (5 questions).")
            closing_message = (
                "🤖 Thank you for completing the interview! "
                "Please hold on while I generate your performance summary..."
            )
            save_message(session_id, "system", closing_message)
            return {
                "completed": True,
                "question": None,
                "message": closing_message
            }

        # Build the dynamic question prompt
        if not last_answer:
            prompt = f"""
            You are an experienced interviewer conducting a first-round interview.
            Based on this resume (score: {score}/100),
            ask the first question to begin the interview.

            Rules:
            - Only ONE question
            - Friendly and conversational
            - Focus on motivation, career goals, or achievements
            - Max 25 words

            Resume:
            {resume_text[:1500]}
            """
        else:
            prev_text = "\n".join([f"- {q}" for q in previous_qs[-3:]])
            prompt = f"""
            Continue the interview (score: {score}/100).

            Resume excerpt:
            {resume_text[:1500]}

            Previous questions:
            {prev_text}

            Candidate's last answer:
            {last_answer}

            TASK:
            - Ask one natural follow-up question
            - Avoid repetition
            - Stay under 25 words
            """

        response = _gen_with_retry(model, prompt)
        question = response.text.strip().split("\n")[0].lstrip("1234567890. -").strip()

        if not question or question in previous_qs:
            print("⚠️ Duplicate or empty question detected. Regenerating...")
            return generate_next_question(session_id, resume_text, score, last_answer)

        save_message(session_id, "interviewer", question)
        print(f"🧩 New question: {question}")

        return {"completed": False, "question": question}

    except Exception as e:
        print(f"❌ Error generating next question: {e}")
        return {"error": str(e)}
    finally:
        db.close()

# ===== 3️⃣ SUMMARIZE INTERVIEW =====
def summarize_interview(resume_text: str, score: int, conversation: list[dict]):
    """Generate a final HR-style summary of the interview."""
    print(f"🧾 Summarizing interview ({len(conversation)} Q&A pairs)...")

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        convo_text = "\n".join([f"Q: {c.get('question')}\nA: {c.get('answer')}" for c in conversation])

        prompt = f"""
        You are an expert HR interviewer assistant.

        Summarize the candidate's interview performance based on:
        - Resume
        - Score: {score}/100
        - Conversation transcript

        Respond with:
        **Overall Impression:** 3–4 sentences
        **Key Strengths:** (•)
        **Areas for Improvement:** (•)

        Resume excerpt:
        {resume_text[:2000]}

        Interview Conversation:
        {convo_text}
        """

        response = _gen_with_retry(model, prompt)
        summary_text = response.text.strip()
        print("🧾 Gemini summary generated successfully.")
        return {"summary": summary_text}

    except Exception as e:
        print(f"❌ Error summarizing interview: {e}")
        return {"error": str(e)}

# ===== 4️⃣ REAL-TIME ANSWER SCORING (Simple) =====
def evaluate_answer(session_id: str, question: str, answer: str, total_score: float = 0):
    """Analyze the candidate's answer and give feedback and a sub-score."""
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        prompt = f"""
        You are an interview evaluator. Assess the candidate's answer based on:
        1. Clarity
        2. Coherence
        3. Confidence
        4. Technical Depth

        Question: {question}
        Answer: {answer}

        Provide your analysis in this format:
        Score (0-20): <number>
        Feedback: <short constructive comment (1 sentence)>
        """

        response = _gen_with_retry(model, prompt)
        content = response.text.strip()

        score_match = re.search(r"Score\s*\(0-20\)\s*:\s*(\d+)", content)
        feedback_match = re.search(r"Feedback\s*:\s*(.*)", content)

        sub_score = int(score_match.group(1)) if score_match else 10
        feedback = feedback_match.group(1).strip() if feedback_match else "Good response."

        total_score += sub_score

        print(f"✅ Evaluated Answer | Sub-score: {sub_score} | Feedback: {feedback}")

        # Save evaluation as system message
        save_message(session_id, "system", f"Feedback: {feedback} (Score: {sub_score}/20)")

        return {
            "sub_score": sub_score,
            "feedback": feedback,
            "total_score": total_score
        }

    except Exception as e:
        print(f"❌ Error evaluating answer: {e}")
        return {
            "sub_score": 0,
            "feedback": "Evaluation failed due to an internal error.",
            "total_score": total_score
        }

# ===== 5️⃣ DETAILED ANSWER SCORING (Per-dimension for charts) =====
def evaluate_detailed_answer(session_id: int, question: str, answer: str):
    """
    Returns per-dimension scoring for a single answer:
    { clarity, coherence, confidence, technical_depth, engagement, average_score, feedback }
    All sub-scores expected 0–20.
    """
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = f"""
        You are an expert interview assessor. Score the candidate's answer across 5 dimensions (0–20 each):

        - clarity: how clearly the answer communicates ideas
        - coherence: logical flow and structure
        - confidence: assertiveness, ownership (without arrogance)
        - technical_depth: quality of technical/subject matter coverage
        - engagement: concision, relevance, storytelling/examples

        Question: {question}
        Answer: {answer}

        Return STRICT JSON ONLY (no prose), shape:
        {{
          "clarity": <0-20>,
          "coherence": <0-20>,
          "confidence": <0-20>,
          "technical_depth": <0-20>,
          "engagement": <0-20>,
          "feedback": "<1 short sentence of constructive feedback>"
        }}
        """

        response = _gen_with_retry(model, prompt)
        raw = (response.text or "").strip()
        print("🧪 Detailed eval raw:", raw)

        # Extract JSON robustly
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if not m:
            raise ValueError("No JSON found in model output")

        data = json.loads(m.group(0))

        # Coerce and clamp
        def clamp_int(v):
            try:
                return max(0, min(int(v), 20))
            except Exception:
                return 10

        clarity = clamp_int(data.get("clarity", 10))
        coherence = clamp_int(data.get("coherence", 10))
        confidence = clamp_int(data.get("confidence", 10))
        technical_depth = clamp_int(data.get("technical_depth", 10))
        engagement = clamp_int(data.get("engagement", 10))
        feedback = (data.get("feedback") or "").strip() or "Good answer — consider adding a concrete example."

        avg = round((clarity + coherence + confidence + technical_depth + engagement) / 5, 2)

        # Save a compact record into messages (optional, useful for audits)
        save_message(
            session_id,
            "system",
            f"[DetailedEval] C:{clarity} Co:{coherence} Conf:{confidence} Tech:{technical_depth} Eng:{engagement} | Avg:{avg} | {feedback}"
        )

        return {
            "clarity": clarity,
            "coherence": coherence,
            "confidence": confidence,
            "technical_depth": technical_depth,
            "engagement": engagement,
            "average_score": avg,
            "feedback": feedback
        }

    except Exception as e:
        print(f"❌ Error in evaluate_detailed_answer: {e}")
        # Reasonable fallback
        return {
            "clarity": 10,
            "coherence": 10,
            "confidence": 10,
            "technical_depth": 10,
            "engagement": 10,
            "average_score": 10.0,
            "feedback": "Evaluation failed; returning neutral scores."
        }
