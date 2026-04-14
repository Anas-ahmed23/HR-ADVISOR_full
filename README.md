# HR Advisor — AI Recruitment Intelligence Platform

**HR Advisor** (branded **GradVoice**) is a production-grade AI recruitment platform that unifies two fully integrated hiring workflows: an evidence-based **CV Analyzer** that scores candidate–job description fit across eight weighted dimensions, and a **Voice Agent** that conducts live AI-guided screening interviews with real-time transcription, barge-in interruption support, and structured post-session review. Both workflows share a single dark-premium Next.js 16 frontend and two independent Python Flask backends connected to Azure OpenAI.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [CV Analyzer](#cv-analyzer)
- [ATS Results Dashboard](#ats-results-dashboard)
- [Voice Agent](#voice-agent)
- [Frontend Design System](#frontend-design-system)
- [State Persistence & Gating](#state-persistence--gating)
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
Browser (Next.js 16 · App Router · React 19)
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

**CV Analyzer flow:** The browser uploads a candidate CV and a job description (selected from the 134-role premade library or uploaded directly). The Next.js API route proxies the multipart form to `backend_server.py`, which saves the files and invokes `hr_analyzer.py`. The analyzer runs Flair NER for entity extraction, keyword matching from curated tech/soft/domain dictionaries, then calls Azure GPT-4.1 with a structured JSON prompt template to score and evaluate the candidate across eight dimensions. The complete structured result is forwarded to the frontend, stored in React Context + localStorage (key: `gradvoice_analysis_v1`), and rendered in `ats-dashboard.tsx`.

**Voice Agent flow:** The browser captures speech via the Web Speech API (Chrome/Edge). On final transcript, `http-client.ts` sends the text to `agent.py /chat`. The Flask server calls Azure GPT-4.1 with the full conversation history and optional HR context documents to generate a response. Azure GPT-4o-mini-TTS synthesizes the response to a WAV audio stream, base64-encoded and returned in the JSON payload. The browser decodes and plays the audio; a barge-in window opens mid-playback so the candidate can interrupt naturally.

**State persistence:** Analysis results survive page refresh and navigation. The result is stored in `localStorage` under `gradvoice_analysis_v1`. The Voice Agent is hard-gated behind a completed analysis — accessible only after a valid result is present in context.

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
- **JD mode toggle** — two modes: **Use our library** (default, colour-coded category accordion with live search) and **Upload my own** (custom JD drag-and-drop zone). Switching modes clears the previous selection.
- **Live status strip** — four real-time indicator cards: Candidate CV state, Job Description state, readiness gate, and analysis running state with an animated spinner.

### JD Library Browser

- **Live search** — filters by job title and category simultaneously as the user types; all category groups expand automatically during search.
- **Accordion categories** — 12 colour-coded category groups, each collapsible independently. Each category carries a distinct accent colour and a role count badge.
- **Chip selection** — each job description renders as an inline chip. Selected chips show a checkmark and shift to the category accent colour. Selecting a new chip replaces the previous selection and immediately fetches the corresponding PDF from `/jds/`.
- **Loading state** — while the JD PDF is being fetched, a spinner appears and the status strip reflects the pending state. On fetch error, the selection is cleared and an inline error is surfaced.

### Analyzing View (Multi-Stage Loading)

When an analysis is running (`loading === true`), the upload workspace is replaced by a full-screen `AnalyzingView` component:

- **Orbital ring** — CSS-only animated arc ring with a pulsing Sparkles icon at the centre. Zero JavaScript animation overhead.
- **Stage messages** — six stages that rotate every 7 seconds with a slide-up entrance animation:
  1. Parsing CV and extracting structure…
  2. Identifying hard and soft skills…
  3. Matching against job requirements…
  4. Scoring fit across 8 dimensions…
  5. Generating candidate advice…
  6. Finalising report…
- **Progress bar** — fills smoothly as stages advance (1.4s CSS transition per step).
- **Context chips** — CV filename and selected JD name shown as pill badges so the user always knows what is being analyzed.

---

## ATS Results Dashboard

The full analysis result is rendered in `ats-dashboard.tsx` — a self-contained full-width results view that replaces the upload workspace after a successful analysis run. Results are persisted in localStorage and restored on page refresh with a restore banner.

### Hero Card

- **Score ring** — large animated SVG arc ring showing the overall match percentage with a glow shadow. Ring colour transitions from red (low) through amber to emerald (high) based on score thresholds.
- **Classification badge** — LLM-generated label (e.g. "Strong Match", "Partial Fit", "Not Suitable") alongside an application readiness badge (Ready to Apply / Minor Improvements Needed / Upskilling Required / Not Ready Yet), each with a distinct colour.
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

Three status chips summarising the three most actionable signals:

- **Hard Skills** — pass/fail based on missing skills count
- **Experience** — pass/warn based on experience score (threshold 60%)
- **Education** — pass/warn based on education score (threshold 60%)

### Role Overview

When the LLM returns `job_description_analysis` data, a two-column section renders:

**Left — Role Overview card:** job title, domain pill, seniority pill, job summary paragraph, key requirements list with chevron markers, required technologies as accent-coloured chips.

**Right — Top Strengths & Top Gaps cards:** up to four LLM-identified strengths with checkmark icons (green left border), up to four gaps with X-circle icons (red left border). When the ATS summary is empty, a placeholder note is shown instead.

### Hiring Recommendation

A dedicated full-width card that **always renders** regardless of whether the API returns role overview or ATS summary data. Positioned between the Role Overview and the analysis tabs so it is never missed.

- **Recommendation text** — score-tiered narrative:
  - ≥ 75%: "Strong alignment detected. Proceed to interview and use matched skills as focal talking points."
  - 50–74%: "Moderate alignment. Consider conditional progression with a targeted upskilling plan."
  - < 50%: "Significant gaps exist. Extensive upskilling is recommended before this candidate would be competitive."
- **Action pills** — colour-coded decision badge: `Proceed to interview` (green) / `Conditional progression` (amber) / `Not recommended` (red). Strong matches (≥ 75%) also receive a `Voice screen recommended` violet pill.

### Tabbed Analysis Panel

Four full-width tabs with live count badges — each tab switch triggers a 220ms slide-up fade animation:

**Matched Skills**
Each matched skill is rendered as a card showing the JD requirement, the CV skill found, the match type (exact / synonym / semantic) with a colour-coded badge, and the evidence excerpt quoted from the source documents.

**Missing Skills**
Unmatched requirements rendered as collapsible grouped category cards (when the LLM returns grouped data) or as a flat chip list. Each group is collapsible with chevron toggle and a count badge.

**Candidate Advice**
Four subsections: overall advice paragraph, priority improvements (ranked numbered cards with action + reason), CV improvements list, learning recommendations list, and interview tips list.

Smart fallback system: when the LLM returns empty advice fields, the system auto-derives contextual priority improvements from the actual score data — surfacing gaps count, experience score weakness, resume quality issues, and fit level as structured action items. The tab always shows actionable content.

**Insights**
Strengths, gaps, and recommendations rendered as bullet lists with colour-coded dot markers.

### Actions

- **New Analysis** (`ats-btn-primary`) — resets all state and returns to the upload workspace. Has `scale(0.97)` active press feedback.
- **Export PDF** (`ats-btn-secondary`) — generates a structured A4 PDF via jsPDF including: cover block, overall score box with progress bars, score breakdown, matched skills with evidence, missing skills, candidate advice with priorities, and footer with page numbers. Shows "Exporting…" with a pulse animation and is disabled during generation. Filename: `hr-advisor-{job-title}-{timestamp}.pdf`.

---

## Voice Agent

### Access Gate

The Voice Agent is hard-locked behind a completed CV analysis at three layers:

1. **Navigation bar** (`nav-bar.tsx`) — the Voice Agent nav link renders as a `cursor-not-allowed` span with a Lock icon when no valid analysis result is present in context.
2. **Home page CTA** (`voice-agent-cta.tsx`) — the "Try Voice Agent" button on the home page is replaced with a locked span when no analysis is complete.
3. **Route guard** (`app/voice-agent/page.tsx`) — even if a user navigates directly to `/voice-agent`, the page renders a full locked screen explaining the requirement and providing a direct link to the CV Analyzer.

### Session Controls Panel

**Pre-session state**
- Workflow step indicator (Setup → Interview → Review) with colour-coded state badges
- Readiness cards: expected behaviours and setup notes (backend availability, browser requirements, mic permission)
- Primary CTA button disabled until speech recognition is confirmed supported in the browser

**Connecting state**
- Animated spinner with status message while `http-client.ts` performs the `/health` check and the Web Speech API initialises

**Active call state**
- **Waveform Visualizer** — animated waveform (`WaveformVisualizer.tsx`) switching between listening and speaking variants based on current AI state
- **Candidate input panel** — shows live interim transcript updating word-by-word, falling back to the last confirmed utterance
- **Session activity panel** — reflects AI state: processing, speaking, or idle with the last AI response text
- **State grid** — three mini cards: Mic state, AI state, Capture state
- **Mute/unmute button** — toggles speech recognition while keeping the session open
- **End session button** — gracefully terminates the call, stops audio playback, disconnects from backend, transitions to completed state

**Completed state**
- Animates in with `animate-fade-in-up` entrance when session ends
- Session overview summary auto-generated from transcript data
- Recommended next-step card derived from transcript quality signals
- Quick-access buttons to Transcript and AI Insights tabs
- New Session button resets all state for a fresh call

### Review Panel

**Transcript tab** — full conversation as speaker-labelled bubbles (violet = Candidate, cyan = AI). System fragments filtered. Live "Candidate speaking" bubble during active recognition.

**AI Insights tab** — three computed insight cards derived from transcript content, updated live:
- Communication Clarity (from average response word count)
- Ownership Signals (counts strong ownership verbs: led, built, owned, improved, etc.)
- Role-fit Topics (detects which of four topic clusters surfaced: Technical depth, Delivery ownership, Collaboration, Problem solving)

Additional: detected topics as pills, recruiter review checklist.

**Summary tab** — auto-generated post-session summary including session overview, recruiter recommendation, top strengths, top concern, and recruiter notes. Keyed on `hasCompletedSession` — when the session ends and the tab auto-switches to Summary, the content re-mounts and plays a 500ms `animate-result-in` entrance animation.

### Barge-in System

Two-phase architecture to prevent AI audio echo-looping into speech recognition:

1. **Lockout phase (1500ms)** — speech recognition is suppressed immediately after AI audio starts.
2. **Barge-in window** — after 1500ms, recognition restarts while audio plays. If the candidate produces >500ms of continuous speech, an interrupt signal is sent to `agent.py /interrupt`, playback stops, and the turn transfers back to the candidate.
3. **Natural end** — when AI audio finishes without interruption, recognition resumes after a 400ms echo-tail buffer.

All barge-in timers are cleaned up on session end, mute toggle, and component unmount.

### Stats Strip

Four stat cards shown above the workspace:
- **Session** — Live / Done / Ready
- **Turns** — total transcript entries with candidate/AI breakdown
- **Topics** — detected topic cluster count with first topic name
- **Progress** — percentage bar (18% base → +8% per turn → 100% on completion)

---

## Frontend Design System

### Colour Tokens

| Token | Value |
|---|---|
| Page background | `#05050b` deep navy with radial gradient overlays |
| Primary accent | Violet `#7A4DFF` |
| Secondary accent | Cyan `#06b6d4` |
| Success | Emerald `#34d399` |
| Warning | Amber `#fbbf24` |
| Error | Red `#f87171` |
| Card surface | `rgba(255,255,255,0.025)` with `border: rgba(255,255,255,0.07)` |
| Border radius | `16px` inner panels, `24–28px` primary panels |
| Typography | Geist / Geist Fallback, `tracking-[-0.04em]` headings |

### Animation System (`app/globals.css`)

| Class | Behaviour |
|---|---|
| `.animate-result-in` | 500ms slide-up fade — results view and voice summary panel entrance |
| `.animate-fade-in-up` | 600ms slide-up — voice completed panel entrance |
| `.animate-stage-in` | 260ms slide-up — stage message rotation in AnalyzingView |
| `.animate-shimmer` | Continuous gradient sweep — skeleton loading |
| `.animate-orbit` | Continuous 0.9s rotation — AnalyzingView orbital ring |
| `.animate-pulse-icon` | 2s opacity breath — AnalyzingView centre icon |
| `.interactive-press` | `scale(0.97) opacity(0.88)` on `:active` — all interactive buttons |
| `ats-tab-content` | 220ms slide-up — ATS tab switch transition |
| `ats-btn-primary/secondary` | `scale(0.97)` active press — ATS action buttons |
| `ats-exporting` | Pulse animation + `pointer-events: none` — export loading state |

All decorative animations are disabled when `prefers-reduced-motion: reduce` is set.

### Component Architecture

- **`ProductShell`** — full-page wrapper with sticky navigation header and footer. Server Component; accepts `currentPath` for active nav state.
- **`ProductPanel`** — glassmorphism card primitive with rounded corners and translucent border.
- **`NavBar`** (`nav-bar.tsx`) — client component; locks the Voice Agent nav link via `useAnalysis()` context when no completed analysis exists.
- **`VoiceAgentCTA`** (`voice-agent-cta.tsx`) — client component; renders active or locked Voice Agent CTA on the home page.
- **`WaveformVisualizer`** — animated waveform switching between listening and speaking states.
- **`DropZone`** — drag-and-drop file input with dragging/filled/empty visual states and accent colour theming.
- **`Ring`** — animated SVG arc score ring with glow shadow, inner label, and smooth CSS transition on value change.
- **`ScoreBar`** — labelled progress bar with gradient fill and glow.
- **UI primitives** — full shadcn/ui library (Button, Tabs, TabsList, TabsTrigger, TabsContent, and 60+ additional components).

### Pages

| Route | Description |
|---|---|
| `/` | Hero, stats strip, bento features grid (3-row, gap-free), how it works, product showcase, outcomes, CTA |
| `/analyzer` | CV upload workspace with JD library picker and live status strip; AnalyzingView during analysis; transitions to full ATS dashboard post-analysis |
| `/voice-agent` | Locked screen if no analysis complete; otherwise: session stats strip, session controls with waveform, three-tab review panel |

---

## State Persistence & Gating

Analysis results are stored in `context/analysis-context.tsx` using React Context backed by `localStorage` (key: `gradvoice_analysis_v1`).

**`isValidResult(data)`** — validates a result as non-null by checking `evaluation_result.final_score` (number) OR top-level `final_score` (number). Only valid results are persisted.

**On mount** — `AnalysisProvider` restores the last valid result from localStorage, making it immediately available to all child components. The CV Analyzer detects an existing result on mount and shows a restore banner: `"Previous analysis restored from your last session."` with a Clear & start fresh action.

**`isComplete`** — derived boolean (`result !== null`). Used by `NavBar`, `VoiceAgentCTA`, and the `/voice-agent` page guard to lock or unlock the Voice Agent workflow.

**On new analysis** — `clearResult()` is called before the API request, wiping localStorage and context. On success, `setResult(data)` re-validates and re-persists.

**Scroll behaviour** — when a fresh analysis result arrives (not a restored one), `window.scrollTo({ top: 0, behavior: "smooth" })` fires automatically so the results are immediately visible at the top of the page.

---

## Backend — CV Analysis Engine

**File:** `Backend/hr_analyzer.py`

### Text Extraction

Supports PDF (via `pdfplumber`), DOCX (via `python-docx`), and TXT files. Handles both file paths and raw text strings. Page content is concatenated for multi-page PDFs.

### Entity Extraction

**Flair NER** (`flair/ner-english-large`) — loaded once at server startup. Runs named entity recognition over both CV and JD text. The tagger runs on `Sentence` objects constructed from the document text.

**Keyword matching** — three curated dictionaries (`TECH_SKILLS`, `SOFT_SKILLS`, `DOMAIN_SKILLS`) covering:
- Technical: 11 sub-categories (programming languages, frontend/backend frameworks, databases, cloud platforms, DevOps tools, testing tools, data analytics, ML/AI, APIs, security)
- Soft skills: 7 sub-categories (communication, collaboration, leadership, problem solving, organisation, adaptability, customer focus)
- Domain: finance, healthcare, retail, education, HR, and more

### LLM Scoring

A structured JSON prompt template is sent to Azure GPT-4.1. Output schema:

| Field | Contents |
|---|---|
| `metadata` | document type, candidate/job IDs, job title, source, timestamp |
| `evaluation_result` | classification, final score (0–1), readiness, headline, short verdict |
| `ats_summary` | headline, short verdict, top 5 strengths, top 5 gaps |
| `job_description_analysis` | job title, summary, requirements, responsibilities, tools, domain, seniority |
| `score_breakdown` | eight float scores: skill, experience, education, soft skill, responsibility, domain, impact, resume quality |
| `matched_skills` | array: `jd_skill`, `cv_skill`, `match_type`, `evidence`, `confidence` |
| `missing_skills` | flat array of unmatched JD requirements |
| `missing_skills_grouped` | missing skills organised into named category groups |
| `candidate_advice` | `overall_advice`, `priority_improvements` (rank, action, reason), `cv_improvements`, `learning_recommendations`, `interview_tips` |
| `insights` | `strengths`, `gaps`, `recommendations` |
| `voice_agent_facts` | structured fact records for voice agent RAG context |
| `retrieval_chunks` | content chunks with keywords for vector retrieval |

### Post-processing

After LLM response parsing, a normalisation pass ensures: all required fields present with sensible defaults, scores clamped to 0–1, job title inferred from headline when missing, matched/missing skills deduplicated. Invalid JSON is handled with a regex extraction fallback.

---

## Backend — Voice Agent Server

**File:** `Backend/agent.py`

### Session Management

Maintains a persistent conversation history list in memory (one history per server process). Each `/chat` request appends the user turn and assistant response. History is prepended with a system prompt configuring the AI as an HR screening agent with optional HR context documents.

### HR Context Loading

At server startup, if `VOICE_CONTEXT_JSON` is set, the agent loads the JSON file and formats the voice agent facts into a natural-language context block. If `VOICE_CONTEXT_PDFS` is set, each PDF is read via `pypdf` and appended up to `VOICE_CONTEXT_PDF_MAX_CHARS` per document and `VOICE_CONTEXT_MAX_CHARS` total. This allows the voice agent to answer candidate-specific questions grounded in the actual CV analysis output.

### Speech-to-Text

Audio input (base64-encoded WAV) is decoded, written to a temp file, and submitted to Azure GPT-4o-Transcribe via direct HTTP POST. Authentication uses the `api-key` header (Azure OpenAI REST standard). The transcription model, API version, language hint, and prompt are all configurable via environment variables.

### Text-to-Speech

The LLM response is submitted to Azure GPT-4o-mini-TTS via HTTP POST with the `api-key` header and `Content-Type: application/json`. Voice is configurable (`AZURE_TTS_VOICE`, default `alloy`). Audio bytes are returned as a WAV stream, base64-encoded in the `/chat` response payload. Unicode normalisation and text sanitisation are applied before synthesis to prevent encoding errors.

### Health Check

`GET /health` returns `HTTP 200` when all Azure credentials are configured and `HTTP 503` when any credential is missing. The frontend `http-client.ts` uses the HTTP status code — not just response body — to determine connectivity, ensuring the "Connected" state is never shown when credentials are absent.

### CORS

`CORS(app)` applied at the Flask app level with permissive defaults to allow the Next.js dev server and production frontend to communicate without preflight failures.

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
| `GET` | `/health` | — | `{ "status": "healthy\|missing_config", ... }` · `200` or `503` |
| `GET` | `/status` | — | `{ "llm_deployment", "tts_voice", "context_chars" }` |
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
│   └── uploads/                   # Temp file storage for analysis runs (auto-created)
│
└── Frontend/
    ├── app/
    │   ├── layout.tsx             # Root layout — AnalysisProvider, Geist font
    │   ├── page.tsx               # Home page — hero, bento grid, how it works, CTA
    │   ├── globals.css            # Global CSS, animation keyframes and utility classes
    │   ├── analyzer/
    │   │   └── page.tsx           # /analyzer — mounts CVAnalyzer component
    │   ├── voice-agent/
    │   │   ├── layout.tsx         # Voice agent metadata wrapper
    │   │   └── page.tsx           # Full voice agent workspace (with access guard)
    │   └── api/
    │       └── analyze_cv/
    │           └── route.ts       # Next.js API route — proxy to backend_server.py
    │
    ├── components/
    │   ├── product-shell.tsx      # ProductShell + ProductPanel — shared layout primitives
    │   ├── nav-bar.tsx            # Client NavBar — locks Voice Agent link when no result
    │   ├── voice-agent-cta.tsx    # Client CTA — active or locked Voice Agent button
    │   ├── cv-analyzer.tsx        # Upload workspace, JD library, AnalyzingView
    │   ├── ats-dashboard.tsx      # Full ATS results dashboard (post-analysis)
    │   ├── WaveformVisualizer.tsx # Animated audio waveform for voice sessions
    │   └── ui/                    # shadcn/ui component library (60+ primitives)
    │
    ├── context/
    │   └── analysis-context.tsx   # React Context + localStorage persistence
    │                              #   Exports: result, isComplete, setResult, clearResult
    │
    ├── types/
    │   └── analysis.ts            # Shared TypeScript types for analysis data structures
    │
    ├── lib/
    │   ├── http-client.ts         # HTTPClient — voice agent API + audio playback
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
| Azure OpenAI (STT) | `gpt-4o-transcribe` | `agent.py` | Speech → text transcription |
| Azure OpenAI (TTS) | `gpt-4o-mini-tts` | `agent.py` | Text → WAV audio synthesis |

The LLM is accessed through the OpenAI Python SDK with Azure configuration. STT and TTS are accessed via direct HTTP POST requests using the `api-key` header (Azure OpenAI REST standard). All credentials are loaded from `Backend/.env` via `python-dotenv`.

---

## Environment Variables

### `Backend/.env`

```env
# ── CV Analysis backend (backend_server.py — port 5001) ──────────────────────
CV_SERVER_PORT=5001
HR_AZURE_OPENAI_API_KEY=your_key
HR_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
HR_AZURE_OPENAI_DEPLOYMENT=gpt-4.1
HR_AZURE_OPENAI_API_VERSION=2024-12-01-preview

# ── Azure OpenAI (LLM — voice agent) ─────────────────────────────────────────
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4.1
AZURE_OPENAI_API_VERSION=2025-01-01-preview

# ── Azure STT (GPT-4o-Transcribe) ────────────────────────────────────────────
AZURE_TRANSCRIBE_API_KEY=your_key
AZURE_TRANSCRIBE_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe
AZURE_TRANSCRIBE_API_VERSION=2025-03-01-preview
AZURE_TRANSCRIBE_LANGUAGE=en
AZURE_TRANSCRIBE_PROMPT=The speaker is speaking English.

# ── Azure TTS (GPT-4o-mini-TTS) ──────────────────────────────────────────────
AZURE_TTS_API_KEY=your_key
AZURE_TTS_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_TTS_DEPLOYMENT=gpt-4o-mini-tts
AZURE_TTS_API_VERSION=2025-03-01-preview
AZURE_TTS_VOICE=alloy

# ── Server config ─────────────────────────────────────────────────────────────
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
DEBUG=true

# ── Voice agent HR context (optional) ────────────────────────────────────────
# Load candidate analysis output and source documents into the voice agent's
# system context. The agent will use these to answer role-specific questions
# during live screening sessions.
# VOICE_CONTEXT_JSON=path/to/analysis_output.json
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

Verify (expect `HTTP 200` and `"status": "healthy"` when all Azure credentials are set):
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

The frontend connects to both backends via the environment variables in `.env.local`. The CV Analyzer proxies through the Next.js API route; the Voice Agent connects directly from the browser to `localhost:5000`.

---

## Notes

- The Flair NER model (`flair/ner-english-large`) is loaded once at `backend_server.py` startup. Do not restart the CV backend between analyses in production — each restart incurs a 20–40 second model load penalty.
- The Voice Agent maintains conversation history in memory for the lifetime of the process. Restarting `agent.py` clears session history.
- The `/jds/` directory contains 134 PDF files totalling several MB. These are committed to the repository as static assets and served directly by Next.js at build time.
- Azure STT and TTS endpoints use the `api-key` HTTP header (not `Authorization: Bearer`). This is the Azure OpenAI REST API standard and distinct from generic OAuth bearer tokens.
- The `/health` endpoint returns `HTTP 503` when Azure credentials are incomplete, allowing the frontend to correctly surface a "Cannot connect" error rather than falsely reporting a successful connection.
- The Web Speech API used for candidate speech capture is only available in Chromium-based browsers (Chrome, Edge). Firefox is not supported.
- Both backends use `CORS(app)` with permissive defaults. Restrict origins in production deployments.
- Analysis results persist in `localStorage` under the key `gradvoice_analysis_v1`. Clearing site data or calling `clearResult()` removes the stored result and re-locks the Voice Agent.
