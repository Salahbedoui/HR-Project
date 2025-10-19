import os
from dotenv import load_dotenv

# Force load .env file
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(dotenv_path=env_path)

# Make sure GOOGLE_API_KEY is also set
if "GOOGLE_API_KEY" not in os.environ and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "models/gemini-2.5-flash")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")

settings = Settings()

print(f"🔑 Loaded GEMINI_API_KEY: {settings.GEMINI_API_KEY[:10]}...")
print(f"🧠 Using model: {settings.GEMINI_MODEL}")
