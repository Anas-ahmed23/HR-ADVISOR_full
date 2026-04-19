#!/usr/bin/env python3
"""Flask Voice Agent Server — Azure GPT-4o Transcribe · Azure OpenAI GPT-4.1 · Azure GPT-4o-mini TTS.

Serves the HR Advisor frontend voice-agent page over HTTP.
Endpoints used by the frontend (http-client.ts):
  GET  /health          — liveness / readiness check
  GET  /status          — detailed service status
  POST /chat            — text_input or audio_base64 → text_response + audio_base64
  POST /transcribe      — audio → transcribed_text only
  POST /synthesize      — text  → audio_base64 only
  GET  /speaking_status — barge-in / speaking state
  POST /interrupt       — barge-in signal
"""

from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
import sys
import tempfile
import threading
import unicodedata
import uuid
import wave
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import AzureOpenAI

# ── Load .env ──────────────────────────────────────────────────────────────
load_dotenv()

# ── Audio constants ────────────────────────────────────────────────────────
SAMPLE_RATE  = 16000
CHANNELS     = 1
SAMPLE_WIDTH = 2

# ── Azure OpenAI (chat / LLM) ──────────────────────────────────────────────
AZURE_OPENAI_API_KEY    = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT   = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")

# ── Azure STT (transcription) ──────────────────────────────────────────────
AZURE_TRANSCRIBE_API_KEY    = os.getenv("AZURE_TRANSCRIBE_API_KEY")
AZURE_TRANSCRIBE_ENDPOINT   = os.getenv("AZURE_TRANSCRIBE_ENDPOINT")
AZURE_TRANSCRIBE_DEPLOYMENT = os.getenv("AZURE_TRANSCRIBE_DEPLOYMENT", "gpt-4o-transcribe")
AZURE_TRANSCRIBE_API_VERSION = os.getenv("AZURE_TRANSCRIBE_API_VERSION", "2025-03-01-preview")
AZURE_TRANSCRIBE_LANGUAGE   = os.getenv("AZURE_TRANSCRIBE_LANGUAGE", "en")
AZURE_TRANSCRIBE_PROMPT     = os.getenv("AZURE_TRANSCRIBE_PROMPT", "")

# ── Azure TTS ──────────────────────────────────────────────────────────────
AZURE_TTS_API_KEY    = os.getenv("AZURE_TTS_API_KEY")
AZURE_TTS_ENDPOINT   = os.getenv("AZURE_TTS_ENDPOINT")
AZURE_TTS_DEPLOYMENT = os.getenv("AZURE_TTS_DEPLOYMENT", "gpt-4o-mini-tts")
AZURE_TTS_API_VERSION = os.getenv("AZURE_TTS_API_VERSION", "2025-03-01-preview")
AZURE_TTS_VOICE      = os.getenv("AZURE_TTS_VOICE", "alloy")

# ── Server ─────────────────────────────────────────────────────────────────
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "5000"))
DEBUG       = os.getenv("DEBUG", "true").lower() == "true"

# ── Voice context (HR candidate / JD documents) ────────────────────────────
VOICE_CONTEXT_JSON         = os.getenv("VOICE_CONTEXT_JSON", "")
VOICE_CONTEXT_PDFS_RAW     = os.getenv("VOICE_CONTEXT_PDFS", "")
VOICE_CONTEXT_PDFS         = [p.strip() for p in VOICE_CONTEXT_PDFS_RAW.split(",") if p.strip()]
VOICE_CONTEXT_PDF_MAX_CHARS = int(os.getenv("VOICE_CONTEXT_PDF_MAX_CHARS", "12000"))
VOICE_CONTEXT_MAX_CHARS    = int(os.getenv("VOICE_CONTEXT_MAX_CHARS", "30000"))

# ── Optional PDF support ───────────────────────────────────────────────────
try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None  # type: ignore[assignment,misc]

