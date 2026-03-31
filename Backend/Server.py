#!/usr/bin/env python3
"""Flask Server for Conversational Voice Agent with Azure GPT-4o Transcribe, Azure OpenAI ChatGPT 4.1, and Azure GPT-4o-mini TTS."""

from __future__ import annotations

import os
import sys
import tempfile
import uuid
import wave
import base64
import json
import re
import unicodedata
from typing import Dict, Any, Tuple
import threading
import time
from typing import Optional

import numpy as np
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import AzureOpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ====== CONFIGURATION ======
SAMPLE_RATE = 16000
CHANNELS = 1
SAMPLE_WIDTH = 2

# Azure Configuration
AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY')
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-4.1')
AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION', '2024-12-01-preview')
AZURE_TRANSCRIBE_API_KEY = os.getenv('AZURE_TRANSCRIBE_API_KEY')
AZURE_TRANSCRIBE_ENDPOINT = os.getenv('AZURE_TRANSCRIBE_ENDPOINT')
AZURE_TRANSCRIBE_DEPLOYMENT = os.getenv('AZURE_TRANSCRIBE_DEPLOYMENT', 'gpt-4o-transcribe')
AZURE_TRANSCRIBE_API_VERSION = os.getenv('AZURE_TRANSCRIBE_API_VERSION', '2025-03-01-preview')
AZURE_TTS_API_KEY = os.getenv('AZURE_TTS_API_KEY')
AZURE_TTS_ENDPOINT = os.getenv('AZURE_TTS_ENDPOINT')
AZURE_TTS_DEPLOYMENT = os.getenv('AZURE_TTS_DEPLOYMENT', 'gpt-4o-mini-tts')
AZURE_TTS_API_VERSION = os.getenv('AZURE_TTS_API_VERSION', '2025-03-01-preview')
AZURE_TTS_VOICE = os.getenv('AZURE_TTS_VOICE', 'alloy')

SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "5000"))

DEBUG = True

# ====== GLOBAL CLIENTS ======
llm_client = None

# ====== HELPER FUNCTIONS ======
def log(message: str) -> None:
    if DEBUG:
        print(message)

def write_wav(path: str, pcm_bytes: bytes) -> None:
    """Write PCM bytes to WAV file"""
    with wave.open(path, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(SAMPLE_WIDTH)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm_bytes)

def _strip_markdown(text: str) -> str:
    """Remove markdown formatting from text"""
    text = re.sub(r"[*_~`>|#^]+", " ", text)
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", text)
    return text

def _remove_unsupported(text: str) -> str:
    """Remove unsupported characters for TTS"""
    _ALLOWED = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,;:!?'-")
    buffer = []
    for ch in text:
        if ch in _ALLOWED:
            buffer.append(ch)
        elif unicodedata.category(ch).startswith("Z"):
            buffer.append(" ")
    cleaned = "".join(buffer)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

def sanitize_tts_text(text: str) -> str:
    """Sanitize text for TTS synthesis"""
    sanitized = _strip_markdown(text or "")
    sanitized = _remove_unsupported(sanitized)
    if len(sanitized) < 5:
        sanitized = "Okay."
    return sanitized

def _build_transcribe_url() -> str:
    """Build the Azure GPT-4o Transcribe URL from env, handling both full and base endpoints."""
    if not AZURE_TRANSCRIBE_ENDPOINT:
        raise RuntimeError("AZURE_TRANSCRIBE_ENDPOINT is not set.")

    base = AZURE_TRANSCRIBE_ENDPOINT.rstrip("/")

    if "/openai/deployments/" in base:
        if "api-version=" in base:
            return base
        return f"{base}?api-version={AZURE_TRANSCRIBE_API_VERSION}"

    return (
        f"{base}/openai/deployments/{AZURE_TRANSCRIBE_DEPLOYMENT}"
        f"/audio/transcriptions?api-version={AZURE_TRANSCRIBE_API_VERSION}"
    )
    
def _build_tts_url() -> str:
    """Build the Azure GPT-4o-mini TTS URL from env, handling base or full endpoints."""
    if not AZURE_TTS_ENDPOINT:
        raise RuntimeError("AZURE_TTS_ENDPOINT is not set.")

    base = AZURE_TTS_ENDPOINT.rstrip("/")

    # Case 1: user pasted the full Target URI that already contains /openai/deployments/...
    if "/openai/deployments/" in base:
        if "api-version=" in base:
            return base
        return f"{base}?api-version={AZURE_TTS_API_VERSION}"

    # Case 2: user provided only the base cognitive services endpoint
    return (
        f"{base}/openai/deployments/{AZURE_TTS_DEPLOYMENT}"
        f"/audio/speech?api-version={AZURE_TTS_API_VERSION}"
    )

