from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.database import SessionLocal
from app.routes import resume_routes, interview_routes, job_routes
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Interviewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],     # tighten later to ["http://localhost:5173"]
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
        db.execute(text("SELECT 1"))
        return {"db_status": "connected ✅"}
    except Exception as e:
        return {"db_status": "error ❌", "detail": str(e)}
    finally:
        db.close()

# ✅ Include all routers
app.include_router(resume_routes.router, prefix="/api")
app.include_router(interview_routes.router, prefix="/api")
app.include_router(job_routes.router, prefix="/api")  # ✅ correct name