_ALLOWED_TTS = set(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,;:!?'-"
)


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def log(msg: str) -> None:
    if DEBUG:
        print(msg)


def _strip_markdown(text: str) -> str:
    text = re.sub(r"[*_~`>|#^]+", " ", text)
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", text)
    return text


def _remove_unsupported(text: str) -> str:
    buf = []
    for ch in text:
        if ch in _ALLOWED_TTS:
            buf.append(ch)
        elif unicodedata.category(ch).startswith("Z"):
            buf.append(" ")
    return re.sub(r"\s+", " ", "".join(buf)).strip()


def sanitize_tts_text(text: str) -> str:
    s = _strip_markdown(text or "")
    s = _remove_unsupported(s)
    return s if len(s) >= 5 else "Okay."


def _normalize_context_text(text: str) -> str:
    cleaned = unicodedata.normalize("NFKC", text or "")
    cleaned = cleaned.replace("\u200b", " ").replace("\ufeff", " ").replace("\u00a0", " ")
    cleaned = cleaned.translate(str.maketrans({"–": "-", "—": "-", "−": "-"}))
    return re.sub(r"\s+", " ", cleaned).strip()


def _compact_text(text: str, limit: int) -> str:
    cleaned = _normalize_context_text(text)
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: max(0, limit - 3)].rstrip() + "..."


def _list_values(values: Any, max_items: int = 8) -> str:
    if not isinstance(values, list):
        return ""
    return ", ".join([str(v).strip() for v in values if str(v).strip()][:max_items])


def _build_transcribe_url() -> str:
    if not AZURE_TRANSCRIBE_ENDPOINT:
        raise RuntimeError("AZURE_TRANSCRIBE_ENDPOINT is not set.")
    base = AZURE_TRANSCRIBE_ENDPOINT.rstrip("/")
    if "/openai/deployments/" in base:
        return base if "api-version=" in base else f"{base}?api-version={AZURE_TRANSCRIBE_API_VERSION}"
    return (
        f"{base}/openai/deployments/{AZURE_TRANSCRIBE_DEPLOYMENT}"
        f"/audio/transcriptions?api-version={AZURE_TRANSCRIBE_API_VERSION}"
    )


def _build_tts_url() -> str:
    if not AZURE_TTS_ENDPOINT:
        raise RuntimeError("AZURE_TTS_ENDPOINT is not set.")
    base = AZURE_TTS_ENDPOINT.rstrip("/")
    if "/openai/deployments/" in base:
        return base if "api-version=" in base else f"{base}?api-version={AZURE_TTS_API_VERSION}"
    return (
        f"{base}/openai/deployments/{AZURE_TTS_DEPLOYMENT}"
        f"/audio/speech?api-version={AZURE_TTS_API_VERSION}"
    )


# ══════════════════════════════════════════════════════════════════════════════
# HR CONTEXT PACK  (loaded once, cached for all turns)
# ══════════════════════════════════════════════════════════════════════════════

_context_pack_cache: Optional[str] = None


def _pdf_excerpt(path: Path, limit: int = 12000) -> str:
    if PdfReader is None or not path.exists():
        return ""
    try:
        reader = PdfReader(str(path))
        pages = [page.extract_text() or "" for page in reader.pages]
        return _compact_text(" ".join(pages), limit)
    except Exception as exc:
        log(f"[CTX] Failed to read PDF '{path.name}': {exc}")
        return ""