# ====== STT (Azure GPT-4o Transcribe) ======
def transcribe_audio(file_path: str) -> str:
    """Send audio to Azure GPT-4o Transcribe and return the recognized text."""
    api_key = AZURE_TRANSCRIBE_API_KEY or os.getenv("AZURE_API_KEY") or AZURE_OPENAI_API_KEY
    if not api_key:
        raise RuntimeError(
            "Transcription disabled: set AZURE_TRANSCRIBE_API_KEY or AZURE_API_KEY "
            "or AZURE_OPENAI_API_KEY."
        )

    url = _build_transcribe_url()
    log(f"[STT] POST {url}")

    headers = {"Authorization": f"Bearer {api_key}"}
    data = {"model": AZURE_TRANSCRIBE_DEPLOYMENT}

    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f, "audio/wav")}
        response = requests.post(url, headers=headers, data=data, files=files, timeout=90)

    try:
        response.raise_for_status()
    except Exception as exc:
        raise RuntimeError(f"Azure STT error {response.status_code}: {response.text}") from exc

    payload = response.json()
    text = payload.get("text") or ""
    return text.strip()

# ====== LLM ADAPTER (Azure OpenAI) ======
def initialize_llm_client() -> AzureOpenAI:
    """Initialize Azure OpenAI client."""
    global llm_client
    
    if not AZURE_OPENAI_API_KEY or not AZURE_OPENAI_ENDPOINT:
        raise RuntimeError("Azure OpenAI credentials not configured")
    
    try:
        llm_client = AzureOpenAI(
            api_key=AZURE_OPENAI_API_KEY,
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_version=AZURE_OPENAI_API_VERSION,
        )
        return llm_client
    except Exception as exc:
        raise RuntimeError(f"Failed to initialize Azure OpenAI client: {exc}")

def llm_reply(user_text: str) -> str:
    """Get LLM response from Azure OpenAI."""
    if not llm_client:
        return "(LLM disabled: Azure OpenAI client not initialized)"

    system_prompt = (
        "You are a concise voice assistant. Reply in at most 2 short sentences "
        "(<=220 characters). Avoid emojis and markdown."
    )
    try:
        response = llm_client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
            max_completion_tokens=120,
        )
        message = response.choices[0].message.content
        return (message or "(empty response)").strip()
    except Exception as exc:
        return f"(Request failed: {exc})"

# ====== TTS (Azure GPT-4o-mini TTS) ======
def synthesize_speech(text: str) -> bytes:
    """Call Azure TTS endpoint and return synthesized audio bytes."""
    api_key = AZURE_TTS_API_KEY or os.getenv("AZURE_API_KEY") or AZURE_OPENAI_API_KEY
    if not api_key:
        raise RuntimeError(
            "TTS disabled: set AZURE_TTS_API_KEY or AZURE_API_KEY or AZURE_OPENAI_API_KEY."
        )

    url = _build_tts_url()
    log(f"[TTS] POST {url}")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": AZURE_TTS_DEPLOYMENT,
        "input": text,
        "voice": AZURE_TTS_VOICE,
        "format": "wav",
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=90)

    try:
        resp.raise_for_status()
    except Exception as exc:
        raise RuntimeError(f"Azure TTS error {resp.status_code}: {resp.text}") from exc

    return resp.content

# ====== PROCESSING FUNCTIONS ======
def process_user_input(audio_data: bytes) -> Tuple[str, bool, str]:
    """
    Processes audio input and returns transcription.
    
    Args:
        audio_data: Raw audio bytes in WAV format
        
    Returns:
        Tuple[str, bool, str]: (transcribed_text, should_exit, error_message)
    """
    tmp_path = None
    try:
        # Save audio to temporary file for transcription
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_data)
            tmp_path = temp_file.name
        
        # Transcribe speech to text using Azure
        user_text = transcribe_audio(tmp_path)
        
        print(f"User: {user_text}")
        
        # Check for exit command
        if "exit" in user_text.lower():
            return user_text, True, ""
            
        return user_text, False, ""
        
    except Exception as exc:
        error_msg = f"STT error: {exc}"
        print(f"[ERR] {error_msg}")
        return "", False, error_msg
    finally:
        # Clean up temporary file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

