cat << 'EOF' > README.md
## 🧠 AI Interview Assistant 🤖  
An intelligent, voice-enabled web app that analyzes resumes, matches candidates with jobs, and conducts realistic AI mock interviews using **Speech Recognition (STT)**, **Text-to-Speech (TTS)**, and **RAG (Retrieval-Augmented Generation)**.  

---

### ✨ Features

✅ Smart resume parsing and analysis  
✅ Real-time job matching based on embeddings  
✅ AI-driven interview with speech-to-text and text-to-speech  
✅ Analytics radar chart for performance visualization  
✅ RAG-enhanced context for personalized questions  
✅ Modern UI with TailwindCSS + Framer Motion  

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React + Vite + TailwindCSS + Chart.js + Framer Motion |
| **Backend** | FastAPI + LangChain + ChromaDB + OpenAI API |
| **Vector Store** | Chroma (local persistent embeddings) |
| **AI Models** | OpenAI GPT + Web Speech API |
| **Deployment Ready** | Vercel / Render / Railway |

---

## 🏗️ Project Structure

\`\`\`
📦 HR-Project
 ┣ 📂 apps
 ┃ ┣ 📂 backend
 ┃ ┃ ┣ 📂 app
 ┃ ┃ ┃ ┣ 📂 routes
 ┃ ┃ ┃ ┣ 📂 services
 ┃ ┃ ┃ ┣ 📂 models
 ┃ ┃ ┃ ┣ 📂 schemas
 ┃ ┃ ┃ ┗ main.py
 ┃ ┃ ┣ 📜 requirements.txt
 ┃ ┃ ┣ 📜 .env
 ┃ ┗ 📂 frontend
 ┃ ┃ ┣ 📂 src
 ┃ ┃ ┃ ┣ 📜 InterviewGenerator.jsx
 ┃ ┃ ┃ ┣ 📜 InterviewPage.jsx
 ┃ ┃ ┃ ┣ 📜 components/JobSelector.jsx
 ┃ ┃ ┃ ┗ 📜 SpeechHandler.js
 ┃ ┃ ┣ 📜 package.json
 ┃ ┃ ┗ 📜 tailwind.config.js
 ┗ 📜 README.md
\`\`\`

---

## 🚀 Quick Start

### 1️⃣ Clone the Repository
\`\`\`bash
git clone https://github.com/Salahbedoui/HR-Project.git
cd HR-Project
\`\`\`

---

### 2️⃣ Backend Setup (FastAPI)

#### Go to backend folder
\`\`\`bash
cd apps/backend
\`\`\`

#### Create a virtual environment
\`\`\`bash
python -m venv venv
source venv/bin/activate      # Mac/Linux
venv\Scripts\activate         # Windows
\`\`\`

#### Install dependencies
\`\`\`bash
pip install -r requirements.txt
\`\`\`

#### (Optional but recommended) Delete previous Chroma data
If you want to start fresh:
\`\`\`bash
rm -rf chroma_data/
\`\`\`

#### Create `.env` file
Inside `apps/backend`, create a file named `.env`:

\`\`\`
OPENAI_API_KEY=your_openai_api_key_here
CHROMA_PATH=chroma_data
\`\`\`

#### Run the backend
\`\`\`bash
uvicorn app.main:app --reload --port 8000
\`\`\`

📍 Runs at: [http://localhost:8000](http://localhost:8000)  
📘 API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 3️⃣ Frontend Setup (React + Vite)

#### Go to frontend folder
\`\`\`bash
cd ../frontend
\`\`\`

#### Install dependencies
\`\`\`bash
npm install
\`\`\`

#### Run the frontend
\`\`\`bash
npm run dev
\`\`\`

🌐 Access app at → [http://localhost:5173](http://localhost:5173)

---

## 🎙️ Speech Recognition & Voice (Browser Setup)

- **STT (Speech-to-Text):** Uses built-in Web Speech API — Chrome or Edge recommended.  
- **TTS (Text-to-Speech):** AI interviewer speaks through the same API.  
- Make sure your browser microphone access is allowed.  

---

## 🧩 API Overview

| Endpoint | Method | Description |
|-----------|--------|-------------|
| `/api/resume/upload` | POST | Upload & parse a resume |
| `/api/interview/analyze` | POST | Generate questions based on resume |
| `/api/jobs/remoteok` | GET | Fetch live job listings |
| `/api/jobs/match` | POST | Match resume with selected job |
| `/api/interview/next` | POST | Generate next interview question |
| `/api/interview/summary` | POST | Summarize the interview |

---

## 🧠 RAG (Retrieval-Augmented Generation)

How it works:
1. Extract text from your resume.  
2. Embed text chunks using **OpenAI embeddings**.  
3. Store embeddings in **ChromaDB**.  
4. Retrieve top matching chunks dynamically during interviews.  
5. Feed retrieved context to GPT for **customized interview questions**.  

---

## 📊 Analytics Radar Chart

Each answer is evaluated on:
- Clarity  
- Confidence  
- Coherence  
- Technical Depth  
- Engagement  

The results are shown in a **Radar Chart** using Chart.js.

---

## 🔐 Environment Variables

| Variable | Description |
|-----------|--------------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `CHROMA_PATH` | Directory for ChromaDB |
| `PORT` | Backend port (default 8000) |

---

## 🧰 Development Commands

| Command | Description |
|----------|-------------|
| \`npm run dev\` | Start the frontend (Vite) |
| \`pip install -r requirements.txt\` | Install Python dependencies |
| \`uvicorn app.main:app --reload\` | Run FastAPI backend |
| \`rm -rf chroma_data/\` | Delete vector DB |
| \`git push origin main\` | Push changes to GitHub |

---

## ☁️ Deployment Tips

**Frontend:**
- Host on **Vercel** or **Netlify**  
- Update API URLs in `InterviewGenerator.jsx` to your backend domain  

**Backend:**
- Deploy on **Render**, **Railway**, or **AWS EC2**  
- Don’t forget to set environment variables in the deployment dashboard  

**CORS:**  
If hosting on different domains, enable CORS in `main.py`:
\`\`\`python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
\`\`\`

---

## 🧾 License
MIT License — Free for personal and commercial use.  
EOF

git add README.md
git commit -m "Add full README with setup guide"
git push origin main
