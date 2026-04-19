"use client"

import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  FileText,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  PlayCircle,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
} from "lucide-react"

import Link from "next/link"
import { Lock } from "lucide-react"
import { ProductPanel, ProductShell } from "@/components/product-shell"
import { WaveformVisualizer } from "@/components/WaveformVisualizer"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HTTPClient } from "@/lib/http-client"
import { useAnalysis } from "@/context/analysis-context"

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: {
    transcript: string
  }
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionErrorLike = {
  error: string
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

type TranscriptEntry = {
  id: string
  speaker: "Candidate" | "AI"
  text: string
  timestamp: number
}

type InsightTone = "violet" | "cyan" | "emerald"

type SummaryView = {
  overview: string
  recommendation: string
  strengths: string[]
  concerns: string[]
  recruiterNotes: string[]
}

const systemResponseFragments = [
  "processing your request",
  "still processing",
  "connected!",
  "ready!",
  "send a message",
  "disconnected",
  "conversation ended",
]

const topicLibrary = [
  {
    label: "Technical depth",
    words: ["python", "java", "api", "architecture", "system", "backend", "cloud", "aws", "database"],
  },
  {
    label: "Delivery ownership",
    words: ["launched", "delivered", "ship", "deadline", "roadmap", "release", "deploy", "owned"],
  },
  {
    label: "Collaboration",
    words: ["team", "stakeholder", "partnered", "cross-functional", "mentor", "manager", "collaborated"],
  },
  {
    label: "Problem solving",
    words: ["improved", "reduced", "resolved", "optimized", "incident", "debugged", "solution"],
  },
]

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}


function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function extractTopics(entries: TranscriptEntry[]) {
  const combined = entries.map((entry) => entry.text.toLowerCase()).join(" ")
  return topicLibrary
    .filter((topic) => topic.words.some((word) => combined.includes(word)))
    .map((topic) => topic.label)
}

function getSummary(entries: TranscriptEntry[], durationMs: number): SummaryView {
  const candidateTurns = entries.filter((entry) => entry.speaker === "Candidate")
  const aiTurns = entries.filter((entry) => entry.speaker === "AI")
  const candidateWordCount = candidateTurns.reduce((total, entry) => total + countWords(entry.text), 0)
  const averageCandidateLength = candidateTurns.length
    ? Math.round(candidateWordCount / candidateTurns.length)
    : 0
  const topics = extractTopics(entries)
  const strongVerbHits = candidateTurns
    .flatMap((entry) => entry.text.toLowerCase().split(/\W+/))
    .filter((word) =>
      ["led", "built", "owned", "improved", "delivered", "managed", "launched", "designed", "optimized"].includes(
        word,
      ),
    ).length

  if (!candidateTurns.length) {
    return {
      overview: "No candidate responses captured yet. Start a session to populate transcript, insights, and summary outputs.",
      recommendation: "Begin a screening session before using this workspace for review.",
      strengths: ["Ready for live transcription once the conversation starts."],
      concerns: ["Insufficient evidence to assess communication or role fit signals."],
      recruiterNotes: [
        "Confirm microphone access and backend connectivity.",
        "Use the transcript tab to verify capture quality during the call.",
      ],
    }
  }

  const strengths = [
    strongVerbHits >= 2
      ? "Action-oriented language suggests direct ownership and execution."
      : "Candidate responses include concrete examples that can be validated in follow-up.",
    topics.length
      ? `Discussion touched ${topics.slice(0, 2).join(" and ")}.`
      : "Transcript contains enough material for recruiter review.",
  ]

  const concerns = [
    averageCandidateLength < 9
      ? "Candidate responses were brief; schedule follow-up questions for deeper evidence."
      : "Review transcript for depth against the specific role scorecard.",
  ]

  if (!topics.includes("Technical depth")) {
    concerns.push("Technical depth was not strongly surfaced in the captured conversation.")
  }

  const recommendation =
    candidateTurns.length >= 3 && strongVerbHits >= 2
      ? "Review the transcript and advance if role-specific requirements match the captured examples."
      : "Keep the candidate in review and run a deeper follow-up on missing role signals."

  return {
    overview: `Captured ${candidateTurns.length} candidate responses and ${aiTurns.length} assistant prompts. The session produced structured transcript context for recruiter review.`,
    recommendation,
    strengths,
    concerns,
    recruiterNotes: [
      topics.length ? `Topics covered: ${topics.join(", ")}.` : "Topics covered remain broad and should be clarified.",
      `Average candidate response length: ${averageCandidateLength || 0} words.`,
      "Use transcript evidence before making shortlist decisions.",
    ],
  }
}

