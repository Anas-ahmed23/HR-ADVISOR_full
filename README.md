# HR Advisor

Production-ready SaaS combining **CV Analyzer** (evidence-based CV vs job description matching) and **Voice Agent** (AI voice conversation with Azure STT/TTS and barge-in support) in one app.

---

## Use cases

| Use case       | Description |
|----------------|-------------|
| **CV Analyzer** | Upload CV + job description (PDF/DOCX). Get semantic matching, ATS-style scores, matched/missing skills, and explainable breakdowns. |
| **Voice Agent** | Real-time voice conversation with an AI assistant (Azure OpenAI, Transcribe, TTS). Speak, get spoken replies, interrupt anytime (barge-in). |

---

## Project structure

```
HR-ADVISOR_full/
├── Backend/                    # Python services
│   ├── backend_server.py       # CV analysis API (port 5001)
│   ├── hr_analyzer.py          # CV analysis logic
│   ├── Server.py               # Voice agent API (port 5000)
│   ├── ModelVoice/             # Voice assets
│   ├── requirements-voice.txt  # Voice server deps
│   └── .env.example            # Backend env template
├── Frontend/                   # Next.js app
│   ├── app/
│   │   ├── page.tsx            # Home (hub)
│   │   ├── analyzer/           # CV Analyzer UI
│   │   └── voice-agent/        # Voice Agent UI
│   ├── components/
│   ├── lib/
│   └── .env.example            # Frontend env template
├── README.md
└── .env examples
```

---

## How to run

### 1. Backend

**CV Analyzer (port 5001)**

```bash
cd Backend
# Use your venv; install deps if needed (Flask, pdfplumber, docx2txt, gliner, sentence-transformers, spacy, etc.)
python backend_server.py
```

**Voice Agent (port 5000)**

```bash
cd Backend
pip install -r requirements-voice.txt
cp .env.example .env   # then edit .env with Azure credentials
python Server.py
```

- Voice agent needs Azure OpenAI, Transcribe, and TTS configured in `Backend/.env` (see `Backend/.env.example`).

### 2. Frontend

```bash
cd Frontend
npm install
npm run dev
```

- App: **http://localhost:3000**
- Home links to **CV Analyzer** and **Voice Agent**.

### 3. Environment

- **Backend:** Copy `Backend/.env.example` to `Backend/.env` and set Azure keys/endpoints for the voice agent.
- **Frontend:** Copy `Frontend/.env.example` to `Frontend/.env.local`. Set `NEXT_PUBLIC_VOICE_SERVER_URL=http://localhost:5000` (or your voice backend URL). No hardcoded URLs.

---

## Architecture summary

- **Frontend:** Next.js; single app with home page directing to CV Analyzer and Voice Agent.
- **CV Analyzer:** Frontend calls Next.js API route (`/api/analyze_cv`), which can proxy to `Backend/backend_server.py` (port 5001).
- **Voice Agent:** Frontend uses `NEXT_PUBLIC_VOICE_SERVER_URL` (default `http://localhost:5000`) to talk to `Backend/Server.py`.

One repo, one frontend, two backend entry points (CV + voice). Clean separation of frontend and backend.
