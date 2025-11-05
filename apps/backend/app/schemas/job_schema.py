from pydantic import BaseModel
from typing import Optional, List

class JobIn(BaseModel):
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: str
    url: Optional[str] = None
    source: Optional[str] = "manual"
    external_id: Optional[str] = None

class JobOut(JobIn):
    id: int
    class Config:
        orm_mode = True

class JobSearchOut(BaseModel):
    jobs: List[JobOut]

class MatchIn(BaseModel):
    # choose either session_id (preferred) or raw resume text
    session_id: Optional[int] = None
    resume_text: Optional[str] = None
    top_k: int = 5

class MatchOut(BaseModel):
    job_id: int
    title: str
    company: str | None = None
    similarity: float
    url: str | None = None
    reason: str | None = None