def _build_context_pack() -> str:
    """Build a compact context block from optional JSON + PDF documents."""
    sections: list[str] = []

    # ── JSON context ──────────────────────────────────────────────────────
    payload: dict = {}
    if VOICE_CONTEXT_JSON:
        json_path = Path(VOICE_CONTEXT_JSON)
        if json_path.exists():
            try:
                payload = json.loads(json_path.read_text(encoding="utf-8"))
            except Exception as exc:
                log(f"[CTX] Failed to parse '{json_path.name}': {exc}")
        else:
            log(f"[CTX] JSON context file not found: {json_path}")

    if isinstance(payload, dict) and payload:
        metadata    = payload.get("metadata", {})
        result      = payload.get("evaluation_result", {})
        ats         = payload.get("ats_summary", {})
        voice_facts = payload.get("voice_agent_facts", [])

        if isinstance(metadata, dict) and metadata:
            sections.append(
                "Document Metadata: " + _compact_text(
                    f"type={metadata.get('document_type','')}, "
                    f"job_title={metadata.get('job_title','')}, "
                    f"language={metadata.get('language','')}",
                    260,
                )
            )
        if isinstance(result, dict) and result:
            sections.append(
                "Evaluation: " + _compact_text(
                    f"classification={result.get('classification','')}, "
                    f"score={result.get('final_score','')}, "
                    f"readiness={result.get('application_readiness','')}, "
                    f"headline={result.get('headline','')}",
                    520,
                )
            )
        if isinstance(ats, dict) and ats:
            sections.append("ATS Headline: " + _compact_text(str(ats.get("headline", "")), 220))
            sections.append("ATS Verdict: "  + _compact_text(str(ats.get("short_verdict", "")), 500))
            strengths = _list_values(ats.get("top_strengths", []), max_items=6)
            gaps      = _list_values(ats.get("top_gaps", []),      max_items=8)
            if strengths:
                sections.append("Top Strengths: " + strengths)
            if gaps:
                sections.append("Top Gaps: " + gaps)

        hard_skills     = _list_values(payload.get("cv_skills_hard", []),  max_items=10)
        required_skills = _list_values(payload.get("jd_skills_hard", []),  max_items=12)
        if hard_skills:
            sections.append("Candidate Hard Skills: " + hard_skills)
        if required_skills:
            sections.append("Job Required Skills: " + required_skills)

        if isinstance(voice_facts, list) and voice_facts:
            fact_lines = []
            for fact in voice_facts[:8]:
                if not isinstance(fact, dict):
                    continue
                qforms   = fact.get("question_forms", [])
                question = qforms[0] if isinstance(qforms, list) and qforms else fact.get("fact_type", "fact")
                answer   = _compact_text(str(fact.get("answer", "")), 260)
                if question and answer:
                    fact_lines.append(f"Q: {question} A: {answer}")
            if fact_lines:
                sections.append("Voice Facts: " + " | ".join(fact_lines))

    # ── PDF context ───────────────────────────────────────────────────────
    for pdf_name in VOICE_CONTEXT_PDFS:
        excerpt = _pdf_excerpt(Path(pdf_name), limit=VOICE_CONTEXT_PDF_MAX_CHARS)
        if excerpt:
            sections.append(f"PDF Text ({pdf_name}): {excerpt}")

    if not sections:
        return ""

    return _compact_text("\n".join(sections), VOICE_CONTEXT_MAX_CHARS)


def get_context_pack() -> str:
    global _context_pack_cache
    if _context_pack_cache is None:
        _context_pack_cache = _build_context_pack()
        log(f"[CTX] Context pack loaded ({len(_context_pack_cache)} chars).")
    return _context_pack_cache


# ══════════════════════════════════════════════════════════════════════════════
# LLM  (Azure OpenAI)
# ══════════════════════════════════════════════════════════════════════════════

_llm_client: Optional[AzureOpenAI] = None


def get_llm_client() -> Optional[AzureOpenAI]:
    global _llm_client
    if _llm_client:
        return _llm_client
    if not AZURE_OPENAI_API_KEY or not AZURE_OPENAI_ENDPOINT:
        return None
    try:
        _llm_client = AzureOpenAI(
            api_key=AZURE_OPENAI_API_KEY,
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_version=AZURE_OPENAI_API_VERSION,
        )
    except Exception as exc:
        print(f"[ERR] Failed to init Azure OpenAI client: {exc}")
        _llm_client = None
    return _llm_client


