"""WebRTC bridge for backend-driven voice sessions.

This module keeps the browser thin: microphone capture + remote audio playback
via WebRTC, while STT/LLM/TTS/VAD stay server-side.
"""

from __future__ import annotations

import asyncio
import audioop
import io
import json
import threading
import time
import uuid
import wave
from collections import deque
from fractions import Fraction
from typing import Any, Callable, Deque, Dict, Optional, Tuple

import numpy as np

try:
    from av import AudioFrame
    from av.audio.resampler import AudioResampler
    from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription

    WEBRTC_RUNTIME_AVAILABLE = True
except Exception:
    AudioFrame = None  # type: ignore[assignment]
    AudioResampler = None  # type: ignore[assignment]
    MediaStreamTrack = object  # type: ignore[assignment]
    RTCPeerConnection = None  # type: ignore[assignment]
    RTCSessionDescription = None  # type: ignore[assignment]
    WEBRTC_RUNTIME_AVAILABLE = False


TranscribeFn = Callable[[bytes, str, str], Tuple[str, str]]
LlmFn = Callable[[str], str]
TtsFn = Callable[[str], bytes]
SanitizeFn = Callable[[str], str]
LogFn = Callable[[str], None]

SAMPLE_RATE = 16000
CHANNELS = 1
SAMPLE_WIDTH = 2
FRAME_MS = 20
FRAME_SAMPLES = SAMPLE_RATE * FRAME_MS // 1000
FRAME_BYTES = FRAME_SAMPLES * SAMPLE_WIDTH * CHANNELS

IGNORED_CANDIDATE_PHRASES = (
    "the speaker is speaking english",
    "speaker is speaking english",
    "speech recognition encountered an issue",
    "speech recognition lost network access",
    "speech network diagnostic",
)


def _normalize_transcript_text(text: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() or ch.isspace() else " " for ch in text)
    return " ".join(cleaned.split())


def _is_likely_ai_echo(transcribed_text: str, ai_text: str) -> bool:
    transcribed = _normalize_transcript_text(transcribed_text)
    ai = _normalize_transcript_text(ai_text)
    if not transcribed or not ai:
        return False
    if transcribed in ai and len(transcribed) >= 4:
        return True

    transcribed_tokens = {token for token in transcribed.split(" ") if len(token) > 2}
    ai_tokens = {token for token in ai.split(" ") if len(token) > 2}
    if not transcribed_tokens or not ai_tokens:
        return False

    overlap = sum(1 for token in transcribed_tokens if token in ai_tokens)
    overlap_ratio = overlap / max(1, len(transcribed_tokens))
    return overlap_ratio >= 0.7


def _should_ignore_candidate_utterance(text: str) -> bool:
    normalized = _normalize_transcript_text(text)
    if not normalized or len(normalized) < 2:
        return True
    return any(
        normalized == phrase or phrase in normalized for phrase in IGNORED_CANDIDATE_PHRASES
    )


def _pcm16_to_wav_bytes(
    pcm_bytes: bytes, sample_rate: int = SAMPLE_RATE, channels: int = CHANNELS
) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_writer:
        wav_writer.setnchannels(channels)
        wav_writer.setsampwidth(SAMPLE_WIDTH)
        wav_writer.setframerate(sample_rate)
        wav_writer.writeframes(pcm_bytes)
    return buf.getvalue()


def _wav_to_pcm16_mono_16k(wav_bytes: bytes) -> bytes:
    with wave.open(io.BytesIO(wav_bytes), "rb") as wav_reader:
        channels = wav_reader.getnchannels()
        sample_width = wav_reader.getsampwidth()
        sample_rate = wav_reader.getframerate()
        raw = wav_reader.readframes(wav_reader.getnframes())

    if sample_width != SAMPLE_WIDTH:
        raw = audioop.lin2lin(raw, sample_width, SAMPLE_WIDTH)
        sample_width = SAMPLE_WIDTH
    if channels != 1:
        raw = audioop.tomono(raw, sample_width, 0.5, 0.5)
        channels = 1
    if sample_rate != SAMPLE_RATE:
        raw, _ = audioop.ratecv(raw, sample_width, channels, sample_rate, SAMPLE_RATE, None)

    return raw


