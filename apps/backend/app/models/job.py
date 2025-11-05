from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, nullable=True)          # 'remoteok' | 'muse' | 'csv' | 'manual'
    external_id = Column(String, index=True)        # id from source (if any)
    title = Column(String, nullable=False)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    matches = relationship("JobMatch", back_populates="job")

class JobMatch(Base):
    __tablename__ = "job_matches"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    job_id = Column(Integer, ForeignKey("job_postings.id"), nullable=False)
    similarity = Column(Float, default=0.0)     # cosine similarity 0..1
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("JobPosting", back_populates="matches")
