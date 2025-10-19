import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.resume import Resume
from app.schemas.resume_schema import ResumeOut
from pypdf import PdfReader
import docx
from app.services.embeddings_service import add_resume_to_vector_db

# ✅ Use singular prefix so it matches /api/resume/upload
router = APIRouter(prefix="/resume", tags=["Resume"])

# ----------- Utility functions --------------

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    pdf_reader = PdfReader(file_path)
    for page in pdf_reader.pages:
        text += page.extract_text() or ""
    return text

def extract_text_from_docx(file_path: str) -> str:
    doc = docx.Document(file_path)
    return "\n".join([p.text for p in doc.paragraphs])

# ----------- Upload endpoint ----------------

@router.post("/upload", response_model=ResumeOut)
async def upload_resume(file: UploadFile = File(...)):
    db: Session = SessionLocal()
    tmp_path = None  # ensure variable exists even if an error happens
    try:
        suffix = os.path.splitext(file.filename)[-1].lower()
        if suffix not in [".pdf", ".docx"]:
            raise HTTPException(status_code=400, detail="Only PDF or DOCX files allowed")

        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Extract text based on file type
        if suffix == ".pdf":
            text_content = extract_text_from_pdf(tmp_path)
        else:
            text_content = extract_text_from_docx(tmp_path)

        # Save resume in DB
        resume = Resume(filename=file.filename, text_content=text_content)
        db.add(resume)
        db.commit()
        db.refresh(resume)

        # Add to vector DB (Chroma)
        add_resume_to_vector_db(resume.id, text_content)

        return resume

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {e}")

    finally:
        db.close()
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