function getInsights(entries: TranscriptEntry[]) {
  const candidateTurns = entries.filter((entry) => entry.speaker === "Candidate")
  const candidateWordCount = candidateTurns.reduce((total, entry) => total + countWords(entry.text), 0)
  const averageCandidateLength = candidateTurns.length
    ? Math.round(candidateWordCount / candidateTurns.length)
    : 0
  const strongVerbHits = candidateTurns
    .flatMap((entry) => entry.text.toLowerCase().split(/\W+/))
    .filter((word) =>
      ["led", "built", "owned", "improved", "delivered", "managed", "launched", "designed", "optimized"].includes(
        word,
      ),
    ).length
  const topics = extractTopics(entries)

  return [
    {
      label: "Communication clarity",
      value:
        averageCandidateLength >= 14
          ? "Detailed"
          : averageCandidateLength >= 8
            ? "Balanced"
            : candidateTurns.length
              ? "Brief"
              : "Waiting",
      detail:
        candidateTurns.length
          ? `Average candidate response length is ${averageCandidateLength} words.`
          : "This will score once candidate answers are captured.",
      tone: "violet" as InsightTone,
      icon: MessageSquare,
    },
    {
      label: "Ownership signals",
      value: strongVerbHits >= 3 ? "Strong" : strongVerbHits >= 1 ? "Emerging" : candidateTurns.length ? "Light" : "Waiting",
      detail:
        strongVerbHits >= 1
          ? `Ownership-oriented language appeared ${strongVerbHits} time${strongVerbHits > 1 ? "s" : ""}.`
          : "No strong ownership verbs have been captured yet.",
      tone: "cyan" as InsightTone,
      icon: Target,
    },
    {
      label: "Role-fit topics",
      value: topics.length ? `${topics.length} detected` : "Pending",
      detail: topics.length ? topics.join(", ") : "Relevant topic clusters appear after the discussion gets underway.",
      tone: "emerald" as InsightTone,
      icon: Brain,
    },
  ]
}

function getStatusView(params: {
  error: string
  isConnecting: boolean
  isCallActive: boolean
  isListening: boolean
  isProcessing: boolean
  isAISpeaking: boolean
  isMicOn: boolean
  hasCompletedSession: boolean
}) {
  if (params.error && !params.isCallActive) {
    return {
      label: "Needs attention",
      description: "Resolve setup or connectivity before starting the session.",
      badgeClassName: "border-red-400/20 bg-red-400/10 text-red-200",
    }
  }

  if (params.isConnecting) {
    return {
      label: "Connecting",
      description: "Checking backend health and preparing microphone capture.",
      badgeClassName: "border-violet-400/20 bg-violet-400/10 text-violet-200",
    }
  }

  if (params.isProcessing) {
    return {
      label: "Processing",
      description: "The assistant is generating a response and updating the session.",
      badgeClassName: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    }
  }

  if (params.isAISpeaking) {
    return {
      label: "AI speaking",
      description: "Audio playback is active. Candidate speech can interrupt when needed.",
      badgeClassName: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    }
  }

  if (params.isCallActive && params.isListening && params.isMicOn) {
    return {
      label: "Listening",
      description: "Transcript capture is live and ready for candidate responses.",
      badgeClassName: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    }
  }

  if (params.isCallActive && !params.isMicOn) {
    return {
      label: "Mic paused",
      description: "The session is open, but microphone capture is temporarily disabled.",
      badgeClassName: "border-white/15 bg-white/[0.06] text-white/70",
    }
  }

  if (params.hasCompletedSession) {
    return {
      label: "Conversation ended",
      description: "Review the transcript, insights, and summary panels.",
      badgeClassName: "border-white/15 bg-white/[0.06] text-white/75",
    }
  }

  return {
    label: "Ready",
    description: "Start a new AI interview session when you are ready to capture the conversation.",
    badgeClassName: "border-white/15 bg-white/[0.06] text-white/75",
  }
}

function MetaBadge({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60">
      {children}
    </div>
  )
}