def generate_ai_response(user_text: str) -> Dict[str, Any]:
    """
    Generates AI response and returns both text and audio.
    """
    ai_response = ""
    try:
        # Reset barge-in state at start of new response
        with barge_in_state.lock:
            barge_in_state.barge_in_active = False
            barge_in_state.is_speaking = True
        
        # Get LLM response
        ai_response = llm_reply(user_text)
        print(f"Agent: {ai_response}")
        
        # Check if user interrupted before TTS
        with barge_in_state.lock:
            if barge_in_state.barge_in_active:
                print("[BARGE-IN] Response interrupted before TTS generation")
                return {
                    "text_response": ai_response + " (interrupted)",
                    "audio_base64": "",
                    "error": "",
                    "interrupted": True
                }
        
        # Generate audio file using Azure TTS
        safe_text = sanitize_tts_text(ai_response)
        
        # Synthesize speech
        audio_bytes = synthesize_speech(safe_text)
        
        # Check if user interrupted during TTS generation
        with barge_in_state.lock:
            if barge_in_state.barge_in_active:
                print("[BARGE-IN] Response interrupted during TTS generation")
                return {
                    "text_response": ai_response + " (interrupted)",
                    "audio_base64": "",
                    "error": "",
                    "interrupted": True
                }
        
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # Mark speaking as complete
        with barge_in_state.lock:
            barge_in_state.is_speaking = False
        
        return {
            "text_response": ai_response,
            "audio_base64": audio_base64,
            "error": "",
            "interrupted": False
        }
        
    except Exception as exc:
        error_msg = f"TTS generation failed: {exc}"
        print(f"[ERR] {error_msg}")
        
        # Reset speaking state on error
        with barge_in_state.lock:
            barge_in_state.is_speaking = False
            
        return {
            "text_response": ai_response if ai_response else "Error occurred",
            "audio_base64": "",
            "error": error_msg,
            "interrupted": False
        }
    

# ====== BARGE-IN STATE ======
class BargeInState:
    def __init__(self):
        self.lock = threading.Lock()
        self.is_speaking = False
        self.barge_in_active = False

barge_in_state = BargeInState()

# ====== FLASK SERVER ======
app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    azure_configured = all([
        AZURE_OPENAI_API_KEY,
        AZURE_OPENAI_ENDPOINT,
        AZURE_TRANSCRIBE_API_KEY or AZURE_OPENAI_API_KEY,
        AZURE_TRANSCRIBE_ENDPOINT,
        AZURE_TTS_API_KEY or AZURE_OPENAI_API_KEY,
        AZURE_TTS_ENDPOINT
    ])
    
    return jsonify({
        "status": "healthy" if azure_configured else "missing_config",
        "azure_configured": azure_configured,
        "llm_loaded": llm_client is not None,
        "stt_available": bool(AZURE_TRANSCRIBE_API_KEY or AZURE_OPENAI_API_KEY),
        "tts_available": bool(AZURE_TTS_API_KEY or AZURE_OPENAI_API_KEY)
    })

@app.route('/transcribe', methods=['POST'])
def transcribe_audio_endpoint():
    """
    Transcribe audio to text only
    Expects: audio/wav file in 'audio' field or base64 in JSON
    """
    try:
        audio_data = None
        
        # Check for form data with file
        if 'audio' in request.files:
            audio_file = request.files['audio']
            if audio_file.filename != '':
                audio_data = audio_file.read()
        
        # Check for JSON with base64
        elif request.is_json:
            data = request.get_json()
            if 'audio_base64' in data and data['audio_base64']:
                audio_data = base64.b64decode(data['audio_base64'])
        
        if not audio_data:
            return jsonify({"error": "No audio data provided. Use 'audio' file or 'audio_base64' in JSON."}), 400
        
        # Process transcription
        user_text, should_exit, error = process_user_input(audio_data)
        
        if error:
            return jsonify({"error": error}), 500
        
        return jsonify({
            "transcribed_text": user_text,
            "should_exit": should_exit,
            "error": ""
        })
        
    except Exception as exc:
        return jsonify({"error": f"Server error: {exc}"}), 500

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    """
    Complete chat endpoint: audio input -> text + audio output
    Expects: JSON with base64 audio or text input
    """
    try:
        if not request.is_json:
            return jsonify({"error": "JSON content type required"}), 400
            
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        user_text = ""
        should_exit = False
        error = ""
        
        # Handle audio input (base64 encoded)
        if 'audio_base64' in data and data['audio_base64']:
            try:
                audio_data = base64.b64decode(data['audio_base64'])
                user_text, should_exit, error = process_user_input(audio_data)
                
                if error:
                    return jsonify({"error": error}), 500
                    
            except Exception as exc:
                return jsonify({"error": f"Audio processing failed: {exc}"}), 400
        
        # Handle direct text input
        elif 'text_input' in data and data['text_input']:
            user_text = data['text_input']
            should_exit = "exit" in user_text.lower()
            
        else:
            return jsonify({"error": "Either 'audio_base64' or 'text_input' must be provided"}), 400
        
        if should_exit:
            return jsonify({
                "transcribed_text": user_text,
                "should_exit": True,
                "text_response": "Goodbye!",
                "audio_base64": "",
                "error": ""
            })
        
        # Generate AI response
        response_data = generate_ai_response(user_text)
        response_data["transcribed_text"] = user_text
        response_data["should_exit"] = should_exit
        
        return jsonify(response_data)
        
    except Exception as exc:
        return jsonify({"error": f"Chat processing failed: {exc}"}), 500