class SimpleVadSegmenter:
    """Chunk incoming PCM into sentence-like utterances."""

    def __init__(
        self,
        threshold: int = 520,
        min_speech_ms: int = 320,
        silence_end_ms: int = 820,
        max_utterance_ms: int = 12000,
        preroll_ms: int = 260,
    ) -> None:
        self.threshold = threshold
        self.min_speech_ms = min_speech_ms
        self.silence_end_ms = silence_end_ms
        self.max_utterance_ms = max_utterance_ms
        self.chunk_ms = FRAME_MS
        self.chunk_bytes = FRAME_BYTES
        self.preroll_max_bytes = int(preroll_ms * SAMPLE_RATE * SAMPLE_WIDTH / 1000)
        self._preroll: Deque[bytes] = deque()
        self._preroll_bytes = 0
        self._active = False
        self._buffer = bytearray()
        self._speech_ms = 0
        self._silence_ms = 0

    def _reset_active(self) -> None:
        self._active = False
        self._buffer = bytearray()
        self._speech_ms = 0
        self._silence_ms = 0

    def _append_preroll(self, chunk: bytes) -> None:
        if not chunk:
            return
        self._preroll.append(chunk)
        self._preroll_bytes += len(chunk)
        while self._preroll_bytes > self.preroll_max_bytes and self._preroll:
            removed = self._preroll.popleft()
            self._preroll_bytes -= len(removed)

    def push(self, pcm_bytes: bytes) -> tuple[list[bytes], bool]:
        utterances: list[bytes] = []
        voice_started = False
        if not pcm_bytes:
            return utterances, voice_started

        for i in range(0, len(pcm_bytes), self.chunk_bytes):
            chunk = pcm_bytes[i : i + self.chunk_bytes]
            if len(chunk) < self.chunk_bytes:
                chunk += b"\x00" * (self.chunk_bytes - len(chunk))

            rms = audioop.rms(chunk, SAMPLE_WIDTH)
            is_voice = rms >= self.threshold

            if not self._active:
                self._append_preroll(chunk)
                if is_voice:
                    voice_started = True
                    self._active = True
                    self._buffer = bytearray(b"".join(self._preroll))
                    self._preroll.clear()
                    self._preroll_bytes = 0
                    self._speech_ms = 0
                    self._silence_ms = 0

            if not self._active:
                continue

            self._buffer.extend(chunk)
            self._speech_ms += self.chunk_ms
            if is_voice:
                self._silence_ms = 0
            else:
                self._silence_ms += self.chunk_ms

            reached_min = self._speech_ms >= self.min_speech_ms
            long_silence = self._silence_ms >= self.silence_end_ms
            too_long = self._speech_ms >= self.max_utterance_ms

            if reached_min and (long_silence or too_long):
                utterances.append(bytes(self._buffer))
                self._reset_active()

        return utterances, voice_started

    def flush(self) -> Optional[bytes]:
        if self._active and self._speech_ms >= self.min_speech_ms:
            remaining = bytes(self._buffer)
            self._reset_active()
            return remaining
        self._reset_active()
        return None


class OutboundAudioTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self, on_playback_state: Callable[[bool], None]) -> None:
        super().__init__()
        self._queue: asyncio.Queue[bytes] = asyncio.Queue()
        self._buffer = bytearray()
        self._on_playback_state = on_playback_state
        self._is_playing = False
        self._closed = False
        self._pts = 0
        self._next_ts: Optional[float] = None
        self._frame_duration_s = FRAME_MS / 1000.0

    async def enqueue_pcm(self, pcm_bytes: bytes) -> None:
        if self._closed or not pcm_bytes:
            return
        await self._queue.put(pcm_bytes)
        if not self._is_playing:
            self._is_playing = True
            self._on_playback_state(True)

    async def clear(self) -> None:
        self._buffer = bytearray()
        while not self._queue.empty():
            try:
                self._queue.get_nowait()
            except asyncio.QueueEmpty:
                break
        if self._is_playing:
            self._is_playing = False
            self._on_playback_state(False)

    async def close_track(self) -> None:
        self._closed = True
        await self.clear()

    async def recv(self) -> AudioFrame:
        if self._closed:
            raise asyncio.CancelledError("Outbound track is closed.")

        if self._next_ts is None:
            self._next_ts = time.monotonic()
        else:
            self._next_ts += self._frame_duration_s
            delay = self._next_ts - time.monotonic()
            if delay > 0:
                await asyncio.sleep(delay)

        while len(self._buffer) < FRAME_BYTES:
            try:
                next_chunk = self._queue.get_nowait()
            except asyncio.QueueEmpty:
                break
            if next_chunk:
                self._buffer.extend(next_chunk)

        if len(self._buffer) >= FRAME_BYTES:
            payload = bytes(self._buffer[:FRAME_BYTES])
            del self._buffer[:FRAME_BYTES]
        else:
            payload = bytes(self._buffer)
            self._buffer = bytearray()
            payload += b"\x00" * (FRAME_BYTES - len(payload))

        if self._is_playing and not self._buffer and self._queue.empty():
            self._is_playing = False
            self._on_playback_state(False)

        samples = np.frombuffer(payload, dtype=np.int16)
        audio_frame = AudioFrame.from_ndarray(samples.reshape(1, -1), format="s16", layout="mono")
        audio_frame.sample_rate = SAMPLE_RATE
        audio_frame.pts = self._pts
        audio_frame.time_base = Fraction(1, SAMPLE_RATE)
        self._pts += FRAME_SAMPLES
        return audio_frame


