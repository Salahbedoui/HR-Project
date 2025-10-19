from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.interviewer_service import generate_interview_questions

# ❌ WRONG: prefix="/api/interview"
# ✅ FIXED:
router = APIRouter(prefix="/interview", tags=["Interview"])

class ResumeText(BaseModel):
    resume_text: str

@router.post("/generate")
async def generate_questions(data: ResumeText):
    try:
        result = generate_interview_questions(data.resume_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