@app.route('/synthesize', methods=['POST'])
def synthesize_speech_endpoint():
    """
    Convert text to speech only
    Expects: JSON with 'text' field
    """
    try:
        if not request.is_json:
            return jsonify({"error": "JSON content type required"}), 400
            
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        text = data['text']
        response_data = generate_ai_response(text)
        
        return jsonify(response_data)
        
    except Exception as exc:
        return jsonify({"error": f"Speech synthesis failed: {exc}"}), 500

@app.route('/status', methods=['GET'])
def status():
    """Detailed status endpoint"""
    return jsonify({
        "server": "Flask Voice Agent Server (Azure)",
        "status": "running",
        "llm_loaded": llm_client is not None,
        "llm_deployment": AZURE_OPENAI_DEPLOYMENT,
        "stt_deployment": AZURE_TRANSCRIBE_DEPLOYMENT,
        "tts_deployment": AZURE_TTS_DEPLOYMENT,
        "tts_voice": AZURE_TTS_VOICE
    })

@app.route('/speaking_status', methods=['GET'])
def speaking_status():
    """
    Check if the AI is currently speaking
    """
    with barge_in_state.lock:
        return jsonify({
            "is_speaking": barge_in_state.is_speaking,
            "barge_in_active": barge_in_state.barge_in_active
        })

@app.route('/interrupt', methods=['POST'])
def interrupt_playback():
    """
    Interrupt current audio playback (barge-in)
    """
    try:
        with barge_in_state.lock:
            barge_in_state.barge_in_active = True
            barge_in_state.is_speaking = False
        
        print("[BARGE-IN] Audio playback interrupted by user")
        return jsonify({
            "status": "interrupted",
            "message": "Audio playback stopped"
        })
        
    except Exception as exc:
        return jsonify({"error": f"Interrupt failed: {exc}"}), 500

# ====== INITIALIZATION ======
def initialize_services():
    """Initialize all Azure services"""
    global llm_client
    
    print("=== Initializing Azure Services ===")
    
    # Initialize LLM client
    print("Initializing Azure OpenAI client...")
    try:
        llm_client = initialize_llm_client()
        print(f"[LLM] backend = Azure OpenAI ({AZURE_OPENAI_DEPLOYMENT})")
    except Exception as exc:
        print(f"[ERR] Failed to initialize LLM client: {exc}")
        raise
    
    # Check Azure service availability
    print(f"[STT] backend = Azure GPT-4o Transcribe ({AZURE_TRANSCRIBE_DEPLOYMENT})")
    print(f"[TTS] backend = Azure GPT-4o-mini TTS ({AZURE_TTS_DEPLOYMENT})")
    print(f"[TTS] voice = {AZURE_TTS_VOICE}")

    print("[OK] Azure services initialized successfully")

def start_server():
    """Start the Flask server"""
    print("=== Starting Flask Voice Agent Server (Azure) ===")
    print(f"Host: {SERVER_HOST}")
    print(f"Port: {SERVER_PORT}")
    print(f"LLM Backend: Azure OpenAI ({AZURE_OPENAI_DEPLOYMENT})")
    print(f"STT Backend: Azure GPT-4o Transcribe ({AZURE_TRANSCRIBE_DEPLOYMENT})")
    print(f"TTS Backend: Azure GPT-4o-mini TTS ({AZURE_TTS_DEPLOYMENT})")
    print(f"TTS Voice: {AZURE_TTS_VOICE}")
    print("\nServer endpoints:")
    print("  GET  /health     - Health check")
    print("  GET  /status     - Detailed status")
    print("  POST /transcribe - Audio to text transcription")
    print("  POST /chat       - Full chat with audio I/O")
    print("  POST /synthesize - Text to speech")
    print("=========================================")
    
    # Run Flask app
    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG, threaded=True)

if __name__ == "__main__":
    try:
        # Initialize Azure services first
        initialize_services()
        
        # Start server
        start_server()
        
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)
