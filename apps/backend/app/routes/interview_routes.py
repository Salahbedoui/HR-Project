from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.interviewer_service import (
    analyze_resume,
    generate_next_question,
    summarize_interview,
    create_session,
    save_message,
    evaluate_answer,          # existing simple scoring
    evaluate_detailed_answer  # 🆕 detailed per-dimension scoring
)

# ✅ Prefix: /api/interview (since main.py already prefixes /api)
router = APIRouter(prefix="/interview", tags=["Interview"])


# ------------------------------------------------
# 📄 Pydantic Models
# ------------------------------------------------
class ResumeText(BaseModel):
    resume_text: str
    candidate_name: str | None = "Candidate"


class FollowUp(BaseModel):
    session_id: int
    score: int
    resume_text: str | None = None
    last_answer: str | None = None


class SummaryIn(BaseModel):
    resume_text: str
    score: int
    conversation: list[dict]  # [{question, answer}]


# 🧠 Simple evaluation model
class AnswerEvaluationIn(BaseModel):
    session_id: int
    question: str
    answer: str
    total_score: float = 0


# 🧠 Detailed evaluation model
class DetailedAnswerIn(BaseModel):
    session_id: int
    question: str
    answer: str


# ------------------------------------------------
# 🧠 1️⃣ Analyze Resume → Create Interview Session
# ------------------------------------------------
@router.post("/analyze")
async def analyze_resume_route(data: ResumeText):
    try:
        print(f"🔍 Analyzing resume for {data.candidate_name} ...")
        result = analyze_resume(data.resume_text)

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        # Create interview session in DB
        session = create_session(
            candidate_name=data.candidate_name,
            resume_text=data.resume_text,
            score=result["score"],
            intro=result["intro"]
        )

        print(f"✅ Session created: {session.id}")
        return {
            "session_id": session.id,
            "score": result["score"],
            "intro": result["intro"]
        }

    except Exception as e:
        print("❌ Error in analyze_resume_route:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------
# 🗣️ 2️⃣ Generate Next Question
# ------------------------------------------------
@router.post("/next")
async def next_question_route(data: FollowUp):
    try:
        print(f"🎯 Generating next question | Session: {data.session_id} | Score: {data.score}")

        # Save candidate answer if present
        if data.last_answer:
            save_message(data.session_id, "candidate", data.last_answer)

        # Generate next interviewer question
        result = generate_next_question(
    session_id=data.session_id,
    resume_text=data.resume_text or "",
    score=data.score,
    last_answer=data.last_answer
)

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        print("✅ Next question generated:", result.get("question"))
        return result

    except Exception as e:
        print("❌ Error in next_question_route:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------
# 🧩 3️⃣ (Optional) Static Question Generation (Legacy)
# ------------------------------------------------
@router.post("/generate")
async def generate_questions_route(data: ResumeText):
    from app.services.interviewer_service import generate_interview_questions
    try:
        print("🧠 Generating static interview questions...")
        result = generate_interview_questions(data.resume_text)
        print("✅ Static questions generated.")
        return result
    except Exception as e:
        print("❌ Error in generate_questions:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------
# 🧾 4️⃣ Generate Interview Summary
# ------------------------------------------------
@router.post("/summary")
async def interview_summary_route(data: SummaryIn):
    try:
        print(f"📋 Generating summary for score {data.score} with {len(data.conversation)} Q&A pairs...")
        result = summarize_interview(
            data.resume_text,
            data.score,
            data.conversation
        )
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        print("✅ Summary generated successfully.")
        return result
    except Exception as e:
        print("❌ Error in interview_summary:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------
# 🧠 5️⃣ Real-Time Answer Evaluation (simple)
# ------------------------------------------------
@router.post("/score_answer")
async def score_answer_route(data: AnswerEvaluationIn):
    try:
        print(f"🧠 Evaluating answer for session {data.session_id} ...")
        result = evaluate_answer(
            session_id=data.session_id,
            question=data.question,
            answer=data.answer,
            total_score=data.total_score
        )

        if "feedback" not in result:
            raise HTTPException(status_code=500, detail="No feedback generated.")

        print(f"✅ Evaluation complete — Sub-score: {result['sub_score']}/20")
        return result

    except Exception as e:
        print("❌ Error in score_answer_route:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------
# 📊 6️⃣ Detailed Per-Question Analytics (for charts)
# ------------------------------------------------
@router.post("/analyze_answer_detailed")
async def analyze_answer_detailed_route(data: DetailedAnswerIn):
    """
    Returns per-dimension scoring for one answer:
    { clarity, coherence, confidence, technical_depth, engagement, average_score, feedback }
    """
    try:
        print(f"📊 Detailed evaluation for session {data.session_id} ...")
        result = evaluate_detailed_answer(
            session_id=data.session_id,
            question=data.question,
            answer=data.answer
        )
        return result
    except Exception as e:
        print("❌ Error in analyze_answer_detailed_route:", e)
        raise HTTPException(status_code=500, detail=str(e))


class ResumeText(BaseModel):
    resume_text: str
    candidate_name: str | None = "Candidate"
    job_id: int | None = None
    job_description: str | None = None   # alternative free text

# Inside analyze_resume_route, you can pass job_description into the prompt (optional)
# E.g., prepend: f"Target Job: {loaded_job_desc}\n\nResume: {data.resume_text}"
# and store job_id on the InterviewSession if you extend that model.
