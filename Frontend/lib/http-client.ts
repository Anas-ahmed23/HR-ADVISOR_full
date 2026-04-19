type VoiceState = "idle" | "listening" | "processing" | "speaking" | "closed"

function sanitizeError(err: unknown): string {
  const msg = String(err).toLowerCase()
  if (msg.includes("401") || msg.includes("access denied") || msg.includes("invalid subscription")) {
    return "The voice service is temporarily unavailable. Please try again shortly."
  }
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("econnrefused")) {
    return "Cannot reach the voice server. Make sure the backend is running."
  }
  if (msg.includes("timeout")) {
    return "The voice server took too long to respond. Please try again."
  }
  if (msg.includes("webrtc")) {
    return "WebRTC connection failed. Check backend URL, HTTPS setup, and firewall/VPN."
  }
  return "Something went wrong with the voice session. Please try again."
}

type EventPayload = {
  type?: string
  state?: VoiceState
  text?: string
  message?: string
}

export class HTTPClient {
  private serverUrl: string
  private onAIResponse: (response: string) => void
  private onCandidateTranscription: ((text: string) => void) | undefined
  private onConnectionChange: (connected: boolean) => void
  private onStateChange: ((state: VoiceState) => void) | undefined
  private onError: (error: string) => void
  private onPlaybackEnded: (() => void) | undefined

  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private localStream: MediaStream | null = null
  private remoteAudio: HTMLAudioElement | null = null
  private sessionId: string | null = null
  private isSessionActive = false
  private currentState: VoiceState = "idle"

  constructor(config: {
    serverUrl?: string
    onAIResponse: (response: string) => void
    onCandidateTranscription?: (text: string) => void
    onConnectionChange: (connected: boolean) => void
    onStateChange?: (state: VoiceState) => void
    onError: (error: string) => void
    onPlaybackEnded?: () => void
  }) {
    this.serverUrl = (config.serverUrl || "http://localhost:5000").replace(/\/+$/, "")
    this.onAIResponse = config.onAIResponse
    this.onCandidateTranscription = config.onCandidateTranscription
    this.onConnectionChange = config.onConnectionChange
    this.onStateChange = config.onStateChange
    this.onError = config.onError
    this.onPlaybackEnded = config.onPlaybackEnded
  }

  async connect(): Promise<void> {
    if (this.isSessionActive) return
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      throw new Error("WebRTC is not supported in this browser.")
    }