def _is_detailed_query(text: str) -> bool:
    """Detect when the user wants a full list-style answer."""
    markers = (
        "requirements", "all requirements", "list", "full", "in detail",
        "details", "everything", "all skills", "what are the requirements",
        "responsibilities", "qualifications",
    )
    return any(m in text.lower() for m in markers)


def llm_reply(user_text: str) -> str:
    client = get_llm_client()
    if not client:
        return "(LLM unavailable — check AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT)"

    context_pack  = get_context_pack()
    wants_detail  = _is_detailed_query(user_text)
    length_rule   = (
        "For detailed/list questions, provide a complete concise list from context "
        "(up to 8 short bullet points)."
        if wants_detail
        else "Keep responses short and spoken-friendly (at most 2 short sentences, ≤220 characters)."
    )
    max_tokens = 300 if wants_detail else 120

    system_prompt = (
        "You are an HR voice assistant conducting or supporting a candidate screening interview. "
        "Use the provided CONTEXT PACK as your primary source of information about the candidate and role. "
        "Use PDF Text sections to answer detailed CV/JD questions such as professional experience. "
        "Do not refuse when the answer is present but phrased oddly due to document formatting. "
        "If the answer is truly absent from context, say: "
        "\"I don't have that detail in the provided documents.\" "
        f"{length_rule} "
        "Avoid emojis and markdown."
    )

    messages = [{"role": "system", "content": system_prompt}]
    if context_pack:
        messages.append({"role": "system", "content": f"CONTEXT PACK\n{context_pack}"})
    messages.append({"role": "user", "content": user_text})

    try:
        response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=messages,
            max_completion_tokens=max_tokens,
        )
        return (response.choices[0].message.content or "(empty response)").strip()
    except Exception as exc:
        print(f"[LLM] Error: {exc}")
        return "(llm_error)"


# ══════════════════════════════════════════════════════════════════════════════
# STT  (Azure GPT-4o Transcribe)
# ══════════════════════════════════════════════════════════════════════════════

def transcribe_audio(file_path: str, mime_type: str = "audio/wav") -> str:
    api_key = AZURE_TRANSCRIBE_API_KEY or os.getenv("AZURE_API_KEY") or AZURE_OPENAI_API_KEY
    if not api_key:
        raise RuntimeError(
            "Transcription disabled: set AZURE_TRANSCRIBE_API_KEY, AZURE_API_KEY, or AZURE_OPENAI_API_KEY."
        )
    url = _build_transcribe_url()
    log(f"[STT] POST {url}")
    headers = {"api-key": api_key}
    data    = {
        "model":    AZURE_TRANSCRIBE_DEPLOYMENT,
        "language": AZURE_TRANSCRIBE_LANGUAGE,
    }
    prompt_hint = (AZURE_TRANSCRIBE_PROMPT or "").strip()
    if prompt_hint:
        data["prompt"] = prompt_hint
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f, mime_type)}
        resp  = requests.post(url, headers=headers, data=data, files=files, timeout=90)
    try:
        resp.raise_for_status()
    except Exception as exc:
        raise RuntimeError(f"Azure STT error {resp.status_code}: {resp.text}") from exc
    text = (resp.json().get("text") or "").strip()
    if prompt_hint:
        normalized_text = re.sub(r"\s+", " ", text.lower()).strip(" .,!?:;")
        normalized_prompt = re.sub(r"\s+", " ", prompt_hint.lower()).strip(" .,!?:;")
        if normalized_text and normalized_text == normalized_prompt:
            return ""
    return text


def process_audio_input(
    audio_data: bytes,
    suffix: str = ".wav",
    mime_type: str = "audio/wav",
) -> Tuple[str, str]:
    """Write audio bytes to a temp file, transcribe, return (text, error)."""
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name
        text = transcribe_audio(tmp_path, mime_type=mime_type)
        print(f"[STT] {text!r}")
        return text, ""
    except Exception as exc:
        err = f"STT error: {exc}"
        print(f"[ERR] {err}")
        return "", err
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


