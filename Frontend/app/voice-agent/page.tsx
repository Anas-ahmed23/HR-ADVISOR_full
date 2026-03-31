"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Mic, MicOff, PhoneOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WaveformVisualizer } from "@/components/WaveformVisualizer"
import { HTTPClient } from "@/lib/http-client"
import ShaderBackground from "@/components/ui/shader-background"

export default function VoiceAgentPage() {
  const [userSpeech, setUserSpeech] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCallActive, setIsCallActive] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const httpClientRef = useRef<HTTPClient | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const speechStartTimeRef = useRef<number>(0)
  const bargeInTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    httpClientRef.current = new HTTPClient({
      serverUrl: process.env.NEXT_PUBLIC_VOICE_SERVER_URL || "http://localhost:5000",
      onAIResponse: (response: string) => {
        setAiResponse(response)
        if (response.includes("Processing your request") || response.includes("Still processing")) {
          setIsProcessing(true)
          setIsAISpeaking(false)
        } else if (
          response.includes("Connected!") ||
          response.includes("Ready!") ||
          response.includes("Send a message")
        ) {
          setIsProcessing(false)
          setIsAISpeaking(false)
        } else if (!response.includes("Processing")) {
          setIsProcessing(false)
          setIsAISpeaking(true)
        }
      },
      onConnectionChange: (connected: boolean) => {
        setIsConnected(connected)
        setIsCallActive(connected)
        if (!connected) setAiResponse((prev) => (prev ? "Disconnected from server" : prev))
        else setError("")
        setIsProcessing(false)
      },
      onError: (errorMsg: string) => {
        if (!errorMsg.includes("disconnected") && !errorMsg.includes("Disconnected")) setError(errorMsg)
        setIsProcessing(false)
      },
    })

    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition
      if (SpeechRecognition) recognitionRef.current = new SpeechRecognition()
      else setError("Speech recognition is not supported. Try Chrome or Edge.")
    }

    return () => {
      httpClientRef.current?.disconnect()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        setIsListening(false)
      } catch {
        // ignore
      }
    }
  }

  const startSpeechRecognition = async () => {
    const rec = recognitionRef.current
    if (!rec) return
    try {
      if (isListening) {
        stopSpeechRecognition()
        await new Promise((r) => setTimeout(r, 200))
      }
      setError("")
      await new Promise((r) => setTimeout(r, 200))
      rec.continuous = true
      rec.interimResults = true
      rec.lang = "en-US"
      rec.onstart = () => setIsListening(true)
      rec.onend = () => {
        setIsListening(false)
        if (isCallActive && isMicOn)
          bargeInTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && isCallActive && isMicOn && !isListening) recognitionRef.current.start()
          }, 1000)
      }
      rec.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ""
        let interimTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) finalTranscript += transcript
          else interimTranscript += transcript
        }
        if (interimTranscript.trim().length > 0 && isAISpeaking && isMicOn) {
          const now = Date.now()
          if (!speechStartTimeRef.current) speechStartTimeRef.current = now
          if (now - speechStartTimeRef.current > 200) {
            handleBargeIn()
            speechStartTimeRef.current = 0
            return
          }
        } else if (!interimTranscript.trim()) speechStartTimeRef.current = 0
        if (finalTranscript && isMicOn) {
          setUserSpeech((prev) => prev + " " + finalTranscript)
          speechStartTimeRef.current = 0
          if (bargeInTimeoutRef.current) {
            clearTimeout(bargeInTimeoutRef.current)
            bargeInTimeoutRef.current = null
          }
          httpClientRef.current?.sendTextMessage(finalTranscript).catch((err) => setError("Failed to send: " + (err as Error).message))
        }
      }
      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        speechStartTimeRef.current = 0
        if (bargeInTimeoutRef.current) {
          clearTimeout(bargeInTimeoutRef.current)
          bargeInTimeoutRef.current = null
        }
        if (event.error === "no-speech") return
        if (event.error === "not-allowed" || event.error === "permission-denied") setError("Microphone permission denied.")
        else if (event.error === "audio-capture") setError("No microphone found.")
        else setError(`Speech error: ${event.error}`)
        setIsListening(false)
      }
      rec.start()
    } catch (err) {
      setError("Speech recognition error: " + (err instanceof Error ? err.message : "Unknown"))
    }
  }

  const handleStartListening = async () => {
    if (!httpClientRef.current) return
    setError("")
    setUserSpeech("")
    setAiResponse("")
    setIsMicOn(true)
    setIsConnecting(true)
    try {
      await httpClientRef.current.connect()
      await startSpeechRecognition()
      setIsConnecting(false)
    } catch (err) {
      setError("Connection failed: " + (err instanceof Error ? err.message : "Unknown"))
      setAiResponse("Error connecting to voice agent")
      setIsConnecting(false)
    }
  }

  const handleStopListening = () => {
    stopSpeechRecognition()
    httpClientRef.current?.disconnect()
    setAiResponse("Disconnected")
    setIsCallActive(false)
    setIsConnecting(false)
  }

  const handleEndCall = async () => {
    speechStartTimeRef.current = 0
    if (bargeInTimeoutRef.current) {
      clearTimeout(bargeInTimeoutRef.current)
      bargeInTimeoutRef.current = null
    }
    if (isAISpeaking) await httpClientRef.current?.interrupt()
    httpClientRef.current?.stopAudioPlayback()
    stopSpeechRecognition()
    httpClientRef.current?.disconnect()
    setAiResponse("Conversation ended")
    setIsAISpeaking(false)
    setIsCallActive(false)
    setIsConnecting(false)
    setError("")
    setTimeout(() => {
      setUserSpeech("")
      setAiResponse("")
    }, 2000)
  }

  const handleToggleMic = () => {
    const newMicState = !isMicOn
    setIsMicOn(newMicState)
    if (newMicState && isCallActive) setTimeout(() => startSpeechRecognition(), 300)
    else if (!newMicState) {
      stopSpeechRecognition()
      speechStartTimeRef.current = 0
      if (bargeInTimeoutRef.current) {
        clearTimeout(bargeInTimeoutRef.current)
        bargeInTimeoutRef.current = null
      }
    }
  }

  const handleBargeIn = async () => {
    await httpClientRef.current?.interrupt()
    httpClientRef.current?.stopAudioPlayback()
    setIsAISpeaking(false)
    setAiResponse("")
    setUserSpeech("")
    speechStartTimeRef.current = 0
    if (bargeInTimeoutRef.current) {
      clearTimeout(bargeInTimeoutRef.current)
      bargeInTimeoutRef.current = null
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <ShaderBackground />
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#7A4DFF" }}
            >
              <svg viewBox="0 0 100 100" className="w-6 h-6 text-white">
                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="3" />
                <rect x="38" y="30" width="6" height="40" rx="3" fill="currentColor" />
                <rect x="48" y="20" width="6" height="50" rx="3" fill="currentColor" />
                <rect x="58" y="35" width="6" height="35" rx="3" fill="currentColor" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">HR Advisor</span>
          </Link>
          <span className="text-sm font-medium text-white/80" style={{ color: "#0EA5E9" }}>
            Voice Agent
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-4xl">
          {error && !isCallActive ? (
            <div className="text-center py-20">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 max-w-md mx-auto shadow-2xl">
                <div className="text-red-400 font-medium mb-2">Connection Error</div>
                <div className="text-red-300/90 text-sm whitespace-pre-line">{error}</div>
                <p className="text-xs text-white/50 mt-2">
                  Ensure the GradVoice backend is running on port 5000 (or set NEXT_PUBLIC_VOICE_SERVER_URL).
                </p>
              </div>
            </div>
          ) : isConnecting ? (
            <div className="text-center py-20">
              <div className="inline-flex gap-2">
                <div className="w-2 h-2 bg-[#7A4DFF] rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-[#7A4DFF] rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 bg-[#7A4DFF] rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
              <div className="mt-4 text-white/70">Connecting...</div>
            </div>
          ) : isCallActive ? (
            <div className="space-y-8">
              <div className="mb-8 space-y-4 max-h-96 overflow-y-auto px-4">
                {userSpeech && (
                  <div className="flex flex-col items-end space-y-2">
                    <div className="rounded-xl p-4 max-w-3xl bg-white/10 border border-white/10 text-white backdrop-blur-sm">
                      {userSpeech}
                    </div>
                    {isListening && (
                      <div className="flex items-center gap-1 text-xs animate-pulse" style={{ color: "#0EA5E9" }}>
                        Listening...
                      </div>
                    )}
                  </div>
                )}
                {aiResponse && (
                  <div className="flex flex-col items-start">
                    <div className="text-white">{aiResponse}</div>
                    {isProcessing && (
                      <div className="text-xs text-green-400 mt-1">Processing...</div>
                    )}
                  </div>
                )}
                {!userSpeech && !aiResponse && (
                  <div className="text-center py-12 text-white/60 text-sm">
                    Start speaking to begin. You can interrupt the AI at any time.
                  </div>
                )}
              </div>
              <WaveformVisualizer isActive={isMicOn && isListening} />
              {isAISpeaking && (
                <div className="text-center text-sm text-green-400 animate-pulse">
                  AI is speaking — you can interrupt by talking
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 max-w-md mx-auto text-white/70 shadow-2xl">
                Conversation ended. Click &quot;Start Conversation&quot; to begin again.
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="p-6 relative z-10">
        <div className="max-w-4xl mx-auto rounded-full px-6 py-4 flex items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
          {isCallActive ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-white hover:bg-white/10"
                onClick={handleToggleMic}
                style={{
                  color: isMicOn ? "white" : "#EF4444",
                  backgroundColor: !isMicOn ? "rgba(239,68,68,0.15)" : "transparent",
                }}
              >
                {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <Button
                className="rounded-full px-6 gap-2 border border-red-500/30 bg-red-500/20 text-red-300 hover:bg-red-500/30"
                onClick={handleEndCall}
              >
                <PhoneOff className="h-4 w-4" />
                END CONVERSATION
              </Button>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <Button
                className="rounded-full px-8 py-3 gap-2 text-white border-none disabled:opacity-70 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#7A4DFF" }}
                onClick={handleStartListening}
                disabled={isConnected || isConnecting}
              >
                {isConnecting ? "Connecting..." : "Start Conversation"}
              </Button>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}