    try {
      await this.checkHealth()

      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      })
      this.dataChannel = this.peerConnection.createDataChannel("events")
      this.dataChannel.onmessage = (event) => this.handleDataChannelMessage(event.data)

      this.peerConnection.ondatachannel = (event) => {
        const channel = event.channel
        channel.onmessage = (messageEvent) => this.handleDataChannelMessage(messageEvent.data)
      }

      this.peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams
        if (!remoteStream) return
        if (!this.remoteAudio) {
          this.remoteAudio = new Audio()
          this.remoteAudio.autoplay = true
          this.remoteAudio.setAttribute("playsinline", "true")
        }
        this.remoteAudio.srcObject = remoteStream
        void this.remoteAudio.play().catch(() => {
          // Browser autoplay rules may require user interaction; start button click usually satisfies it.
        })
      }

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState
        if (state === "failed" || state === "disconnected" || state === "closed") {
          this.disconnectInternal(false)
        }
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      for (const track of this.localStream.getAudioTracks()) {
        this.peerConnection.addTrack(track, this.localStream)
      }

      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)
      await this.waitForIceGatheringComplete(this.peerConnection)

      const localDescription = this.peerConnection.localDescription
      if (!localDescription?.sdp) {
        throw new Error("WebRTC local offer generation failed.")
      }

      const answerPayload = await this.postJson("/webrtc/connect", {
        type: localDescription.type,
        sdp: localDescription.sdp,
      })

      this.sessionId = String(answerPayload.session_id || "")
      const answerType = String(answerPayload.type || "answer")
      const answerSdp = String(answerPayload.sdp || "")
      if (!this.sessionId || !answerSdp) {
        throw new Error("Invalid WebRTC answer from backend.")
      }

      await this.peerConnection.setRemoteDescription({
        type: answerType as RTCSdpType,
        sdp: answerSdp,
      })

      this.isSessionActive = true
      this.setState("listening")
      this.onConnectionChange(true)
    } catch (error) {
      this.disconnectInternal(false)
      this.onError(sanitizeError(error))
      throw error
    }
  }

  disconnect(): void {
    this.disconnectInternal(true)
  }

  setMicEnabled(enabled: boolean): void {
    if (!this.localStream) return
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = enabled
    }
    if (!enabled) {
      this.setState("idle")
    } else if (this.isSessionActive && this.currentState === "idle") {
      this.setState("listening")
    }
  }

  stopAudioPlayback(): void {
    if (!this.remoteAudio) return
    this.remoteAudio.pause()
  }

  async interrupt(): Promise<void> {
    if (!this.isSessionActive || !this.sessionId) return
    try {
      if (this.dataChannel?.readyState === "open") {
        this.dataChannel.send(JSON.stringify({ type: "interrupt" }))
      }
      await fetch(`${this.serverUrl}/webrtc/session/${this.sessionId}/interrupt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    } catch {
      // Soft-fail: interruption is best-effort.
    }
  }

  async getSpeakingStatus(): Promise<{ is_speaking: boolean; barge_in_active: boolean }> {
    return {
      is_speaking: this.currentState === "speaking",
      barge_in_active: false,
    }
  }

  private async checkHealth(): Promise<void> {
    const response = await fetch(`${this.serverUrl}/health`)
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`)
    }
  }

  private async postJson(path: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.serverUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      let detail = ""
      try {
        const data = await response.json()
        detail = String(data.error || "")
      } catch {
        detail = ""
      }
      throw new Error(`WebRTC request failed: ${response.status} ${detail}`.trim())
    }
    return (await response.json()) as Record<string, unknown>
  }

  private handleDataChannelMessage(raw: unknown): void {
    if (!raw) return
    let payload: EventPayload
    try {
      payload = typeof raw === "string" ? (JSON.parse(raw) as EventPayload) : (JSON.parse(String(raw)) as EventPayload)
    } catch {
      return
    }

    const eventType = String(payload.type || "")
    if (eventType === "state" && payload.state) {
      const previousState = this.currentState
      this.setState(payload.state)
      if (previousState === "speaking" && payload.state !== "speaking") {
        this.onPlaybackEnded?.()
      }
      return
    }
    if (eventType === "candidate_final") {
      const text = String(payload.text || "").trim()
      if (text) this.onCandidateTranscription?.(text)
      return
    }
    if (eventType === "ai_final") {
      const text = String(payload.text || "").trim()
      if (text) this.onAIResponse(text)
      return
    }
    if (eventType === "error") {
      const message = String(payload.message || "").trim()
      if (message) this.onError(message)
      return
    }
    if (eventType === "interrupted") {
      this.setState("listening")
    }
  }

  private setState(nextState: VoiceState): void {
    if (this.currentState === nextState) return
    this.currentState = nextState
    this.onStateChange?.(nextState)
  }

  private async notifyBackendClose(sessionId: string): Promise<void> {
    try {
      await fetch(`${this.serverUrl}/webrtc/session/${sessionId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    } catch {
      // Best effort.
    }
  }

  private disconnectInternal(intentional: boolean): void {
    const closingSession = this.sessionId
    this.sessionId = null
    this.isSessionActive = false
    this.setState("closed")

    if (this.dataChannel) {
      try {
        this.dataChannel.close()
      } catch {
        // ignore
      }
      this.dataChannel = null
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close()
      } catch {
        // ignore
      }
      this.peerConnection = null
    }

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop()
      }
      this.localStream = null
    }

    if (this.remoteAudio) {
      this.remoteAudio.pause()
      this.remoteAudio.srcObject = null
      this.remoteAudio = null
    }

    if (closingSession) {
      void this.notifyBackendClose(closingSession)
    }

    this.onConnectionChange(false)
    if (!intentional) {
      this.onError("Disconnected from the voice server.")
    }
  }

  private async waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
    if (pc.iceGatheringState === "complete") return
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(() => {
        pc.removeEventListener("icegatheringstatechange", onStateChange)
        resolve()
      }, 2500)

      const onStateChange = () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeout)
          pc.removeEventListener("icegatheringstatechange", onStateChange)
          resolve()
        }
      }

      pc.addEventListener("icegatheringstatechange", onStateChange)
    })
  }
}