def _guess_audio_mime_type(filename: str, fallback: str = "audio/wav") -> str:
    guessed, _ = mimetypes.guess_type(filename)
    if guessed and guessed.startswith("audio/"):
        return guessed
    return fallback


# ══════════════════════════════════════════════════════════════════════════════
# TTS  (Azure GPT-4o-mini TTS)
# ══════════════════════════════════════════════════════════════════════════════

def synthesize_speech(text: str) -> bytes:
    api_key = AZURE_TTS_API_KEY or os.getenv("AZURE_API_KEY") or AZURE_OPENAI_API_KEY
    if not api_key:
        raise RuntimeError(
            "TTS disabled: set AZURE_TTS_API_KEY, AZURE_API_KEY, or AZURE_OPENAI_API_KEY."
        )
    url = _build_tts_url()
    log(f"[TTS] POST {url}")
    headers = {
        "api-key":      api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "model":  AZURE_TTS_DEPLOYMENT,
        "input":  text,
        "voice":  AZURE_TTS_VOICE,
        "format": "wav",
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=90)
    try:
        resp.raise_for_status()
    except Exception as exc:
        raise RuntimeError(f"Azure TTS error {resp.status_code}: {resp.text}") from exc
    return resp.content


# ══════════════════════════════════════════════════════════════════════════════
# BARGE-IN STATE
# ══════════════════════════════════════════════════════════════════════════════

class BargeInState:
    def __init__(self) -> None:
        self.lock            = threading.Lock()
        self.is_speaking     = False
        self.barge_in_active = False


barge_in_state = BargeInState()


# ══════════════════════════════════════════════════════════════════════════════
# RESPONSE GENERATION  (LLM → TTS)
# ══════════════════════════════════════════════════════════════════════════════

_SYSTEM_FRAGMENTS = frozenset({
    "processing your request", "still processing", "connected!",
    "ready!", "send a message", "disconnected", "conversation ended",
})


def generate_response(user_text: str) -> Dict[str, Any]:
    """Get LLM reply and synthesize TTS audio, respecting barge-in."""
    ai_text = ""
    try:
        with barge_in_state.lock:
            barge_in_state.barge_in_active = False
            barge_in_state.is_speaking     = True

        ai_text = llm_reply(user_text)
        print(f"[LLM] {ai_text!r}")

        # If LLM returned an error sentinel, surface a clean message without TTS
        if ai_text in ("(llm_error)", "(empty response)") or ai_text.startswith("(LLM unavailable"):
            with barge_in_state.lock:
                barge_in_state.is_speaking = False
            return {
                "text_response": "I'm having trouble connecting to my knowledge base right now. Please try again in a moment.",
                "audio_base64": "",
                "error": "",
                "interrupted": False,
            }

        # Barge-in before TTS
        with barge_in_state.lock:
            if barge_in_state.barge_in_active:
                log("[BARGE-IN] Interrupted before TTS")
                return {"text_response": ai_text, "audio_base64": "", "error": "", "interrupted": True}

        safe_text  = sanitize_tts_text(ai_text)
        audio_bytes = synthesize_speech(safe_text)

        # Barge-in during TTS generation
        with barge_in_state.lock:
            if barge_in_state.barge_in_active:
                log("[BARGE-IN] Interrupted during TTS generation")
                return {"text_response": ai_text, "audio_base64": "", "error": "", "interrupted": True}

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        with barge_in_state.lock:
            barge_in_state.is_speaking = False

        return {"text_response": ai_text, "audio_base64": audio_b64, "error": "", "interrupted": False}

    except Exception as exc:
        err = f"Response generation failed: {exc}"
        print(f"[ERR] {err}")
        with barge_in_state.lock:
            barge_in_state.is_speaking = False
        return {"text_response": ai_text or "An error occurred.", "audio_base64": "", "error": err, "interrupted": False}


