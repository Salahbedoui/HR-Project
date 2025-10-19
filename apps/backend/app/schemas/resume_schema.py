from pydantic import BaseModel

class ResumeBase(BaseModel):
    filename: str
    text_content: str

class ResumeCreate(ResumeBase):
    pass

class ResumeOut(ResumeBase):
    id: int

    class Config:
        from_attributes = True