class VoiceSession:
    def __init__(
        self,
        session_id: str,
        pc: RTCPeerConnection,
        transcribe_fn: TranscribeFn,
        llm_fn: LlmFn,
        tts_fn: TtsFn,
        sanitize_tts_text: SanitizeFn,
        log_fn: LogFn,
        on_close: Callable[[str], None],
    ) -> None:
        self.session_id = session_id
        self.pc = pc
        self.transcribe_fn = transcribe_fn
        self.llm_fn = llm_fn
        self.tts_fn = tts_fn
        self.sanitize_tts_text = sanitize_tts_text
        self.log = log_fn
        self._on_close = on_close

        self.created_at = int(time.time() * 1000)
        self.updated_at = self.created_at
        self.state = "idle"
        self.closed = False

        self._data_channel: Any = None
        self._inbound_task: Optional[asyncio.Task[Any]] = None
        self._worker_task: Optional[asyncio.Task[Any]] = None
        self._utterance_queue: asyncio.Queue[bytes] = asyncio.Queue()
        self._cancel_generation = asyncio.Event()
        self._recent_ai_text = ""
        self._echo_guard_until = 0.0
        self._vad = SimpleVadSegmenter()
        self._resampler = AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)

        self._outbound_track = OutboundAudioTrack(self._on_playback_state_change)
        self.pc.addTrack(self._outbound_track)
        self._wire_peer_events()
        self._worker_task = asyncio.create_task(self._utterance_worker())

    def snapshot(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "state": self.state,
            "closed": self.closed,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "connection_state": self.pc.connectionState,
            "ice_state": self.pc.iceConnectionState,
        }

    async def interrupt(self, reason: str = "client") -> None:
        if self.closed:
            return
        self._cancel_generation.set()
        await self._outbound_track.clear()
        while not self._utterance_queue.empty():
            try:
                self._utterance_queue.get_nowait()
            except asyncio.QueueEmpty:
                break
        self._set_state("listening")
        self._emit_event("interrupted", reason=reason)

    async def close(self) -> None:
        if self.closed:
            return
        self.closed = True
        self._cancel_generation.set()
        await self._outbound_track.close_track()

        tasks = [self._inbound_task, self._worker_task]
        for task in tasks:
            if task and not task.done():
                task.cancel()
        for task in tasks:
            if task:
                try:
                    await task
                except Exception:
                    pass

        try:
            await self.pc.close()
        except Exception:
            pass

        self._set_state("closed")
        self._on_close(self.session_id)

    def _wire_peer_events(self) -> None:
        @self.pc.on("datachannel")
        def on_datachannel(channel: Any) -> None:
            self._data_channel = channel
            self._emit_event("connected", state=self.state)

            @channel.on("message")
            def on_message(message: Any) -> None:
                self._handle_datachannel_message(message)

        @self.pc.on("connectionstatechange")
        async def on_connectionstatechange() -> None:
            state = self.pc.connectionState
            self.log(f"[WEBRTC:{self.session_id}] connection={state}")
            if state in {"failed", "closed", "disconnected"}:
                await self.close()

        @self.pc.on("track")
        def on_track(track: MediaStreamTrack) -> None:
            if track.kind != "audio":
                return
            self.log(f"[WEBRTC:{self.session_id}] inbound audio track attached")
            self._set_state("listening")
            if not self._inbound_task or self._inbound_task.done():
                self._inbound_task = asyncio.create_task(self._consume_incoming_audio(track))

            @track.on("ended")
            async def on_ended() -> None:
                self.log(f"[WEBRTC:{self.session_id}] inbound audio track ended")
                remaining = self._vad.flush()
                if remaining:
                    await self._utterance_queue.put(remaining)

    def _handle_datachannel_message(self, message: Any) -> None:
        if self.closed:
            return
        try:
            if isinstance(message, bytes):
                decoded = message.decode("utf-8")
            else:
                decoded = str(message)
            payload = json.loads(decoded)
        except Exception:
            return

        msg_type = str(payload.get("type") or "").lower()
        if msg_type == "interrupt":
            asyncio.create_task(self.interrupt(reason="datachannel"))
        elif msg_type == "ping":
            self._emit_event("pong", ts=int(time.time() * 1000))

    def _emit_event(self, event_type: str, **payload: Any) -> None:
        self.updated_at = int(time.time() * 1000)
        channel = self._data_channel
        if not channel or getattr(channel, "readyState", "") != "open":
            return
        event_payload = {
            "type": event_type,
            "session_id": self.session_id,
            "ts": int(time.time() * 1000),
            **payload,
        }
        try:
            channel.send(json.dumps(event_payload))
        except Exception:
            pass

    def _set_state(self, state: str) -> None:
        if self.state == state:
            return
        self.state = state
        self._emit_event("state", state=state)

    def _on_playback_state_change(self, is_playing: bool) -> None:
        if self.closed:
            return
        if is_playing:
            self._set_state("speaking")
            return
        self._echo_guard_until = time.monotonic() + 0.65
        self._set_state("listening")

    async def _consume_incoming_audio(self, track: MediaStreamTrack) -> None:
        try:
            while not self.closed:
                frame = await track.recv()
                pcm_chunk = self._frame_to_pcm16(frame)
                if not pcm_chunk:
                    continue

                utterances, voice_started = self._vad.push(pcm_chunk)
                if voice_started and self.state in {"speaking", "processing"}:
                    await self.interrupt(reason="barge-in")

                for utterance in utterances:
                    if len(utterance) >= FRAME_BYTES * 4:
                        await self._utterance_queue.put(utterance)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            self._emit_event("error", message=f"Incoming audio failed: {exc}")
        finally:
            remaining = self._vad.flush()
            if remaining and len(remaining) >= FRAME_BYTES * 4 and not self.closed:
                await self._utterance_queue.put(remaining)

    def _frame_to_pcm16(self, frame: AudioFrame) -> bytes:
        resampled = self._resampler.resample(frame)
        if not resampled:
            return b""
        frames = resampled if isinstance(resampled, list) else [resampled]
        chunks: list[bytes] = []
        for converted in frames:
            ndarray = converted.to_ndarray()
            if ndarray.size == 0:
                continue
            if ndarray.dtype != np.int16:
                ndarray = ndarray.astype(np.int16)
            chunks.append(ndarray.tobytes())
        return b"".join(chunks)

    async def _utterance_worker(self) -> None:
        try:
            while not self.closed:
                utterance_pcm = await self._utterance_queue.get()
                if self.closed:
                    return
                await self._handle_utterance(utterance_pcm)
        except asyncio.CancelledError:
            return
        except Exception as exc:
            self._emit_event("error", message=f"Utterance worker failed: {exc}")

    async def _handle_utterance(self, utterance_pcm: bytes) -> None:
        if self.closed:
            return
        if len(utterance_pcm) < FRAME_BYTES * 4:
            return

        self._cancel_generation.clear()
        self._set_state("processing")

        wav_bytes = _pcm16_to_wav_bytes(utterance_pcm, sample_rate=SAMPLE_RATE, channels=1)
        user_text, err = await asyncio.to_thread(self.transcribe_fn, wav_bytes, ".wav", "audio/wav")

        if self.closed:
            return
        if err:
            self._emit_event("error", message=err)
            self._set_state("listening")
            return

        user_text = (user_text or "").strip()
        if not user_text or _should_ignore_candidate_utterance(user_text):
            self._set_state("listening")
            return

        if time.monotonic() < self._echo_guard_until and _is_likely_ai_echo(user_text, self._recent_ai_text):
            self._set_state("listening")
            return

        self._emit_event("candidate_final", text=user_text)

        if self._cancel_generation.is_set() or self.closed:
            self._set_state("listening")
            return

        ai_text = await asyncio.to_thread(self.llm_fn, user_text)
        ai_text = (ai_text or "").strip()
        if not ai_text:
            self._set_state("listening")
            return

        if self._cancel_generation.is_set() or self.closed:
            self._set_state("listening")
            return

        self._recent_ai_text = ai_text
        self._emit_event("ai_final", text=ai_text)

        safe_tts_text = self.sanitize_tts_text(ai_text)
        try:
            tts_wav = await asyncio.to_thread(self.tts_fn, safe_tts_text)
        except Exception as exc:
            self._emit_event("error", message=f"TTS failed: {exc}")
            self._set_state("listening")
            return

        if self._cancel_generation.is_set() or self.closed:
            self._set_state("listening")
            return

        try:
            outbound_pcm = _wav_to_pcm16_mono_16k(tts_wav)
        except Exception as exc:
            self._emit_event("error", message=f"TTS audio decode failed: {exc}")
            self._set_state("listening")
            return

        if not outbound_pcm:
            self._set_state("listening")
            return

        await self._outbound_track.enqueue_pcm(outbound_pcm)


