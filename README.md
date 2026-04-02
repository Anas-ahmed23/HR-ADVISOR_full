# HR Advisor — AI Recruitment Intelligence

A production-grade AI recruitment platform combining two fully integrated workflows: **CV Analyzer** (evidence-based resume vs job description scoring) and **Voice Agent** (Azure-powered AI screening interviews with real-time transcription and barge-in support).

---

## Features

### CV Analyzer
- Upload a candidate CV and job description (PDF, DOCX, or TXT)
- **GLiNER** entity extraction pulls skills, tools, and requirements from both documents
- **SBERT** embeddings + agglomerative clustering find semantic skill alignments beyond keyword matching
- Weighted scoring across technical, experience, and education dimensions
- Structured output: fit score, skill gap analysis, matched skills with evidence, and recruiter recommendation

### Voice Agent
- Live AI-guided screening interviews via browser microphone (Web Speech API)
- Real-time transcript capture with speaker labels and timestamps
- AI responses via **Azure GPT-4.1** with optional HR context pack (candidate JSON + PDFs)
- Text-to-speech via **Azure GPT-4o-mini TTS** (audio streamed back to browser)
- Barge-in support — candidate can interrupt the AI mid-response
- Post-session panels: full transcript, live AI insights, and structured summary

### Frontend
- Three-page Next.js app sharing a unified dark premium shell
- Consistent design system: glassmorphism dark theme, violet/cyan accents, shared `ProductShell` navigation header and footer across all pages
- Responsive at all breakpoints

---

## Project structure

```text
HR-ADVISOR_full/
├── Backend/
│   ├── agent.py                  # Voice agent Flask server (port 5000)
│   ├── backend_server.py         # CV analysis Flask server (port 5001)
│   ├── hr_analyzer.py            # CV analysis engine (GLiNER + SBERT + LLM)
│   ├── requirements-voice.txt    # Voice agent Python dependencies
│   ├── .env                      # Azure credentials and server config
│   ├── ModelVoice/               # Voice model assets
│   └── uploads/                  # Temporary upload directory (auto-created)
│
└── Frontend/
    ├── app/
    │   ├── layout.tsx            # Root layout (Inter font, Vercel Analytics)
    │   ├── page.tsx              # Home page — hero, workflows, feature grid
    │   ├── analyzer/
    │   │   └── page.tsx          # CV Analyzer page
    │   ├── voice-agent/
    │   │   ├── layout.tsx        # Voice agent layout
    │   │   └── page.tsx          # Voice Agent workspace
    │   └── api/
    │       └── analyze_cv/
    │           └── route.ts      # Next.js API proxy → backend_server.py
    ├── components/
    │   ├── product-shell.tsx     # Shared shell: sticky header nav + footer
    │   ├── cv-analyzer.tsx       # CV upload workspace + live status strip
    │   ├── ats-dashboard.tsx     # ATS results dashboard (post-analysis view)
    │   └── WaveformVisualizer.tsx # Live audio waveform for voice sessions
    └── lib/
        └── http-client.ts        # HTTP client for voice agent API
```

---

## Architecture

```
Browser
  │
  ├── POST /api/analyze_cv  ──►  Next.js API route (route.ts)
  │                                      │
  │                                      └──► POST /analyze
  │                                           backend_server.py  :5001
  │                                                   │
  │                                                   └──► hr_analyzer.py
  │                                                        (GLiNER + SBERT + Azure OpenAI)
  │
  └── POST /chat, /interrupt ──► agent.py  :5000
      GET  /health, /speaking_status       (Azure GPT-4.1 + GPT-4o Transcribe + GPT-4o-mini TTS)
```

**CV Analyzer flow:**
Browser uploads files → Next.js API proxy → `backend_server.py` → `hr_analyzer.py` runs entity extraction, semantic matching, and LLM scoring → structured JSON → `ats-dashboard.tsx` renders results.

**Voice Agent flow:**
Browser captures speech via Web Speech API → `http-client.ts` sends transcribed text to `agent.py /chat` → Azure GPT-4.1 generates reply (with optional HR context) → Azure TTS synthesizes WAV audio → base64 audio returned → browser plays it back.

Both backends share the same Azure OpenAI credentials from `Backend/.env`.

---

## Azure services

| Service | Model | Used by |
|---|---|---|
| Azure OpenAI (LLM) | `gpt-4.1` | CV scoring (hr_analyzer.py) + voice replies (agent.py) |
| Azure GPT-4o Transcribe (STT) | `gpt-4o-transcribe` | Voice Agent |
| Azure GPT-4o-mini TTS | `gpt-4o-mini-tts` | Voice Agent |

---

