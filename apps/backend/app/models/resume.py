from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.candidate import Candidate

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    text_content = Column(Text, nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=True)

    candidate = relationship("Candidate", backref="resumes")