# ══════════════════════════════════════════════════════════════════════════════
# FLASK APP
# ══════════════════════════════════════════════════════════════════════════════

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB


@app.route("/health", methods=["GET"])
def health_check():
    configured = all([
        AZURE_OPENAI_API_KEY,
        AZURE_OPENAI_ENDPOINT,
        AZURE_TRANSCRIBE_API_KEY or AZURE_OPENAI_API_KEY,
        AZURE_TRANSCRIBE_ENDPOINT,
        AZURE_TTS_API_KEY or AZURE_OPENAI_API_KEY,
        AZURE_TTS_ENDPOINT,
    ])
    payload = {
        "status":           "healthy" if configured else "missing_config",
        "azure_configured": configured,
        "llm_loaded":       _llm_client is not None,
        "stt_available":    bool(AZURE_TRANSCRIBE_API_KEY or AZURE_OPENAI_API_KEY),
        "tts_available":    bool(AZURE_TTS_API_KEY or AZURE_OPENAI_API_KEY),
        "context_loaded":   bool(_context_pack_cache),
    }
    return jsonify(payload), (200 if configured else 503)


@app.route("/status", methods=["GET"])
def status():
    return jsonify({
        "server":          "HR Advisor Voice Agent (Azure)",
        "status":          "running",
        "llm_deployment":  AZURE_OPENAI_DEPLOYMENT,
        "stt_deployment":  AZURE_TRANSCRIBE_DEPLOYMENT,
        "tts_deployment":  AZURE_TTS_DEPLOYMENT,
        "tts_voice":       AZURE_TTS_VOICE,
        "context_chars":   len(_context_pack_cache) if _context_pack_cache else 0,
    })


@app.route("/speaking_status", methods=["GET"])
def speaking_status():
    with barge_in_state.lock:
        return jsonify({
            "is_speaking":     barge_in_state.is_speaking,
            "barge_in_active": barge_in_state.barge_in_active,
        })


@app.route("/interrupt", methods=["POST"])
def interrupt():
    try:
        with barge_in_state.lock:
            barge_in_state.barge_in_active = True
            barge_in_state.is_speaking     = False
        log("[BARGE-IN] Interrupt received from client")
        return jsonify({"status": "interrupted", "message": "Audio playback stopped"})
    except Exception as exc:
        return jsonify({"error": f"Interrupt failed: {exc}"}), 500


@app.route("/chat", methods=["POST"])
def chat():
    """
    Main endpoint used by the frontend voice-agent page.
    Accepts: { text_input: str } or { audio_base64: str }
    Returns: { transcribed_text, text_response, audio_base64, should_exit, error }
    """
    if not request.is_json:
        return jsonify({"error": "JSON content type required"}), 400

    data = request.get_json() or {}
    user_text  = ""
    should_exit = False
    error       = ""

    # ── Audio path ─────────────────────────────────────────────────────────
    if data.get("audio_base64"):
        try:
            audio_bytes = base64.b64decode(data["audio_base64"])
            user_text, error = process_audio_input(audio_bytes)
            if error:
                return jsonify({"error": error}), 500
        except Exception as exc:
            return jsonify({"error": f"Audio processing failed: {exc}"}), 400

    # ── Text path ──────────────────────────────────────────────────────────
    elif data.get("text_input"):
        user_text   = data["text_input"]
        should_exit = "exit" in user_text.lower()

    else:
        return jsonify({"error": "Provide 'text_input' or 'audio_base64'"}), 400

    if should_exit:
        return jsonify({
            "transcribed_text": user_text,
            "should_exit":      True,
            "text_response":    "Goodbye!",
            "audio_base64":     "",
            "error":            "",
        })

    result = generate_response(user_text)
    result["transcribed_text"] = user_text
    result["should_exit"]      = False
    return jsonify(result)