## Environment setup

### `Backend/.env`

```env
# ── Azure OpenAI (shared by both services) ───────────────────────────────
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4.1
AZURE_OPENAI_API_VERSION=2025-01-01-preview

# ── Azure STT ─────────────────────────────────────────────────────────────
AZURE_TRANSCRIBE_API_KEY=your_key
AZURE_TRANSCRIBE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/openai/deployments/gpt-4o-transcribe/audio/transcriptions?api-version=2025-03-01-preview
AZURE_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe
AZURE_TRANSCRIBE_API_VERSION=2025-03-01-preview

# ── Azure TTS ─────────────────────────────────────────────────────────────
AZURE_TTS_API_KEY=your_key
AZURE_TTS_ENDPOINT=https://your-resource.cognitiveservices.azure.com/openai/deployments/gpt-4o-mini-tts/audio/speech?api-version=2025-03-01-preview
AZURE_TTS_DEPLOYMENT=gpt-4o-mini-tts
AZURE_TTS_API_VERSION=2025-03-01-preview
AZURE_TTS_VOICE=alloy

# ── Servers ───────────────────────────────────────────────────────────────
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
CV_SERVER_PORT=5001

# ── Optional: HR context documents for the voice agent ───────────────────
# When set, the voice agent loads these documents into its LLM context so it
# can answer candidate-specific questions during screening interviews.
# VOICE_CONTEXT_JSON=rag_output.json
# VOICE_CONTEXT_PDFS=candidate_cv.pdf,job_description.pdf
```

### `Frontend/.env.local`

```env
NEXT_PUBLIC_VOICE_SERVER_URL=http://localhost:5000
CV_ANALYZE_BACKEND_URL=http://127.0.0.1:5001/analyze
```

---

## How to run

### 1. Voice Agent backend (port 5000)

```bash
cd Backend
pip install -r requirements-voice.txt
python agent.py
```

Verify:
```bash
curl http://localhost:5000/health
```

### 2. CV Analyzer backend (port 5001)

```bash
cd Backend
# Install: Flask, pdfplumber, docx2txt, gliner, sentence-transformers, spacy, openai, python-dotenv
python backend_server.py
```

### 3. Frontend

```bash
cd Frontend
npm install
npm run dev
```

Open **http://localhost:3000**

---

## Voice Agent API endpoints (`agent.py`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness and readiness check |
| `GET` | `/status` | Deployment names, TTS voice, context size |
| `POST` | `/chat` | Main endpoint — accepts `text_input` or `audio_base64`, returns `text_response` + `audio_base64` |
| `POST` | `/transcribe` | Audio → transcribed text only |
| `POST` | `/synthesize` | Text → audio only |
| `GET` | `/speaking_status` | Returns `is_speaking` and `barge_in_active` |
| `POST` | `/interrupt` | Barge-in signal — stops current TTS response |

**`/chat` request:**
```json
{ "text_input": "Tell me about the candidate's backend experience." }
```

**`/chat` response:**
```json
{
  "transcribed_text": "Tell me about the candidate's backend experience.",
  "text_response": "The candidate has 4 years of backend development...",
  "audio_base64": "<base64 WAV>",
  "should_exit": false,
  "interrupted": false,
  "error": ""
}
```

---

## CV Analyzer API endpoint (`backend_server.py`)

```
POST /analyze
Content-Type: multipart/form-data

cv_file  — candidate resume (PDF, DOCX, TXT)
jd_file  — job description  (PDF, DOCX, TXT)
```

The Next.js route `/api/analyze_cv` proxies this, flattens the response, and forwards it to the frontend.

---

## Frontend design system

All pages share a unified design language through `ProductShell`:

| Token | Value |
|---|---|
| Background | `#05050b` deep navy with radial gradient overlays |
| Primary accent | Violet `#7A4DFF` |
| Secondary accent | Cyan `#06b6d4` |
| Success | Emerald `#34d399` |
| Card style | `ProductPanel` — `rounded-[28px]` frosted glass, `border-white/10` |
| Typography | Inter, `tracking-[-0.04em]` headings, `text-white/60` body |
| Navigation | Sticky header with pill-style active nav, shared footer |

### Pages

| Route | Description |
|---|---|
| `/` | Hero section, value pillars, workflow cards (CV Analyzer + Voice Agent), operational depth preview, CTA |
| `/analyzer` | CV + JD upload workspace with live status strip; after analysis: full ATS dashboard with score rings, skill breakdown, advice tabs |
| `/voice-agent` | Session stats strip, left-panel session controls (workflow steps, waveform, start/end buttons), right-panel review tabs (Transcript, AI Insights, Summary) |
