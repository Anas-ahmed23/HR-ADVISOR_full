// Voice agent HTTP client — connects to Backend/agent.py (default localhost:5000)

function sanitizeError(err: unknown): string {
  const msg = String(err).toLowerCase()
  if (msg.includes("401") || msg.includes("access denied") || msg.includes("invalid subscription") || msg.includes("wrong api endpoint")) {
    return "The voice service is temporarily unavailable. Please try again shortly."
  }
  if (msg.includes("error code") || msg.includes("'error'") || msg.includes('"error"')) {
    return "The voice service encountered an error. Please try again."
  }
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("econnrefused")) {
    return "Cannot reach the voice server. Make sure the backend is running."
  }
  if (msg.includes("timeout")) {
    return "The voice server took too long to respond. Please try again."
  }
  return "Something went wrong with the voice session. Please try again."
}
export class HTTPClient {
  private serverUrl: string
  private onAIResponse: (response: string) => void
  private onConnectionChange: (connected: boolean) => void
  private onError: (error: string) => void
  private onPlaybackEnded: (() => void) | undefined
  private currentAudio: HTMLAudioElement | null = null

  constructor(config: {
    serverUrl?: string
    onAIResponse: (response: string) => void
    onConnectionChange: (connected: boolean) => void
    onError: (error: string) => void
    onPlaybackEnded?: () => void
  }) {
    this.serverUrl = config.serverUrl || "http://localhost:5000"
    this.onAIResponse = config.onAIResponse
    this.onConnectionChange = config.onConnectionChange
    this.onError = config.onError
    this.onPlaybackEnded = config.onPlaybackEnded
  }

  async connect(): Promise<void> {
    try {
      const response = await fetch(`${this.serverUrl}/health`)
      if (response.ok) {
        this.onConnectionChange(true)
        this.onAIResponse("Connected! Ready to chat.")
      } else {
        throw new Error("Server health check failed")
      }
    } catch (error) {
      this.onError(sanitizeError(error))
      throw error
    }
  }

  async sendAudio(audioBlob: Blob): Promise<void> {
    try {
      const audioBase64 = await this.blobToBase64(audioBlob)
      const response = await fetch(`${this.serverUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio_base64: audioBase64.split(",")[1],
        }),
      })
      if (!response.ok) throw new Error(`Server error: ${response.status}`)
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      this.onAIResponse(data.text_response)
      if (data.audio_base64) {
        this.playAudioResponse(data.audio_base64)
      } else {
        // No audio (interrupted or TTS skipped) — notify immediately so frontend resets mic state
        this.onPlaybackEnded?.()
      }
    } catch (error) {
      this.onError(sanitizeError(error))
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, this.getAudioFilename(audioBlob))

      const response = await fetch(`${this.serverUrl}/transcribe`, {
        method: "POST",
        body: formData,
      })
      if (!response.ok) throw new Error(`Server error: ${response.status}`)
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      return String(data.transcribed_text || "").trim()
    } catch (error) {
      this.onError(sanitizeError(error))
      throw error
    }
  }

  private getAudioFilename(audioBlob: Blob): string {
    const mime = (audioBlob.type || "").toLowerCase().split(";")[0]
    if (mime === "audio/mp4" || mime === "audio/m4a") return "chunk.m4a"
    if (mime === "audio/ogg") return "chunk.ogg"
    if (mime === "audio/wav" || mime === "audio/wave" || mime === "audio/x-wav") return "chunk.wav"
    return "chunk.webm"
  }

  async sendTextMessage(text: string): Promise<void> {
    try {
      this.stopAudioPlayback()
      const response = await fetch(`${this.serverUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text_input: text }),
      })
      if (!response.ok) throw new Error(`Server error: ${response.status}`)
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      this.onAIResponse(data.text_response)
      if (data.audio_base64) {
        this.playAudioResponse(data.audio_base64)
      } else {
        // No audio (interrupted or TTS skipped) — notify immediately so frontend resets mic state
        this.onPlaybackEnded?.()
      }
    } catch (error) {
      this.onError(sanitizeError(error))
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  private playAudioResponse(audioBase64: string): void {
    try {
      this.stopAudioPlayback()
      const audioBlob = this.base64ToBlob(audioBase64, "audio/wav")
      const audioUrl = URL.createObjectURL(audioBlob)
      this.currentAudio = new Audio(audioUrl)
      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        this.currentAudio = null
        this.onPlaybackEnded?.()
      }
      this.currentAudio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        this.currentAudio = null
        this.onPlaybackEnded?.()
      }
      this.currentAudio.play().catch((err) => {
        console.error("Audio playback failed:", err)
        URL.revokeObjectURL(audioUrl)
        this.currentAudio = null
      })
    } catch (error) {
      console.error("Audio playback setup failed:", error)
    }
  }

  stopAudioPlayback(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
  }

  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64)
    const byteArrays: ArrayBuffer[] = []
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512)
      const byteNumbers = new Array(slice.length)
      for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i)
      const chunk = new Uint8Array(byteNumbers)
      const buffer = new ArrayBuffer(chunk.byteLength)
      new Uint8Array(buffer).set(chunk)
      byteArrays.push(buffer)
    }
    return new Blob(byteArrays, { type: contentType })
  }

  disconnect(): void {
    this.onConnectionChange(false)
  }

  async interrupt(): Promise<void> {
    try {
      await fetch(`${this.serverUrl}/interrupt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      console.error("Failed to send barge-in signal:", error)
    }
  }

  async getSpeakingStatus(): Promise<{ is_speaking: boolean; barge_in_active: boolean }> {
    try {
      const response = await fetch(`${this.serverUrl}/speaking_status`)
      return await response.json()
    } catch {
      return { is_speaking: false, barge_in_active: false }
    }
  }
}
