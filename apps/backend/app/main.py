from dotenv import load_dotenv
import os

# ✅ Load environment variables first (before importing routes)
load_dotenv()
print("🔑 GEMINI_API_KEY loaded:", os.getenv("GEMINI_API_KEY"))  # Debug line

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.database import SessionLocal
from app.routes import resume_routes, interview_routes

app = FastAPI(title="AI Interviewer API")

# ✅ Enable CORS (for frontend access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict later to ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "AI Interviewer backend is running 🚀"}

@app.get("/test_db")
def test_db():
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT 1"))
        return {"db_status": "connected ✅"}
    except Exception as e:
        return {"db_status": "error ❌", "detail": str(e)}
    finally:
        db.close()

# ✅ Include routes after loading env vars
app.include_router(resume_routes.router, prefix="/api")
app.include_router(interview_routes.router, prefix="/api")