@app.route("/transcribe", methods=["POST"])
def transcribe_endpoint():
    """Audio → text only."""
    user_text = ""
    error = ""

    if "audio" in request.files and request.files["audio"].filename:
        audio_file = request.files["audio"]
        audio_data = audio_file.read()
        filename = audio_file.filename or "audio.wav"
        suffix = Path(filename).suffix or ".wav"
        mime_type = (audio_file.mimetype or "audio/wav").split(";")[0]
        if mime_type in {"", "application/octet-stream"}:
            mime_type = _guess_audio_mime_type(filename, fallback="audio/webm")
        user_text, error = process_audio_input(audio_data, suffix=suffix, mime_type=mime_type)
    elif request.is_json:
        body = request.get_json() or {}
        if body.get("audio_base64"):
            audio_data = base64.b64decode(body["audio_base64"])
            suffix = body.get("suffix") or ".wav"
            mime_type = str(body.get("mime_type") or "audio/wav").split(";")[0]
            user_text, error = process_audio_input(audio_data, suffix=suffix, mime_type=mime_type)
        else:
            return jsonify({"error": "Provide 'audio_base64' in JSON"}), 400
    else:
        return jsonify({"error": "Provide 'audio' file or 'audio_base64' in JSON"}), 400
    if error:
        if "Audio file might be corrupted or unsupported" in error:
            return jsonify({
                "transcribed_text": "",
                "should_exit":      False,
                "error":            "",
            })
        return jsonify({"error": error}), 500

    return jsonify({
        "transcribed_text": user_text,
        "should_exit":      "exit" in user_text.lower(),
        "error":            "",
    })


@app.route("/synthesize", methods=["POST"])
def synthesize_endpoint():
    """Text → audio only."""
    if not request.is_json:
        return jsonify({"error": "JSON content type required"}), 400

    data = request.get_json() or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Provide 'text'"}), 400

    result = generate_response(text)
    return jsonify(result)


# ══════════════════════════════════════════════════════════════════════════════
# STARTUP
# ══════════════════════════════════════════════════════════════════════════════

def initialize() -> None:
    print("=== HR Advisor Voice Agent — Azure ===")
    print(f"  LLM : {AZURE_OPENAI_DEPLOYMENT}  ({AZURE_OPENAI_API_VERSION})")
    print(f"  STT : {AZURE_TRANSCRIBE_DEPLOYMENT}  ({AZURE_TRANSCRIBE_API_VERSION})")
    print(f"  TTS : {AZURE_TTS_DEPLOYMENT}  voice={AZURE_TTS_VOICE}")
    print(f"  Host: {SERVER_HOST}:{SERVER_PORT}")

    if not AZURE_OPENAI_API_KEY or not AZURE_OPENAI_ENDPOINT:
        raise RuntimeError("AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT are required.")

    # Eagerly warm up the LLM client and context pack
    get_llm_client()
    ctx = get_context_pack()
    if ctx:
        print(f"  CTX : {len(ctx)} chars loaded from context documents")
    else:
        print("  CTX : no context documents configured (VOICE_CONTEXT_JSON / VOICE_CONTEXT_PDFS)")

    print("\nEndpoints:")
    print("  GET  /health          — liveness check")
    print("  GET  /status          — service details")
    print("  POST /chat            — main voice chat")
    print("  POST /transcribe      — STT only")
    print("  POST /synthesize      — TTS only")
    print("  GET  /speaking_status — barge-in state")
    print("  POST /interrupt       — barge-in signal")
    print("======================================\n")


if __name__ == "__main__":
    try:
        initialize()
        app.run(host=SERVER_HOST, port=SERVER_PORT, debug=False, threaded=True)
    except Exception as exc:
        print(f"[FATAL] {exc}")
        sys.exit(1)
