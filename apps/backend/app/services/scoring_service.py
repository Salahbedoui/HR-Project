import google.generativeai as genai
from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

def analyze_resume(resume_text: str):
    """Generate a score and short intro from resume"""
    model = genai.GenerativeModel(settings.GEMINI_MODEL)

    prompt = f"""
    Analyze the following resume and:
    1. Rate the candidate on a scale from 0 to 100 based on technical skills, clarity, and experience.
    2. Write a concise and friendly 2-sentence introduction as if you were introducing the candidate in an interview.

    Resume:
    {resume_text}
    """

    response = model.generate_content(prompt)
    text = response.text.strip()

    # crude split, can refine later
    lines = text.split("\n")
    score = None
    intro = ""

    for line in lines:
        if "score" in line.lower() or "%" in line:
            score = ''.join(filter(str.isdigit, line))
        else:
            intro += line + " "

    return {"score": int(score) if score else 75, "intro": intro.strip()}   
