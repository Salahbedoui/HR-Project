import os
from dotenv import load_dotenv
import google.generativeai as genai

# ✅ Load .env manually here too (in case main.py didn’t yet)
load_dotenv()

# ✅ Configure Gemini API key
api_key = os.getenv("GEMINI_API_KEY")
print("🔍 Loaded GEMINI_API_KEY:", api_key)

if not api_key:
    raise ValueError("❌ GEMINI_API_KEY not found. Please check your .env file.")

genai.configure(api_key=api_key)


def generate_interview_questions(resume_text: str):
    """
    Generate interview questions based on the resume text using Gemini.
    """
    try:
        # ✅ Correct Gemini model name
        model = genai.GenerativeModel("models/gemini-2.5-flash")

        prompt = f"""
        You are an experienced technical interviewer.
        Read this resume content and generate 5 professional, domain-relevant interview questions.

        Resume:
        {resume_text}
        """

        response = model.generate_content(prompt)

        # ✅ Extract and clean up questions
        text_output = response.text.strip()
        questions = [q.strip() for q in text_output.split("\n") if q.strip()]

        return {"questions": questions}

    except Exception as e:
        print(f"❌ Gemini API Error: {e}")
        return {"error": str(e)}


# ✅ Optional helper to list available Gemini models (for debugging)
def list_available_models():
    print("🔍 Available Gemini models:")
    for m in genai.list_models():
        print(m.name)
