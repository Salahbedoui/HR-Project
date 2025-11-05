import json
import math
import requests
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from app.core.database import SessionLocal
from app.models.job import JobPosting, JobMatch
from app.models.interview import InterviewSession
from app.models.resume import Resume

# ---------- Embedding + Vector DB (separate 'jobs' collection) ----------
_chroma = chromadb.PersistentClient(path="chroma_data")
_jobs_col = _chroma.get_or_create_collection(name="jobs")
_model = SentenceTransformer("all-MiniLM-L6-v2")  # lightweight & fast

def _embed(text: str):
    return _model.encode(text).tolist()

# ---------- CRUD / Ingest ----------
def upsert_job(db: Session, job: dict) -> JobPosting:
    ext = job.get("external_id")
    src = job.get("source")
    db_obj = None
    if ext and src:
        db_obj = db.query(JobPosting).filter_by(external_id=ext, source=src).first()
    if not db_obj:
        db_obj = JobPosting(**job)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
    else:
        for k,v in job.items():
            setattr(db_obj, k, v)
        db.commit()
    # embed to Chroma
    _jobs_col.add(
        ids=[f"job:{db_obj.id}"],
        documents=[db_obj.description],
        metadatas=[{"job_id": db_obj.id, "title": db_obj.title, "company": db_obj.company or ""}],
        embeddings=[_embed(db_obj.description)]
    )
    return db_obj

def ingest_jobs_from_list(jobs: list):
    db = SessionLocal()
    saved = []
    try:
        for job_data in jobs:
            job = JobPosting(**job_data)
            db.add(job)
            db.flush()  # ensures IDs are generated
            saved.append({
                "id": job.id,
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "description": job.description,
                "url": job.url,
                "source": job.source,
                "external_id": job.external_id,
            })
        db.commit()
        return saved
    finally:
        db.close()

# ---------- External Sources ----------
def fetch_remoteok() -> List[dict]:
    # public JSON feed
    res = requests.get("https://remoteok.com/api", timeout=20)
    data = res.json()[1:]  # first element is metadata
    jobs = []
    for x in data:
        if not x.get("description"):
            continue
        jobs.append({
            "title": x.get("position") or x.get("title") or "Unknown",
            "company": x.get("company"),
            "location": x.get("location"),
            "description": x["description"],
            "url": x.get("url"),
            "external_id": str(x.get("id")),
            "source": "remoteok",
        })
    return jobs

def fetch_muse(page: int = 1) -> List[dict]:
    # The Muse public API
    url = f"https://www.themuse.com/api/public/jobs?page={page}"
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    data = r.json()
    jobs = []
    for x in data.get("results", []):
        desc = x.get("contents") or x.get("description") or ""
        if not desc:
            continue
        jobs.append({
            "title": x.get("name") or "Unknown",
            "company": (x.get("company") or {}).get("name"),
            "location": ", ".join([l.get("name") for l in x.get("locations", []) if l.get("name")]),
            "description": desc,
            "url": x.get("refs", {}).get("landing_page"),
            "external_id": str(x.get("id")),
            "source": "muse",
        })
    return jobs

# ---------- Matching ----------
def _get_resume_text_for_session(db: Session, session_id: int) -> Optional[str]:
    sess = db.query(InterviewSession).get(session_id)
    return sess.resume_text if sess else None

def match_resume_to_jobs(session_id: Optional[int] = None,
                         resume_text: Optional[str] = None,
                         top_k: int = 5) -> List[Tuple[dict, float]]:
    db = SessionLocal()
    try:
        if session_id and not resume_text:
            resume_text = _get_resume_text_for_session(db, session_id)
        if not resume_text:
            return []

        q = _embed(resume_text)
        res = _jobs_col.query(query_embeddings=[q], n_results=top_k)
        ids = [int(i.replace("job:", "")) for i in res["ids"][0]]

        # Convert distance to similarity if applicable
        if "distances" in res:
            sims = [1 - d for d in res["distances"][0]]
        else:
            sims = res["metadatas"][0]

        jobs = db.query(JobPosting).filter(JobPosting.id.in_(ids)).all()
        id_to_job = {j.id: j for j in jobs}

        out = []
        for job_id, sim in zip(ids, sims):
            if job_id in id_to_job:
                j = id_to_job[job_id]
                out.append((
                    {
                        "id": j.id,
                        "title": j.title,
                        "company": j.company,
                        "url": j.url,
                        "location": j.location,
                        "description": j.description
                    },
                    float(sim)
                ))

        # persist matches
        for job_dict, sim in out:
            db.add(JobMatch(session_id=session_id, job_id=job_dict["id"], similarity=sim))
        db.commit()
        return out
    finally:
        db.close()
