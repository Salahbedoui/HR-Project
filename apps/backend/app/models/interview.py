from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    candidate_name = Column(String(200), nullable=True)
    resume_text = Column(Text, nullable=False)
    score = Column(Integer, nullable=True)
    intro = Column(Text, nullable=True)
    status = Column(String(50), default="in_progress")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to interview messages
    messages = relationship(
        "InterviewMessage",
        back_populates="session",
        cascade="all, delete-orphan"
    )


class InterviewMessage(Base):
    __tablename__ = "interview_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)  # "interviewer" | "candidate" | "system"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("InterviewSession", back_populates="messages")
