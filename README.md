# HR Advisor — AI Recruitment Intelligence Platform

**HR Advisor** is a production-grade AI recruitment platform that unifies two fully integrated hiring workflows: an evidence-based **CV Analyzer** that scores candidate–job description fit across eight weighted dimensions, and a **Voice Agent** that conducts live AI-guided screening interviews with real-time transcription, barge-in interruption, and structured post-session review. Both workflows share a single dark-premium Next.js frontend and two independent Python Flask backends connected to Azure OpenAI.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [CV Analyzer](#cv-analyzer)
- [ATS Results Dashboard](#ats-results-dashboard)
- [Voice Agent](#voice-agent)
- [Frontend Design System](#frontend-design-system)
- [Backend — CV Analysis Engine](#backend--cv-analysis-engine)
- [Backend — Voice Agent Server](#backend--voice-agent-server)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Azure Services](#azure-services)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)

---

## Architecture Overview

```
Browser (Next.js 15 · App Router)
  │
  ├─ POST /api/analyze_cv ──► Next.js proxy route (route.ts)
  │                                   │
  │                                   └──► POST /analyze
  │                                        backend_server.py  :5001
  │                                              │
  │                                              └──► hr_analyzer.py
  │                                                   Flair NER + keyword matching
  │                                                   + Azure OpenAI GPT-4.1
  │
  └─ HTTP (http-client.ts) ──► agent.py  :5000
       POST /chat                         Azure GPT-4.1 (LLM)
       POST /interrupt                    Azure GPT-4o-Transcribe (STT)
       GET  /health                       Azure GPT-4o-mini-TTS (TTS)
       GET  /speaking_status
```

**CV Analyzer flow:** The browser uploads a candidate CV and a selected job description PDF. The Next.js API route proxies the multipart form to `backend_server.py`, which saves the files and invokes `hr_analyzer.py`. The analyzer runs Flair NER for entity extraction, keyword matching from curated tech/soft/domain dictionaries, and then calls Azure GPT-4.1 with a structured JSON prompt template to score and evaluate the candidate across eight dimensions. The complete structured result is forwarded to the frontend and rendered in `ats-dashboard.tsx`.

**Voice Agent flow:** The browser captures speech via the Web Speech API (Chrome/Edge). On final transcript, `http-client.ts` sends the text to `agent.py /chat`. The Flask server calls Azure GPT-4.1 with the full conversation history and optional HR context documents (candidate JSON, PDFs) to generate a response. Azure GPT-4o-mini-TTS synthesizes the response to a WAV audio stream, encoded as base64 and returned in the JSON payload. The browser decodes and plays the audio; a barge-in window opens mid-playback so the candidate can interrupt naturally.

Both backends read credentials from a shared `Backend/.env` file.

---

## CV Analyzer

### JD Library — 134 Curated Job Descriptions

The CV Analyzer ships with a library of 134 professionally authored job description PDFs spanning 12 categories. Job descriptions are stored as static assets in `Frontend/public/jds/` and served directly by Next.js. When a user selects a role, the frontend fetches the corresponding PDF, converts it to a `File` object in memory, and passes it to the analysis pipeline — identical to an uploaded file from the backend's perspective.

**Categories:**

| Category | Roles |
|---|---|
| AI & Machine Learning | Junior → Lead → Senior: NLP, Computer Vision, Reinforcement Learning, ML Engineer, AI Research Scientist, AI Ethics Consultant, AI Product Manager, Predictive Modeler |
| Software Engineering | Junior → Lead → Senior: Software Engineer, Full Stack Developer, Web Developer, Mobile App Developer, Software Architect, Systems Architect, Software Development Manager |
| Data & Analytics | Junior → Lead → Senior: Data Scientist, Data Analyst, Big Data Engineer, BI Analyst, Database Administrator, Database Architect, Quantitative Analyst, FinTech Data Analyst |
| Cloud & DevOps | Junior → Senior: Cloud Engineer, Cloud Architect, Cloud Solutions Architect, DevOps Engineer, DevOps Team Lead |
| FinTech & Finance | Digital Banking Specialist, FinTech Software Engineer, Payment Systems Architect, Risk Management Analyst, Quantitative Analyst — Junior through Lead |
| Security | Security Analyst, Security Engineer, Lead Security Engineer, RegTech Specialist |
| Blockchain & Web3 | Junior → Lead → Senior Blockchain Developer |
| Game, AR & VR | Game Designer, Game Developer, AR Developer, VR Developer, VR/AR Experience Designer, Interactive Media Designer, Motion Graphics Designer, 3D Artist & Modeler, Media Systems Engineer — all levels |
| QA & Testing | QA Engineer, QA Lead, QA Manager, Senior QA Engineer |
| IT & Support | IT Consultant, IT Help Desk Technician, IT Project Manager, Technical Support Engineer, Technical Support Team Lead |
| Design | UI/UX Designer, Lead UI/UX Designer, Senior UI/UX Designer |
| Robotics | Robotics Engineer, Lead Robotics Engineer, Senior Robotics Engineer |

### Upload Workspace

- **CV DropZone** — drag-and-drop or click-to-browse for candidate resumes in PDF, DOCX, or TXT format. Displays file name, size, and a one-click replace affordance after upload.
- **JD Selection** — users select exclusively from the premade library. No custom JD upload is permitted, ensuring consistent document quality and eliminating malformed input.
- **Live status strip** — four real-time indicator cards: Candidate CV state, Job Description selection state, overall readiness gate, and analysis running state with an animated spinner.
- **How it works panel** — three-step visual guide (Upload CV → Pick a JD → Get Insights) with concise output descriptors (Fit Score, Skill Gap Analysis, Recruiter Advice).

### JD Library Browser

- **Live search** — filters by job title and category simultaneously as the user types. Expanding all category groups automatically when a search query is active.
- **Accordion categories** — 12 colour-coded category groups, each collapsible independently. Each category carries a count badge and a distinct accent colour.
- **Chip selection** — each job description renders as an inline chip. Selected chips display a checkmark and shift to the category accent colour. Selecting a new chip replaces the previous selection instantly.
- **Loading state** — while the JD PDF is being fetched from `/jds/`, the chip shows a spinner and the upload status strip reflects the pending state. On error, the selection is cleared and an inline error is surfaced.

---

## ATS Results Dashboard

The full analysis result is rendered in `ats-dashboard.tsx` — a self-contained results view that replaces the upload workspace after a successful analysis run.

### Hero Card

- **Score ring** — large animated SVG arc ring showing the overall match percentage with a glow shadow. Ring colour transitions from red (low) through amber to emerald (high) based on score thresholds.
- **Classification badge** — LLM-generated label (e.g., "Strong Match", "Partial Fit", "Not Suitable") alongside an application readiness badge (Ready to Apply / Minor Improvements / Upskilling Required / Not Ready Yet), each colour-keyed.
- **Headline and verdict** — LLM-generated headline string and a 2–4 sentence verdict paragraph. Falls back to a score-tiered default verdict when the LLM omits these fields.
- **Stats row** — three at-a-glance counts: matched skills, missing skills, and action items.
- **Mini rings** — three smaller arc rings for Technical Skills, Experience Fit, and Education scores rendered inline.

### Score Breakdown

Eight individually scored dimensions rendered as labelled progress bars with percentage readouts and colour-coded fill gradients:

1. Technical Skills
2. Experience Fit
3. Education
4. Soft Skills
5. Responsibility Alignment
6. Domain Fit
7. Impact & Achievements
8. Resume Quality

All dimension scores are normalised from the backend (0–1 or 0–100 both handled) to integer percentages for display.

### Status Row

Three status chips summarising the three most actionable signals at a glance:

- **Hard Skills** — pass/fail/warn based on missing skills count
- **Experience** — pass/warn based on experience dimension score threshold (60%)
- **Education** — pass/warn based on education dimension score threshold (60%)

### JD Context Strip

When the LLM returns job description analysis data, a compact strip renders the job title, domain pill, seniority pill, and job summary inline above the main tab panel.

### Tabbed Analysis Panel

Four tabs with live count badges:

**Matched Skills**
Each matched skill is rendered as a card showing the JD requirement label, the corresponding CV skill found, the match type (exact / synonym / semantic) with a colour-coded badge, and the evidence excerpt quoted from the source documents. Cards are animated in with staggered fade-up delays.

**Missing Skills**
Missing requirements rendered either as collapsible grouped category cards (when the LLM returns grouped data) or as a flat chip list. Each group is collapsible with an open/close chevron and shows a count badge. Individual skills render as red-tinted chips.

**Candidate Advice**
Four advice subsections — overall advice paragraph, priority improvements (ranked numbered cards with action + reason), CV improvements list, learning recommendations list, and interview tips list.

Smart fallback system: when the LLM returns empty advice fields (common for lower-scoring analyses), the system auto-derives contextual priority improvements from the actual score data — surfacing gaps count, experience score weakness, resume quality issues, and overall fit level as structured action items. The Candidate Advice tab always shows actionable content.

**Insights**
Strengths, gaps, and recommendations rendered as bullet lists with colour-coded dot markers. Falls back to an empty state message when the LLM omits insights entirely.

### Sidebar

- **Top Strengths** — up to 5 LLM-identified strengths with checkmark icons
- **Top Gaps** — up to 5 LLM-identified gaps with X-circle icons
- **JD Requirements** — first 6 requirements from the JD analysis with chevron markers
- **Required Technologies** — technology chips from JD tools and technologies list
- **Next Steps** — score-tiered paragraph (≥75 / 50–74 / <50) providing concrete next-action guidance

### Export

The Export button downloads a complete plain-text analysis report containing: generation timestamp, overall score, classification, readiness, headline, verdict, JD title/domain/seniority/summary, all 8 dimension scores, every matched skill with evidence, all missing skills (grouped where available), top strengths, top gaps, full candidate advice with priority improvements, CV improvements, learning recommendations, interview tips, and all insights sections. The filename is auto-generated from the job title and a timestamp.

### Actions

- **New Analysis** — resets all state and returns to the upload workspace
- **Export** — downloads the full formatted report as `.txt`

---

## Voice Agent

### Session Controls Panel

**Pre-session state**
- Workflow step indicator (Setup → Interview → Review) with colour-coded state badges
- Readiness cards: "What to expect" (transcript preservation, barge-in support, minimal noise) and "Setup notes" (backend availability, browser requirements, mic permission)
- Primary CTA button disabled until speech recognition is confirmed available in the browser

**Connecting state**
- Animated spinner with status message while `http-client.ts` performs the `/health` check and the Web Speech API initialises

**Active call state**
- **Waveform Visualizer** — live animated waveform component (`WaveformVisualizer.tsx`) that switches between listening and speaking variants based on the current AI state
- **Candidate input panel** — shows live interim transcript as the candidate speaks (updates word-by-word) falling back to the last confirmed utterance
- **Session activity panel** — reflects the current AI state: processing, speaking, or idle with the last AI response text
- **State grid** — three mini cards showing mic state (On / Muted), AI state (Speaking / Processing / Idle), and capture state (Live / Waiting)
- **Mute/unmute button** — toggles speech recognition while keeping the session open
- **End session button** — gracefully terminates the call, stops audio playback, disconnects from the backend, and transitions to the review state

**Completed state**
- Session overview summary auto-generated from transcript data
- Recommended next-step card derived from transcript quality signals
- Quick-access buttons to Transcript and AI Insights tabs
- New Session button resets all state for a fresh call

### Review Panel — Transcript Tab

Full conversation transcript rendered as speaker-labelled bubbles, colour-coded by speaker (violet for Candidate, cyan for AI). System response fragments (connection status, processing notices) are filtered out and never written to the transcript. A live "Candidate speaking" bubble updates in real time during active speech recognition with the current interim text.

### Review Panel — AI Insights Tab

Three computed insight cards derived entirely from the transcript content, updated live during the session:

- **Communication Clarity** — derived from average candidate response word count (Detailed ≥14 words / Balanced ≥8 / Brief / Waiting)
- **Ownership Signals** — counts strong ownership verbs (led, built, owned, improved, delivered, managed, launched, designed, optimized) across all candidate turns (Strong ≥3 / Emerging ≥1 / Light)
- **Role-fit Topics** — detects which of four topic clusters (Technical depth, Delivery ownership, Collaboration, Problem solving) were surfaced in the conversation

Additional sections: detected topics as pills, and a review guidance checklist for the recruiter.

### Review Panel — Summary Tab

Auto-generated post-session summary including:
- Session overview paragraph (turn counts, topic coverage)
- Recruiter recommendation (advance / keep in review) derived from candidate turn count and ownership signal density
- Top 2 strengths inferred from transcript signals
- Top concern (brief responses, missing technical depth)
- Recruiter notes (topics covered, average response length, follow-up reminders)

### Barge-in System

The voice agent implements a two-phase barge-in architecture to prevent AI audio from echo-looping into speech recognition:

1. **Lockout phase (1500ms)** — speech recognition is suppressed immediately after AI audio starts. The mic is closed so the AI's voice cannot feed back into the recognition engine.
2. **Barge-in window** — after 1500ms, speech recognition restarts while audio is still playing. If the candidate produces more than 500ms of continuous speech, an interrupt signal is sent to `agent.py /interrupt`, audio playback is stopped, and the turn transitions back to the candidate.
3. **Natural playback end** — when AI audio finishes without interruption, speech recognition resumes after a short echo-tail buffer (400ms).

All barge-in timers are properly cleaned up on session end, mute toggle, and component unmount.

### Stats Strip

Four stat cards shown above the workspace during a session:

- **Session** — Live / Done / Ready status indicator
- **Turns** — total transcript entries with candidate/AI breakdown
- **Topics** — detected topic cluster count with the first topic name
- **Progress** — percentage bar (18% base → +8% per turn → 100% on completion)

---

## Frontend Design System

All pages share a unified design language implemented through `ProductShell` and `ProductPanel`.

### Tokens

| Token | Value |
|---|---|
| Page background | `#05050b` deep navy with radial gradient overlays |
| Primary accent | Violet `#7A4DFF` |
| Secondary accent | Cyan `#06b6d4` |
| Success | Emerald `#34d399` |
| Warning | Amber `#fbbf24` |
| Error | Red `#f87171` |
| Card surface | `rgba(255,255,255,0.025)` with `border: rgba(255,255,255,0.07)` |
| Border radius (cards) | `16px` inner panels, `24–28px` primary panels |
| Typography | Inter, `tracking-[-0.04em]` headings, `text-white/60` body |
| Navigation | Sticky header, pill-style active nav indicator, shared footer |

### Component Architecture

- **`ProductShell`** — full-page wrapper with sticky navigation header and footer. Used by all three pages.
- **`ProductPanel`** — glassmorphism card primitive with rounded corners and translucent border. Used as the base container for every workspace panel.
- **`WaveformVisualizer`** — canvas-based animated waveform that switches between a listening pulse and an AI-speaking wave pattern.
- **`DropZone`** — drag-and-drop file input with dragging/filled/empty visual states, accent colour theming, and file size display.
- **`Ring`** — animated SVG arc score ring with optional glow shadow, inner label, and smooth 1.3s CSS transition on score change.
- **`ScoreBar`** — labelled progress bar with gradient fill, glow box-shadow, and animated width transition.
- **UI primitives** — full shadcn/ui component library (Button, Tabs, TabsList, TabsTrigger, TabsContent, and 60+ additional components).

### Pages

| Route | Description |
|---|---|
| `/` | Hero section, value proposition pillars, workflow cards (CV Analyzer + Voice Agent), operational depth preview, CTA |
| `/analyzer` | CV upload workspace with JD library picker and live status strip; transitions to full ATS dashboard post-analysis |
| `/voice-agent` | Session stats strip, left-panel session controls with waveform, right-panel review tabs (Transcript, AI Insights, Summary) |

---

## Backend — CV Analysis Engine

**File:** `Backend/hr_analyzer.py`

### Text Extraction

Supports PDF (via `pdfplumber`), DOCX (via `python-docx`), and TXT files. Handles both file paths and raw text strings. Page content is concatenated for multi-page PDFs.

### Entity Extraction

**Flair NER** (`flair/ner-english-large`) — loaded once at server startup to avoid per-request model initialisation overhead. Runs named entity recognition over both CV and JD text to extract person names, organisations, locations, and role-related entities. The tagger runs on `Sentence` objects constructed from the document text.

**Keyword matching** — three curated dictionaries (`TECH_SKILLS`, `SOFT_SKILLS`, `DOMAIN_SKILLS`) covering:
- Technical: 11 sub-categories (programming languages, frontend/backend frameworks, databases, cloud platforms, DevOps tools, testing tools, data analytics, ML/AI, APIs, security)
- Soft skills: 7 sub-categories (communication, collaboration, leadership, problem solving, organisation, adaptability, customer focus)
- Domain: finance, healthcare, retail, education, HR, and more

### LLM Scoring

A structured JSON prompt template is sent to Azure GPT-4.1 containing both documents and explicit instructions to populate the following output schema:

**`metadata`** — document type, candidate/job IDs, job title, source, timestamp

**`evaluation_result`** — classification label, final score (0–1), application readiness category, headline, short verdict

**`ats_summary`** — headline, short verdict, top 5 strengths, top 5 gaps

**`job_description_analysis`** — job title, summary, requirements list, responsibilities list, tools and technologies list, domain, seniority level

**`score_breakdown`** — eight float scores (0–1): skill, experience, education, soft skill, responsibility alignment, domain fit, impact, resume quality

**`matched_skills`** — array of objects: `jd_skill`, `cv_skill`, `match_type` (exact/synonym/semantic), `evidence` quote, `confidence`

**`missing_skills`** — flat array of unmatched JD requirements

**`missing_skills_grouped`** — missing skills organised into named category groups

**`candidate_advice`** — `overall_advice` paragraph, `priority_improvements` array (priority rank, action, reason), `cv_improvements` list, `learning_recommendations` list, `interview_tips` list

**`insights`** — `strengths` list, `gaps` list, `recommendations` list

**`voice_agent_facts`** — structured fact records for the voice agent RAG context, including match summary, score details, strengths, gaps, and advice, each with question forms and spoken answers optimised for TTS

**`retrieval_chunks`** — content chunks with keywords for vector retrieval

### Post-processing and Normalisation

After LLM response parsing, a normalisation pass (`_normalize`) ensures all required fields are present with sensible defaults, scores are clamped to 0–1, the job title is inferred from headline fields when missing, and matched/missing skills are deduplicated. Invalid JSON from the LLM is handled with a regex extraction fallback before propagating errors.

---

## Backend — Voice Agent Server

**File:** `Backend/agent.py`

### Session and Conversation Management

Maintains a persistent conversation history list in memory (one history per server process). Each `/chat` request appends the user turn and the assistant response. The history is prepended with a system prompt that configures the AI as an HR screening agent and optionally includes HR context documents.

### HR Context Loading

At server startup, if `VOICE_CONTEXT_JSON` is set, the agent loads the JSON file and formats the voice agent facts into a natural-language context block. If `VOICE_CONTEXT_PDFS` is set, each PDF is read via `pypdf` (if available) and appended to the system context up to `VOICE_CONTEXT_PDF_MAX_CHARS` per document and `VOICE_CONTEXT_MAX_CHARS` total. This allows the voice agent to answer candidate-specific questions grounded in the actual CV analysis output.

### Speech-to-Text

Audio input (base64-encoded WAV) from the `/chat` endpoint is decoded, written to a temporary file, and submitted to Azure GPT-4o-Transcribe via the OpenAI Python SDK. The transcription model, API version, language hint, and transcription prompt are all configurable via environment variables. Transcription results are returned alongside text responses when the `/transcribe` endpoint is called directly.

### Text-to-Speech

The LLM response text is submitted to Azure GPT-4o-mini-TTS. The voice is configurable (`AZURE_TTS_VOICE`, default `alloy`). The audio bytes are returned as a WAV stream, base64-encoded, and included in the `/chat` response payload. Unicode normalisation and text sanitisation are applied before synthesis to prevent encoding errors.

### Barge-in State

A thread-safe `_state` dictionary tracks `is_speaking` and `barge_in_active`. The `/interrupt` endpoint sets a flag that the active TTS synthesis loop checks to abort mid-response. The `/speaking_status` endpoint exposes current state for the frontend polling mechanism.

### CORS

Both `backend_server.py` and `agent.py` use `flask-cors` with permissive defaults to allow the Next.js dev server and production frontend to communicate without preflight failures.

---

## API Reference

### CV Analysis — `backend_server.py` (port 5001)

```
POST /analyze
Content-Type: multipart/form-data

Fields:
  cv_file  (file)  — candidate resume: PDF, DOCX, or TXT
  jd_file  (file)  — job description:  PDF, DOCX, or TXT

Response: 200 application/json
  Full LLM analysis object (see hr_analyzer.py schema above)

Errors:
  400 — missing cv_file or jd_file
  500 — analysis pipeline failure
```

### Next.js Proxy — `app/api/analyze_cv/route.ts`

```
POST /api/analyze_cv
Content-Type: multipart/form-data

Identical interface to /analyze — proxies transparently.
Adds structured error handling: 502 on backend unreachable,
502 on non-OK backend response, 502 on empty or invalid JSON body.
```

### Voice Agent — `agent.py` (port 5000)

| Method | Endpoint | Request | Response |
|---|---|---|---|
| `GET` | `/health` | — | `{ "status": "healthy", "message": "..." }` |
| `GET` | `/status` | — | `{ "llm_deployment": "...", "tts_voice": "...", "context_size": N }` |
| `POST` | `/chat` | `{ "text_input": "..." }` or `{ "audio_base64": "..." }` | `{ "text_response", "audio_base64", "transcribed_text", "should_exit", "interrupted", "error" }` |
| `POST` | `/transcribe` | `{ "audio_base64": "..." }` | `{ "transcribed_text", "error" }` |
| `POST` | `/synthesize` | `{ "text": "..." }` | `{ "audio_base64", "error" }` |
| `GET` | `/speaking_status` | — | `{ "is_speaking": bool, "barge_in_active": bool }` |
| `POST` | `/interrupt` | — | `{ "status": "interrupted" }` |

---

## Project Structure

```text
HR-ADVISOR_full/
│
├── Backend/
│   ├── agent.py                   # Voice agent Flask server (port 5000)
│   │                              #   Azure GPT-4.1 · GPT-4o-Transcribe · GPT-4o-mini-TTS
│   ├── backend_server.py          # CV analysis Flask server (port 5001)
│   ├── hr_analyzer.py             # Analysis engine: Flair NER + keyword matching + LLM
│   ├── requirements-voice.txt     # Python dependencies for the voice agent
│   ├── .env                       # Azure credentials + server config (not committed)
│   ├── ModelVoice/                # Voice model assets
│   └── uploads/                   # Temp file storage for analysis runs (auto-created)
│
└── Frontend/
    ├── app/
    │   ├── layout.tsx             # Root layout (Inter font, global providers)
    │   ├── page.tsx               # Home page — hero, pillars, workflow cards, CTA
    │   ├── analyzer/
    │   │   └── page.tsx           # /analyzer — mounts CVAnalyzer component
    │   ├── voice-agent/
    │   │   ├── layout.tsx         # Voice agent layout wrapper
    │   │   └── page.tsx           # Full voice agent workspace
    │   └── api/
    │       └── analyze_cv/
    │           └── route.ts       # Next.js API route — proxy to backend_server.py
    │
    ├── components/
    │   ├── product-shell.tsx      # ProductShell + ProductPanel — shared layout primitives
    │   ├── cv-analyzer.tsx        # Upload workspace + JD library browser
    │   ├── ats-dashboard.tsx      # Full ATS results dashboard (post-analysis)
    │   ├── WaveformVisualizer.tsx # Animated audio waveform for voice sessions
    │   └── ui/                    # shadcn/ui component library (60+ primitives)
    │
    ├── lib/
    │   ├── http-client.ts         # HTTPClient class — voice agent API + audio playback
    │   └── utils.ts               # Tailwind cn() utility
    │
    ├── hooks/
    │   ├── use-mobile.ts          # Responsive breakpoint hook
    │   └── use-toast.ts           # Toast notification hook
    │
    └── public/
        ├── jds/                   # 134 curated JD PDFs served as static assets
        └── *.png / *.svg          # Brand assets
```

---

## Azure Services

| Service | Model ID | Used by | Purpose |
|---|---|---|---|
| Azure OpenAI (LLM) | `gpt-4.1` | `hr_analyzer.py` + `agent.py` | CV scoring, structured JSON generation, voice agent conversation |
| Azure OpenAI (STT) | `gpt-4o-transcribe` | `agent.py` | Browser speech → text transcription |
| Azure OpenAI (TTS) | `gpt-4o-mini-tts` | `agent.py` | Text → WAV audio synthesis |

All three services are accessed through the OpenAI Python SDK configured with Azure endpoints. Credentials are loaded from `Backend/.env` via `python-dotenv`.

---

## Environment Variables

### `Backend/.env`

```env
# ── Azure OpenAI (LLM — shared by both services) ─────────────────────────────
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4.1
AZURE_OPENAI_API_VERSION=2025-01-01-preview

# ── Azure STT (GPT-4o-Transcribe) ────────────────────────────────────────────
AZURE_TRANSCRIBE_API_KEY=your_key
AZURE_TRANSCRIBE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/openai/deployments/gpt-4o-transcribe/audio/transcriptions?api-version=2025-03-01-preview
AZURE_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe
AZURE_TRANSCRIBE_API_VERSION=2025-03-01-preview
AZURE_TRANSCRIBE_LANGUAGE=en
AZURE_TRANSCRIBE_PROMPT=The speaker is speaking English.

# ── Azure TTS (GPT-4o-mini-TTS) ──────────────────────────────────────────────
AZURE_TTS_API_KEY=your_key
AZURE_TTS_ENDPOINT=https://your-resource.cognitiveservices.azure.com/openai/deployments/gpt-4o-mini-tts/audio/speech?api-version=2025-03-01-preview
AZURE_TTS_DEPLOYMENT=gpt-4o-mini-tts
AZURE_TTS_API_VERSION=2025-03-01-preview
AZURE_TTS_VOICE=alloy

# ── Server config ─────────────────────────────────────────────────────────────
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
CV_SERVER_PORT=5001
DEBUG=true

# ── Voice agent HR context (optional) ────────────────────────────────────────
# Load candidate analysis output and source documents into the voice agent's
# system context. The agent will use these to answer role-specific questions
# during live screening sessions.
# VOICE_CONTEXT_JSON=path/to/rag_output.json
# VOICE_CONTEXT_PDFS=candidate_cv.pdf,job_description.pdf
# VOICE_CONTEXT_PDF_MAX_CHARS=12000
# VOICE_CONTEXT_MAX_CHARS=30000
```

### `Frontend/.env.local`

```env
NEXT_PUBLIC_VOICE_SERVER_URL=http://localhost:5000
CV_ANALYZE_BACKEND_URL=http://127.0.0.1:5001/analyze
```

---

## Running Locally

### Prerequisites

- Python 3.10+
- Node.js 18+
- Chrome or Edge (required for Web Speech API in the Voice Agent)

### 1. CV Analysis Backend (port 5001)

```bash
cd Backend
pip install flask flask-cors pdfplumber python-docx flair sentence-transformers openai python-dotenv
python backend_server.py
```

Flair loads `flair/ner-english-large` on first run — this may take a moment. Subsequent starts reuse the cached model.

Verify:
```bash
curl -X POST http://127.0.0.1:5001/analyze \
  -F "cv_file=@path/to/cv.pdf" \
  -F "jd_file=@path/to/jd.pdf"
```

### 2. Voice Agent Backend (port 5000)

```bash
cd Backend
pip install -r requirements-voice.txt
python agent.py
```

Verify:
```bash
curl http://localhost:5000/health
```

### 3. Frontend

```bash
cd Frontend
npm install
npm run dev
```

Open **http://localhost:3000**

The frontend connects to both backends automatically via the environment variables in `.env.local`. The CV Analyzer proxies through the Next.js API route; the Voice Agent connects directly from the browser.

---

## Notes

- The Flair NER model (`flair/ner-english-large`) is loaded once at `backend_server.py` startup. Do not restart the CV backend between analyses in production — each restart incurs a 20–40s model load.
- The Voice Agent maintains conversation history in memory for the lifetime of the process. Restarting `agent.py` clears session history.
- The `/jds/` directory contains 134 PDF files totalling several MB. These are committed to the repository as static assets and served directly by Next.js at build time.
- Both backends use `CORS(app)` with permissive defaults. Restrict origins in production.
- The Web Speech API used for candidate speech capture is only available in Chromium-based browsers (Chrome, Edge). Firefox is not supported.
