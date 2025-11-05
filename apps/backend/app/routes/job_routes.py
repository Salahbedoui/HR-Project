from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.job_schema import JobIn, JobOut, JobSearchOut, MatchIn, MatchOut
from app.services.job_service import (
    ingest_jobs_from_list, fetch_remoteok, fetch_muse, match_resume_to_jobs
)

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("/ingest", response_model=JobSearchOut)
async def ingest_jobs(jobs: List[JobIn]):
    try:
        saved = ingest_jobs_from_list([j.dict() for j in jobs])
        return {"jobs": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/remoteok", response_model=JobSearchOut)
async def get_remoteok():
    try:
        jobs = fetch_remoteok()
        saved = ingest_jobs_from_list(jobs)
        return {"jobs": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/muse", response_model=JobSearchOut)
async def get_muse(page: int = 1):
    try:
        jobs = fetch_muse(page=page)
        saved = ingest_jobs_from_list(jobs)
        return {"jobs": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 🧠 FIXED: Frontend-friendly match endpoint
@router.post("/match", response_model=List[MatchOut])
async def match_jobs(data: MatchIn):
    try:
        pairs = match_resume_to_jobs(
            session_id=data.session_id,
            resume_text=data.resume_text,
            top_k=data.top_k
        )

        return [{
            "job_id": job_dict["id"],
            "title": job_dict["title"],
            "company": job_dict["company"],
            "similarity": round(sim * 100, 2),
            "url": job_dict.get("url"),
            "reason": None
        } for job_dict, sim in pairs]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
