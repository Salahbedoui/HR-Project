from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.interviewer_service import (
    analyze_resume,
    generate_next_question,
    summarize_interview,
    create_session,
    save_message
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
    resume_text: str
    score: int
    last_answer: str | None = None


class SummaryIn(BaseModel):
    resume_text: str
    score: int
    conversation: list[dict]  # [{question, answer}]


# ------------------------------------------------
# 🧠 1️⃣ Analyze Resume → Create Interview Session
# ------------------------------------------------
@router.post("/analyze")
async def analyze_resume_route(data: ResumeText):
    """
    Analyze a resume → assign a score + intro → create new interview session.
    """
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
    """
    Generate the next interview question dynamically.
    - Saves the candidate's last answer (if provided)
    - Generates and stores the next interviewer question
    """
    try:
        print(f"🎯 Generating next question | Session: {data.session_id} | Score: {data.score}")

        # Save candidate answer if present
        if data.last_answer:
            save_message(data.session_id, "candidate", data.last_answer)

        # Generate next interviewer question
        result = generate_next_question(
            session_id=data.session_id,
            resume_text=data.resume_text,
            score=data.score,
            last_answer=data.last_answer
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        print("✅ Next question generated:", result["question"])
        return result

    except Exception as e:
        print("❌ Error in next_question_route:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------
# 🧩 3️⃣ (Optional) Static Question Generation (Legacy)
# ------------------------------------------------
@router.post("/generate")
async def generate_questions_route(data: ResumeText):
    """
    Legacy route for testing — generates static questions from resume only.
    """
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
    """
    Generate a final summary of the interview — includes strengths & weaknesses.
    """
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