class WebRTCBridge:
    """Thread-safe bridge between Flask routes and aiortc async sessions."""

    def __init__(
        self,
        transcribe_fn: TranscribeFn,
        llm_fn: LlmFn,
        tts_fn: TtsFn,
        sanitize_tts_text: SanitizeFn,
        log_fn: Optional[LogFn] = None,
    ) -> None:
        if not WEBRTC_RUNTIME_AVAILABLE:
            raise RuntimeError("aiortc/av are not installed.")

        self.transcribe_fn = transcribe_fn
        self.llm_fn = llm_fn
        self.tts_fn = tts_fn
        self.sanitize_tts_text = sanitize_tts_text
        self.log = log_fn or (lambda _: None)

        self._loop = asyncio.new_event_loop()
        self._ready = threading.Event()
        self._thread = threading.Thread(target=self._run_event_loop, daemon=True, name="webrtc-loop")
        self._sessions: Dict[str, VoiceSession] = {}
        self._closed = False
        self._thread.start()
        if not self._ready.wait(timeout=5):
            raise RuntimeError("Failed to start WebRTC event loop.")

    def create_session(self, offer_sdp: str, offer_type: str) -> dict[str, str]:
        return self._run(self._create_session(offer_sdp, offer_type), timeout=45)

    def interrupt_session(self, session_id: str) -> bool:
        return self._run(self._interrupt_session(session_id), timeout=15)

    def close_session(self, session_id: str) -> bool:
        return self._run(self._close_session(session_id), timeout=15)

    def session_status(self, session_id: str) -> Optional[dict[str, Any]]:
        return self._run(self._session_status(session_id), timeout=10)

    def active_sessions(self) -> int:
        return self._run(self._active_session_count(), timeout=10)

    def shutdown(self) -> None:
        if self._closed:
            return
        self._closed = True
        try:
            self._run(self._close_all_sessions(), timeout=20)
        except Exception:
            pass
        self._loop.call_soon_threadsafe(self._loop.stop)

    def _run_event_loop(self) -> None:
        asyncio.set_event_loop(self._loop)
        self._ready.set()
        self._loop.run_forever()

    def _run(self, coro: Any, timeout: int = 30) -> Any:
        if self._closed:
            raise RuntimeError("WebRTC bridge is closed.")
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return future.result(timeout=timeout)

    async def _active_session_count(self) -> int:
        return len(self._sessions)

    async def _session_status(self, session_id: str) -> Optional[dict[str, Any]]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        return session.snapshot()

    async def _interrupt_session(self, session_id: str) -> bool:
        session = self._sessions.get(session_id)
        if not session:
            return False
        await session.interrupt(reason="client")
        return True

    async def _close_session(self, session_id: str) -> bool:
        session = self._sessions.get(session_id)
        if not session:
            return False
        await session.close()
        return True

    async def _close_all_sessions(self) -> None:
        session_ids = list(self._sessions.keys())
        for session_id in session_ids:
            session = self._sessions.get(session_id)
            if session:
                await session.close()

    async def _create_session(self, offer_sdp: str, offer_type: str) -> dict[str, str]:
        if not offer_sdp or not offer_type:
            raise RuntimeError("Missing SDP offer.")

        pc = RTCPeerConnection()
        session_id = uuid.uuid4().hex
        session = VoiceSession(
            session_id=session_id,
            pc=pc,
            transcribe_fn=self.transcribe_fn,
            llm_fn=self.llm_fn,
            tts_fn=self.tts_fn,
            sanitize_tts_text=self.sanitize_tts_text,
            log_fn=self.log,
            on_close=self._remove_session,
        )
        self._sessions[session_id] = session

        try:
            await pc.setRemoteDescription(RTCSessionDescription(sdp=offer_sdp, type=offer_type))
            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await self._wait_ice_complete(pc, timeout_s=4.0)
            local = pc.localDescription
            if local is None:
                raise RuntimeError("WebRTC local description is empty.")
            return {"session_id": session_id, "sdp": local.sdp, "type": local.type}
        except Exception:
            await session.close()
            raise

    def _remove_session(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    async def _wait_ice_complete(self, pc: RTCPeerConnection, timeout_s: float) -> None:
        start = time.monotonic()
        while pc.iceGatheringState != "complete":
            if time.monotonic() - start > timeout_s:
                return
            await asyncio.sleep(0.05)