function WorkflowStep({
  label,
  state,
}: {
  label: string
  state: "complete" | "current" | "upcoming"
}) {
  const stateClasses =
    state === "complete"
      ? "border-emerald-400/25 bg-emerald-400/12 text-emerald-200"
      : state === "current"
        ? "border-violet-400/25 bg-violet-400/12 text-violet-200"
        : "border-white/10 bg-white/[0.03] text-white/45"

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${stateClasses}`}>
      <div className="text-[11px] uppercase tracking-[0.2em] opacity-70">Stage</div>
      <div className="mt-2 font-medium">{label}</div>
    </div>
  )
}

function InsightCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: ReturnType<typeof getInsights>[number]) {
  const toneClasses =
    tone === "cyan"
      ? "bg-cyan-400/12 text-cyan-200"
      : tone === "emerald"
        ? "bg-emerald-400/12 text-emerald-200"
        : "bg-violet-400/12 text-violet-200"

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 ${toneClasses}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70">
          {value}
        </div>
      </div>
      <div className="mt-3 text-sm leading-7 text-white/58">{detail}</div>
    </div>
  )
}

export default function VoiceAgentPage() {
  const { isComplete } = useAnalysis()
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
  const [speechSupported, setSpeechSupported] = useState(true)
  const [activeTab, setActiveTab] = useState("transcript")
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([])
  const [liveTranscript, setLiveTranscript] = useState("")
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [sessionEndedAt, setSessionEndedAt] = useState<number | null>(null)
  const [hasCompletedSession, setHasCompletedSession] = useState(false)
  const [clockTick, setClockTick] = useState(Date.now())
  const voiceServerUrl = process.env.NEXT_PUBLIC_VOICE_SERVER_URL || "http://localhost:5000"

  const httpClientRef = useRef<HTTPClient | null>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const speechStartTimeRef = useRef<number>(0)
  const bargeInTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCallActiveRef = useRef(false)
  const isMicOnRef = useRef(true)
  const isListeningRef = useRef(false)
  const isAISpeakingRef = useRef(false)
  const intentionalDisconnectRef = useRef(false)
  const isSuppressedByAIRef = useRef(false)
  const isBargeInWindowRef = useRef(false)
  const bargeInWindowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const detectBrowser = () => {
    if (typeof navigator === "undefined") return "Unknown"
    const ua = navigator.userAgent
    if (ua.includes("Edg/")) return "Edge"
    if (ua.includes("Chrome/")) return "Chrome"
    if (ua.includes("Firefox/")) return "Firefox"
    if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari"
    return "Unknown"
  }

  const runSpeechNetworkDiagnostics = async () => {
    const browser = detectBrowser()
    const online = typeof navigator !== "undefined" ? navigator.onLine : false
    const secureContext = typeof window !== "undefined" ? window.isSecureContext : false

    let microphonePermission = "unknown"
    try {
      if (typeof navigator !== "undefined" && "permissions" in navigator && typeof navigator.permissions?.query === "function") {
        const permission = await navigator.permissions.query({ name: "microphone" as PermissionName })
        microphonePermission = permission.state
      }
    } catch {
      // ignore permissions API errors
    }

    let backendHealth = "unreachable"
    try {
      const response = await fetch(`${voiceServerUrl}/health`)
      backendHealth = String(response.status)
    } catch {
      // backend diagnostics are best-effort only
    }

    const hints: string[] = []
    if (!online) hints.push("Device appears offline.")
    if (!secureContext) hints.push("Speech API requires HTTPS/secure context.")
    if (microphonePermission === "denied") hints.push("Microphone permission is denied.")
    if (browser !== "Chrome" && browser !== "Edge") hints.push("Use Chrome or Edge for stable Web Speech support.")
    if (backendHealth === "unreachable") hints.push("Voice backend is not reachable from the browser.")
    hints.push("If these look correct, your network/VPN/ad blocker is likely blocking the browser speech service.")

    return `Speech network diagnostic: browser=${browser}; online=${online ? "yes" : "no"}; secure=${secureContext ? "yes" : "no"}; mic=${microphonePermission}; backendHealth=${backendHealth}. ${hints.join(" ")}`
  }

  useEffect(() => {
    isCallActiveRef.current = isCallActive
  }, [isCallActive])

  useEffect(() => {
    isMicOnRef.current = isMicOn
  }, [isMicOn])

  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  useEffect(() => {
    isAISpeakingRef.current = isAISpeaking
  }, [isAISpeaking])

  useEffect(() => {
    if (!sessionStartedAt || sessionEndedAt) return

    const interval = setInterval(() => {
      setClockTick(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionEndedAt, sessionStartedAt])

  useEffect(() => {
    const appendTranscriptEntry = (speaker: TranscriptEntry["speaker"], text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      setTranscriptEntries((current) => [
        ...current,
        {
          id: `${speaker}-${Date.now()}-${current.length}`,
          speaker,
          text: trimmed,
          timestamp: Date.now(),
        },
      ])
    }

    httpClientRef.current = new HTTPClient({
      serverUrl: voiceServerUrl,
      onPlaybackEnded: () => {
        if (bargeInWindowTimerRef.current) {
          clearTimeout(bargeInWindowTimerRef.current)
          bargeInWindowTimerRef.current = null
        }
        isSuppressedByAIRef.current = false
        isBargeInWindowRef.current = false
        setIsAISpeaking(false)
        setLiveTranscript("")
        // AI finished naturally — short pause for echo tail, then resume mic
        setTimeout(() => {
          if (isCallActiveRef.current && isMicOnRef.current && !isAISpeakingRef.current) {
            void startSpeechRecognition()
          }
        }, 400)
      },
      onAIResponse: (response: string) => {
        const normalized = response.toLowerCase()

        setAiResponse(response)

        if (normalized.includes("processing your request") || normalized.includes("still processing")) {
          setIsProcessing(true)
          setIsAISpeaking(false)
          return
        }

        if (normalized.includes("connected!") || normalized.includes("ready!") || normalized.includes("send a message")) {
          setIsProcessing(false)
          setIsAISpeaking(false)
          return
        }

        setIsProcessing(false)
        setIsAISpeaking(true)
        isSuppressedByAIRef.current = true
        isBargeInWindowRef.current = false
        stopSpeechRecognition()

        // Phase 1: lockout (1500ms) — mic is off so AI voice can't echo into recognition
        // Phase 2: watchdog — mic re-enables so the user CAN barge in
        if (bargeInWindowTimerRef.current) clearTimeout(bargeInWindowTimerRef.current)
        bargeInWindowTimerRef.current = setTimeout(() => {
          bargeInWindowTimerRef.current = null
          if (isAISpeakingRef.current && isCallActiveRef.current && isMicOnRef.current) {
            isSuppressedByAIRef.current = false
            isBargeInWindowRef.current = true
            void startSpeechRecognition()
          }
        }, 1500)

        if (!systemResponseFragments.some((fragment) => normalized.includes(fragment))) {
          appendTranscriptEntry("AI", response)
        }
      },
      onConnectionChange: (connected: boolean) => {
        setIsConnected(connected)
        setIsCallActive(connected)
        setIsProcessing(false)
        setIsAISpeaking(false)

        if (connected) {
          intentionalDisconnectRef.current = false
          setError("")
          return
        }

        if (!intentionalDisconnectRef.current) {
          setError((current) => current || "Disconnected from the voice server.")
        }
      },
      onError: (errorMessage: string) => {
        if (!errorMessage.toLowerCase().includes("disconnected")) {
          setError(errorMessage)
        }
        setIsProcessing(false)
        setIsAISpeaking(false)
      },
    })

    if (typeof window !== "undefined") {
      const speechWindow = window as SpeechRecognitionWindow
      const SpeechRecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition

      if (SpeechRecognitionCtor) {
        recognitionRef.current = new SpeechRecognitionCtor()
      } else {
        setSpeechSupported(false)
        setError("Speech recognition is not supported in this browser. Use Chrome or Edge.")
      }
    }

    return () => {
      httpClientRef.current?.disconnect()

      if (bargeInWindowTimerRef.current) {
        clearTimeout(bargeInWindowTimerRef.current)
        bargeInWindowTimerRef.current = null
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore cleanup stop errors
        }
      }

      if (bargeInTimeoutRef.current) {
        clearTimeout(bargeInTimeoutRef.current)
        bargeInTimeoutRef.current = null
      }
    }
  }, [])

  const stopSpeechRecognition = () => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.stop()
      setIsListening(false)
      setLiveTranscript("")
    } catch {
      // ignore repeated stop calls from browsers that reject them
    }
  }

  const handleBargeIn = async () => {
    // Kill the lockout timer so it doesn't restart mic on top of us
    if (bargeInWindowTimerRef.current) {
      clearTimeout(bargeInWindowTimerRef.current)
      bargeInWindowTimerRef.current = null
    }
    await httpClientRef.current?.interrupt()
    httpClientRef.current?.stopAudioPlayback()
    isSuppressedByAIRef.current = false
    isBargeInWindowRef.current = false
    setIsAISpeaking(false)
    setAiResponse("")
    speechStartTimeRef.current = 0

    if (bargeInTimeoutRef.current) {
      clearTimeout(bargeInTimeoutRef.current)
      bargeInTimeoutRef.current = null
    }
  }

  const startSpeechRecognition = async () => {
    const recognition = recognitionRef.current
    if (!recognition) return

    try {
      if (isListeningRef.current) {
        stopSpeechRecognition()
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      setError("")
      await new Promise((resolve) => setTimeout(resolve, 200))

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onstart = () => setIsListening(true)

      recognition.onend = () => {
        setIsListening(false)

        // Do NOT auto-restart during lockout — barge-in window timer or onPlaybackEnded will restart
        if (isCallActiveRef.current && isMicOnRef.current && !isSuppressedByAIRef.current) {
          // Shorter delay in barge-in window so watchdog stays responsive
          const restartDelay = isBargeInWindowRef.current ? 300 : 1000
          bargeInTimeoutRef.current = setTimeout(() => {
            if (
              recognitionRef.current &&
              isCallActiveRef.current &&
              isMicOnRef.current &&
              !isListeningRef.current &&
              !isSuppressedByAIRef.current
            ) {
              recognitionRef.current.start()
            }
          }, restartDelay)
        }
      }

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finalTranscript = ""
        let interimTranscript = ""

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0].transcript
          if (event.results[index].isFinal) finalTranscript += transcript
          else interimTranscript += transcript
        }

        setLiveTranscript(interimTranscript.trim())

        if (interimTranscript.trim().length > 0 && isAISpeakingRef.current && isMicOnRef.current) {
          const currentTime = Date.now()
          if (!speechStartTimeRef.current) speechStartTimeRef.current = currentTime

          if (currentTime - speechStartTimeRef.current > 500) {
            void handleBargeIn()
            return
          }
        } else if (!interimTranscript.trim()) {
          speechStartTimeRef.current = 0
        }

        if (finalTranscript.trim() && isMicOnRef.current && !isAISpeakingRef.current) {
          const finalMessage = finalTranscript.trim()
          setUserSpeech(finalMessage)
          setLiveTranscript("")
          setTranscriptEntries((current) => [
            ...current,
            {
              id: `candidate-${Date.now()}-${current.length}`,
              speaker: "Candidate",
              text: finalMessage,
              timestamp: Date.now(),
            },
          ])

          speechStartTimeRef.current = 0

          if (bargeInTimeoutRef.current) {
            clearTimeout(bargeInTimeoutRef.current)
            bargeInTimeoutRef.current = null
          }

          void httpClientRef.current?.sendTextMessage(finalMessage).catch(() => {
            setError("Failed to send your message. Please check the voice server is running.")
          })
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorLike) => {
        speechStartTimeRef.current = 0
        setLiveTranscript("")

        if (bargeInTimeoutRef.current) {
          clearTimeout(bargeInTimeoutRef.current)
          bargeInTimeoutRef.current = null
        }

        // Browsers can emit "aborted" during intentional stop/restart cycles.
        if (event.error === "no-speech" || event.error === "aborted") return

        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setError("Microphone permission denied.")
        } else if (event.error === "audio-capture") {
          setError("No microphone was found.")
        } else if (event.error === "network") {
          console.error("[SpeechRecognition] network error", {
            online: typeof navigator !== "undefined" ? navigator.onLine : "unknown",
            secure: typeof window !== "undefined" ? window.isSecureContext : "unknown",
            voiceServerUrl,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          })

          setIsListening(false)
          setError("Speech recognition network issue detected. Running diagnostics...")
          void runSpeechNetworkDiagnostics()
            .then((message) => setError(message))
            .catch(() => setError("Speech recognition network issue detected, and diagnostics could not complete."))
          return
        } else if (event.error === "service-not-allowed") {
          setError("Speech recognition service is blocked for this browser profile. Use Chrome or Edge and allow speech services.")
        } else if (event.error === "language-not-supported") {
          setError("Speech recognition language is not supported in this browser.")
        } else {
          setError(`Speech recognition error: ${event.error}. Please refresh and try again.`)
        }

        setIsListening(false)
      }

      recognition.start()
    } catch {
      setError("Could not start speech recognition. Please refresh and try again.")
    }
  }

  const handleStartListening = async () => {
    if (!httpClientRef.current || !speechSupported) return

    intentionalDisconnectRef.current = false
    setError("")
    setUserSpeech("")
    setAiResponse("")
    setLiveTranscript("")
    setTranscriptEntries([])
    setIsMicOn(true)
    setIsConnecting(true)
    setIsProcessing(false)
    setIsAISpeaking(false)
    setHasCompletedSession(false)
    setSessionStartedAt(null)
    setSessionEndedAt(null)
    setActiveTab("transcript")

    try {
      await httpClientRef.current.connect()
      setSessionStartedAt(Date.now())
      setClockTick(Date.now())
      await startSpeechRecognition()
    } catch {
      setError("Unable to connect to the voice server. Make sure the backend is running and try again.")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleEndCall = async () => {
    intentionalDisconnectRef.current = true
    speechStartTimeRef.current = 0
    setLiveTranscript("")

    if (bargeInWindowTimerRef.current) {
      clearTimeout(bargeInWindowTimerRef.current)
      bargeInWindowTimerRef.current = null
    }
    isSuppressedByAIRef.current = false
    isBargeInWindowRef.current = false

    if (bargeInTimeoutRef.current) {
      clearTimeout(bargeInTimeoutRef.current)
      bargeInTimeoutRef.current = null
    }

    if (isAISpeakingRef.current) {
      await httpClientRef.current?.interrupt()
    }

    httpClientRef.current?.stopAudioPlayback()
    stopSpeechRecognition()
    httpClientRef.current?.disconnect()

    setIsConnected(false)
    setIsAISpeaking(false)
    setIsProcessing(false)
    setIsCallActive(false)
    setIsConnecting(false)
    setSessionEndedAt(Date.now())
    setHasCompletedSession(true)
    setActiveTab("summary")
  }

  const handleToggleMic = () => {
    const nextMicState = !isMicOn
    setIsMicOn(nextMicState)

    if (nextMicState && isCallActive) {
      setTimeout(() => {
        // During AI lockout phase, skip — the lockout timer will restart mic when safe
        if (!isSuppressedByAIRef.current) {
          void startSpeechRecognition()
        }
      }, 300)
      return
    }

    stopSpeechRecognition()
    speechStartTimeRef.current = 0

    if (bargeInTimeoutRef.current) {
      clearTimeout(bargeInTimeoutRef.current)
      bargeInTimeoutRef.current = null
    }
  }

  const statusView = getStatusView({
    error,
    isConnecting,
    isCallActive,
    isListening,
    isProcessing,
    isAISpeaking,
    isMicOn,
    hasCompletedSession,
  })
  const sessionDurationMs = sessionStartedAt ? (sessionEndedAt ?? clockTick) - sessionStartedAt : 0
  const summary = getSummary(transcriptEntries, sessionDurationMs)
  const insights = getInsights(transcriptEntries)
  const candidateTurns = transcriptEntries.filter((entry) => entry.speaker === "Candidate").length
  const aiTurns = transcriptEntries.filter((entry) => entry.speaker === "AI").length
  const topics = extractTopics(transcriptEntries)
  const progressPercentage = hasCompletedSession ? 100 : isCallActive ? Math.min(88, 48 + transcriptEntries.length * 8) : 18
  const latestActivity = isProcessing
    ? "Assistant is processing the latest candidate response."
    : isAISpeaking
      ? "Assistant audio playback is active."
      : liveTranscript
        ? "Candidate speech is being transcribed live."
        : aiResponse || "Session activity will appear here."

  /* ── ACCESS GUARD ── */
  if (!isComplete) {
    return (
      <ProductShell currentPath="/voice-agent">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="relative mx-auto w-full max-w-lg">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute -inset-12 rounded-full bg-violet-500/10 blur-[80px]" />

            <div className="relative flex flex-col items-center gap-8 rounded-[28px] border border-white/10 bg-white/[0.03] px-8 py-14 text-center backdrop-blur-sm">
              {/* Lock icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <Lock className="h-7 w-7 text-white/40" />
              </div>

              {/* Copy */}
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  Voice Agent Locked
                </h2>
                <p className="max-w-sm text-sm leading-7 text-white/50">
                  The AI Voice Agent requires a completed CV analysis to operate.
                  Run an analysis first to load candidate context and unlock this workspace.
                </p>
              </div>

              {/* Steps */}
              <div className="w-full space-y-2.5">
                {[
                  { n: "01", label: "Upload candidate CV" },
                  { n: "02", label: "Select a job description" },
                  { n: "03", label: "Run analysis — Voice Agent unlocks" },
                ].map(({ n, label }) => (
                  <div
                    key={n}
                    className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.025] px-5 py-3.5 text-left"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-400/12 text-[10px] font-bold text-violet-300">
                      {n}
                    </span>
                    <span className="text-sm text-white/65">{label}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button
                asChild
                size="lg"
                className="w-full rounded-full bg-[#7A4DFF] text-white shadow-[0_16px_40px_rgba(122,77,255,0.28)] hover:bg-[#6a3ff2]"
              >
                <Link href="/analyzer">Go to CV Analyzer</Link>
              </Button>
            </div>
          </div>
        </div>
      </ProductShell>
    )
  }

  return (
    <ProductShell currentPath="/voice-agent" mainClassName="space-y-8 md:space-y-10">

      {/* ── PAGE HEADER ── */}
      <section>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              Voice interview workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              AI Voice Agent
            </h1>
            <p className="max-w-2xl text-base leading-8 text-white/60">
              Run live AI screening conversations with real-time transcription, interruption support, and recruiter-ready review panels.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <div className={`rounded-full border px-4 py-2 text-sm font-medium ${statusView.badgeClassName}`}>
              {statusView.label}
            </div>
            <div className="flex flex-wrap gap-2">
              <MetaBadge>Live transcription</MetaBadge>
              <MetaBadge>Recruiter workflow</MetaBadge>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section>
        <ProductPanel className="p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Shield className="h-4 w-4 text-violet-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Session</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {isCallActive ? "Live" : hasCompletedSession ? "Done" : "Ready"}
                </div>
                <div className="mt-0.5 text-xs text-white/38">
                  {isCallActive ? "In progress" : hasCompletedSession ? "Review ready" : "Not started"}
                </div>
              </div>
            </div>
            <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <MessageSquare className="h-4 w-4 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Turns</div>
                <div className="mt-1 text-lg font-semibold text-white">{transcriptEntries.length}</div>
                <div className="mt-0.5 text-xs text-white/38">{candidateTurns}C · {aiTurns}AI</div>
              </div>
            </div>
            <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Brain className="h-4 w-4 text-violet-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Topics</div>
                <div className="mt-1 text-lg font-semibold text-white">{topics.length}</div>
                <div className="mt-0.5 truncate text-xs text-white/38">{topics.length ? topics[0] : "Pending"}</div>
              </div>
            </div>
            <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <BarChart3 className="h-4 w-4 text-cyan-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Progress</div>
                <div className="mt-1 text-lg font-semibold text-white">{Math.round(progressPercentage)}%</div>
                <div className="mt-1.5 h-1 rounded-full bg-white/[0.06]">
                  <div
                    className="h-1 rounded-full bg-[linear-gradient(90deg,#7A4DFF,#67E8F9)] transition-[width] duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </ProductPanel>
      </section>

      {/* ── MAIN WORKSPACE ── */}
      <section className="grid gap-6 xl:grid-cols-2">

        {/* LEFT: SESSION CONTROLS */}
        <ProductPanel className="p-5 md:p-6">
          <div className="space-y-5">

            {/* Panel header */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">Live session</div>
                <div className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-white">Session controls</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60">
                {isCallActive ? "In progress" : hasCompletedSession ? "Review ready" : "Pre-session"}
              </div>
            </div>

            {/* Workflow steps */}
            <div className="grid grid-cols-3 gap-2">
              <WorkflowStep label="Setup" state={sessionStartedAt ? "complete" : "current"} />
              <WorkflowStep
                label="Interview"
                state={isCallActive ? "current" : hasCompletedSession ? "complete" : "upcoming"}
              />
              <WorkflowStep label="Review" state={hasCompletedSession ? "current" : "upcoming"} />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-[22px] border border-red-400/20 bg-red-400/8 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <div>
                    <div className="text-sm font-medium text-red-200">Session notice</div>
                    <div className="mt-1 text-sm leading-6 text-red-100/80">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* PRE-SESSION */}
            {!isCallActive && !hasCompletedSession && !isConnecting && (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(122,77,255,0.12),rgba(255,255,255,0.02))] p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/12 text-violet-200">
                      <PlayCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white">Start a guided screening session</div>
                      <div className="mt-1.5 text-sm leading-6 text-white/55">
                        HR Advisor opens a live session, captures the conversation in real time, and organizes transcript context for recruiter review.
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      { title: "1. Connect", description: "Confirm voice backend and mic are ready." },
                      { title: "2. Interview", description: "Speak naturally while transcript updates live." },
                      { title: "3. Review", description: "Use transcript and summary panels post-call." },
                    ].map((item) => (
                      <div key={item.title} className="rounded-2xl border border-white/8 bg-black/20 p-3">
                        <div className="text-xs font-semibold text-white">{item.title}</div>
                        <div className="mt-1 text-xs leading-5 text-white/48">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Shield className="h-4 w-4 text-violet-200" />
                      What to expect
                    </div>
                    <ul className="mt-3 space-y-2.5 text-xs text-white/52">
                      {[
                        "Transcript preserved for recruiter review.",
                        "Barge-in lets the candidate interrupt naturally.",
                        "Minimal interface noise during the session.",
                      ].map((item) => (
                        <li key={item} className="flex gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Shield className="h-4 w-4 text-cyan-200" />
                      Setup notes
                    </div>
                    <ul className="mt-3 space-y-2.5 text-xs text-white/52">
                      {[
                        "Keep the voice backend running.",
                        "Use Chrome or Edge for speech recognition.",
                        "Grant mic permission before starting.",
                      ].map((item) => (
                        <li key={item} className="flex gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full rounded-full bg-[#7A4DFF] text-white shadow-[0_16px_40px_rgba(122,77,255,0.28)] hover:bg-[#6a3ff2]"
                  onClick={() => void handleStartListening()}
                  disabled={!speechSupported || isConnecting || isConnected}
                >
                  <Mic className="h-4 w-4" />
                  Start Conversation
                </Button>
              </div>
            )}

            {/* CONNECTING */}
            {isConnecting && (
              <div className="rounded-[24px] border border-violet-400/18 bg-violet-400/10 p-5">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-violet-200" />
                  <div className="text-base font-semibold text-white">Preparing the session</div>
                </div>
                <div className="mt-2 text-sm leading-6 text-white/58">
                  Checking backend availability and initializing speech recognition.
                </div>
              </div>
            )}

            {/* ACTIVE CALL */}
            {isCallActive && (
              <div className="space-y-4">
                <WaveformVisualizer
                  isActive={(isMicOn && isListening) || isAISpeaking}
                  variant={isAISpeaking ? "speaking" : "listening"}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Candidate input</div>
                    <div className="mt-2 line-clamp-3 text-sm leading-6 text-white/65">
                      {liveTranscript || userSpeech || "Waiting for candidate speech…"}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Session activity</div>
                    <div className="mt-2 line-clamp-3 text-sm leading-6 text-white/65">{latestActivity}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Mic</div>
                    <div className="mt-1.5 text-sm font-semibold text-white">{isMicOn ? "On" : "Muted"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">AI state</div>
                    <div className="mt-1.5 text-sm font-semibold text-white">
                      {isAISpeaking ? "Speaking" : isProcessing ? "Processing" : "Idle"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Capture</div>
                    <div className="mt-1.5 text-sm font-semibold text-white">
                      {candidateTurns ? "Live" : "Waiting"}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 rounded-full border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
                    onClick={handleToggleMic}
                  >
                    {isMicOn ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isMicOn ? "Mute mic" : "Unmute"}
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 rounded-full border border-red-400/20 bg-red-400/10 text-red-100 hover:bg-red-400/18"
                    onClick={() => void handleEndCall()}
                  >
                    <PhoneOff className="h-4 w-4" />
                    End session
                  </Button>
                </div>
              </div>
            )}

            {/* COMPLETED */}
            {hasCompletedSession && !isCallActive && (
              <div className="animate-fade-in-up space-y-4">
                <div className="rounded-[24px] border border-emerald-400/18 bg-emerald-400/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/12 text-emerald-200">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white">Session complete</div>
                      <div className="mt-1.5 line-clamp-2 text-sm leading-6 text-white/60">{summary.overview}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Recommended next step</div>
                  <div className="mt-2 text-sm leading-6 text-white/62">{summary.recommendation}</div>
                </div>

                <div className="space-y-2">
                  <Button
                    size="lg"
                    className="w-full rounded-full bg-[#7A4DFF] text-white shadow-[0_16px_40px_rgba(122,77,255,0.28)] hover:bg-[#6a3ff2]"
                    onClick={() => void handleStartListening()}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Start New Session
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
                      onClick={() => setActiveTab("transcript")}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Transcript
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
                      onClick={() => setActiveTab("insights")}
                    >
                      <BarChart3 className="h-4 w-4" />
                      AI Insights
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ProductPanel>

        {/* RIGHT: REVIEW PANEL */}
        <ProductPanel className="p-5 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">Review panel</div>
                <div className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-white">Transcript & insights</div>
              </div>
              <TabsList className="h-auto w-full shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-1 sm:w-auto">
                <TabsTrigger value="transcript" className="rounded-full px-3 py-1.5 text-xs text-white/60 data-[state=active]:bg-white data-[state=active]:text-[#09090f]">
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="insights" className="rounded-full px-3 py-1.5 text-xs text-white/60 data-[state=active]:bg-white data-[state=active]:text-[#09090f]">
                  Insights
                </TabsTrigger>
                <TabsTrigger value="summary" className="rounded-full px-3 py-1.5 text-xs text-white/60 data-[state=active]:bg-white data-[state=active]:text-[#09090f]">
                  Summary
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TRANSCRIPT TAB */}
            <TabsContent value="transcript">
              <div className="max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
                {!transcriptEntries.length && !liveTranscript && (
                  <div className="rounded-[22px] border border-dashed border-white/12 bg-black/20 p-5 text-sm leading-7 text-white/48">
                    The transcript panel stays empty until the conversation starts. Candidate and assistant turns appear here with timestamps for later review.
                  </div>
                )}
                {transcriptEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-[22px] border p-4 ${
                      entry.speaker === "Candidate"
                        ? "border-violet-400/16 bg-violet-400/8"
                        : "border-cyan-400/16 bg-cyan-400/8"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${entry.speaker === "Candidate" ? "text-violet-300" : "text-cyan-300"}`}>
                        {entry.speaker}
                      </div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/70">{entry.text}</div>
                  </div>
                ))}
                {liveTranscript && (
                  <div className="rounded-[22px] border border-dashed border-violet-400/18 bg-violet-400/8 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200">
                        Candidate speaking
                      </div>
                      <div className="text-[10px] text-violet-100/50">Live</div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/70">{liveTranscript}</div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* INSIGHTS TAB */}
            <TabsContent value="insights">
              <div className="space-y-4">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/52">
                  Live insights are directional signals derived from the transcript — not final hiring decisions.
                </div>
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <InsightCard key={insight.label} {...insight} />
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Brain className="h-4 w-4 text-violet-200" />
                      Topics
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(topics.length ? topics : ["No topics captured yet"]).map((topic) => (
                        <div
                          key={topic}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60"
                        >
                          {topic}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Target className="h-4 w-4 text-cyan-200" />
                      Review guidance
                    </div>
                    <ul className="mt-3 space-y-2 text-xs text-white/52">
                      {[
                        "Confirm examples before advancing the candidate.",
                        "Look for role-specific depth beyond ownership language.",
                        "Capture follow-up questions while fresh.",
                      ].map((item) => (
                        <li key={item} className="flex gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* SUMMARY TAB */}
            <TabsContent value="summary">
              <div key={hasCompletedSession ? "completed" : "empty"} className="animate-result-in space-y-3">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <FileText className="h-4 w-4 text-violet-200" />
                    Session overview
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/58">{summary.overview}</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Next step</div>
                    <div className="mt-2 text-sm leading-6 text-white/58">{summary.recommendation}</div>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Recruiter notes</div>
                    <ul className="mt-2 space-y-2 text-xs text-white/52">
                      {summary.recruiterNotes.map((note) => (
                        <li key={note} className="flex gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Sparkles className="h-4 w-4 text-violet-200" />
                      Strengths
                    </div>
                    <ul className="mt-3 space-y-2 text-xs text-white/52">
                      {summary.strengths.map((item) => (
                        <li key={item} className="flex gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <AlertCircle className="h-4 w-4 text-cyan-200" />
                      Concerns
                    </div>
                    <ul className="mt-3 space-y-2 text-xs text-white/52">
                      {summary.concerns.map((item) => (
                        <li key={item} className="flex gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ProductPanel>

      </section>
    </ProductShell>
  )
}
