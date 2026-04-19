"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  FileText,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
} from "lucide-react"

import { ProductPanel, ProductShell } from "@/components/product-shell"
import { WaveformVisualizer } from "@/components/WaveformVisualizer"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HTTPClient } from "@/lib/http-client"
import { useAnalysis } from "@/context/analysis-context"

type TranscriptEntry = {
  id: string
  speaker: "Candidate" | "AI"
  text: string
  timestamp: number
}

type InsightTone = "violet" | "cyan" | "emerald"
type VoiceState = "idle" | "listening" | "processing" | "speaking" | "closed"

type SummaryView = {
  overview: string
  recommendation: string
  strengths: string[]
  concerns: string[]
  recruiterNotes: string[]
}

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

function getSummary(entries: TranscriptEntry[]): SummaryView {
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
        "Speak in a quiet room and avoid speaker feedback.",
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
      : "Review transcript depth against the specific role scorecard.",
  ]

  if (!topics.includes("Technical depth")) {
    concerns.push("Technical depth was not strongly surfaced in the captured conversation.")
  }

  const recommendation =
    candidateTurns.length >= 3 && strongVerbHits >= 2
      ? "Review transcript and advance if role-specific requirements match captured examples."
      : "Keep the candidate in review and run a deeper follow-up on missing role signals."

  return {
    overview: `Captured ${candidateTurns.length} candidate responses and ${aiTurns.length} assistant prompts for recruiter review.`,
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
      description: "Opening WebRTC session and microphone stream.",
      badgeClassName: "border-violet-400/20 bg-violet-400/10 text-violet-200",
    }
  }

  if (params.isProcessing) {
    return {
      label: "Processing",
      description: "The assistant is generating a response from the latest utterance.",
      badgeClassName: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    }
  }

  if (params.isAISpeaking) {
    return {
      label: "AI speaking",
      description: "Audio playback is active.",
      badgeClassName: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    }
  }

  if (params.isCallActive && params.isListening && params.isMicOn) {
    return {
      label: "Listening",
      description: "Backend VAD/STT is active and ready for candidate responses.",
      badgeClassName: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    }
  }

  if (params.isCallActive && !params.isMicOn) {
    return {
      label: "Mic paused",
      description: "Session is open, but local microphone is muted.",
      badgeClassName: "border-white/15 bg-white/[0.06] text-white/70",
    }
  }

  if (params.hasCompletedSession) {
    return {
      label: "Conversation ended",
      description: "Review transcript, insights, and summary.",
      badgeClassName: "border-white/15 bg-white/[0.06] text-white/75",
    }
  }

  return {
    label: "Ready",
    description: "Start a new AI interview session when you are ready.",
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
  const voiceServerUrl = process.env.NEXT_PUBLIC_VOICE_SERVER_URL || "http://localhost:5000"

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
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [sessionEndedAt, setSessionEndedAt] = useState<number | null>(null)
  const [hasCompletedSession, setHasCompletedSession] = useState(false)
  const [clockTick, setClockTick] = useState(Date.now())

  const clientRef = useRef<HTTPClient | null>(null)
  const intentionalDisconnectRef = useRef(false)
  const isCallActiveRef = useRef(false)
  const isMicOnRef = useRef(true)
  const lastCandidateTextRef = useRef("")
  const lastCandidateAtRef = useRef(0)

  useEffect(() => {
    isCallActiveRef.current = isCallActive
  }, [isCallActive])

  useEffect(() => {
    isMicOnRef.current = isMicOn
  }, [isMicOn])

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

    clientRef.current = new HTTPClient({
      serverUrl: voiceServerUrl,
      onAIResponse: (response) => {
        if (!response.trim()) return
        setAiResponse(response)
        appendTranscriptEntry("AI", response)
      },
      onCandidateTranscription: (text) => {
        const trimmed = text.trim()
        if (!trimmed) return

        const now = Date.now()
        const normalized = trimmed.toLowerCase().replace(/\s+/g, " ").trim()
        if (normalized === lastCandidateTextRef.current && now - lastCandidateAtRef.current < 2000) {
          return
        }

        lastCandidateTextRef.current = normalized
        lastCandidateAtRef.current = now
        setUserSpeech(trimmed)
        appendTranscriptEntry("Candidate", trimmed)
      },
      onStateChange: (state: VoiceState) => {
        setIsProcessing(state === "processing")
        setIsAISpeaking(state === "speaking")
        setIsListening(state === "listening" && isCallActiveRef.current && isMicOnRef.current)
      },
      onPlaybackEnded: () => {
        setIsAISpeaking(false)
      },
      onConnectionChange: (connected) => {
        setIsConnected(connected)
        setIsCallActive(connected)
        if (!connected) {
          setIsListening(false)
          setIsProcessing(false)
          setIsAISpeaking(false)
          if (!intentionalDisconnectRef.current) {
            setError((current) => current || "Disconnected from the voice server.")
          }
        }
      },
      onError: (message) => {
        if (intentionalDisconnectRef.current) return
        setError(message)
      },
    })

    if (typeof window !== "undefined") {
      const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia
      const hasWebRTC = typeof RTCPeerConnection !== "undefined"
      if (!hasGetUserMedia || !hasWebRTC) {
        setSpeechSupported(false)
        setError("This browser does not support WebRTC microphone sessions.")
      }
    }

    return () => {
      intentionalDisconnectRef.current = true
      clientRef.current?.disconnect()
    }
  }, [voiceServerUrl])

  const handleStartListening = async () => {
    if (!clientRef.current || !speechSupported) return

    intentionalDisconnectRef.current = false
    lastCandidateTextRef.current = ""
    lastCandidateAtRef.current = 0

    setError("")
    setUserSpeech("")
    setAiResponse("")
    setTranscriptEntries([])
    setIsMicOn(true)
    setIsConnecting(true)
    setIsProcessing(false)
    setIsAISpeaking(false)
    setIsListening(false)
    setHasCompletedSession(false)
    setSessionStartedAt(null)
    setSessionEndedAt(null)
    setActiveTab("transcript")

    try {
      await clientRef.current.connect()
      setSessionStartedAt(Date.now())
      setClockTick(Date.now())
      setIsListening(true)
    } catch {
      setError("Unable to connect to the voice backend. Ensure backend and tunnel are running.")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleEndCall = () => {
    intentionalDisconnectRef.current = true
    clientRef.current?.disconnect()

    setIsConnected(false)
    setIsCallActive(false)
    setIsListening(false)
    setIsProcessing(false)
    setIsAISpeaking(false)
    setIsMicOn(false)
    setSessionEndedAt(Date.now())
    setHasCompletedSession(true)
    setActiveTab("summary")
  }

  const handleToggleMic = () => {
    const nextMicState = !isMicOn
    setIsMicOn(nextMicState)
    clientRef.current?.setMicEnabled(nextMicState)
    if (!nextMicState) {
      setIsListening(false)
    } else if (isCallActive && !isProcessing && !isAISpeaking) {
      setIsListening(true)
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
  const summary = getSummary(transcriptEntries)
  const insights = getInsights(transcriptEntries)
  const candidateTurns = transcriptEntries.filter((entry) => entry.speaker === "Candidate").length
  const aiTurns = transcriptEntries.filter((entry) => entry.speaker === "AI").length
  const topics = extractTopics(transcriptEntries)
  const progressPercentage = hasCompletedSession ? 100 : isCallActive ? Math.min(88, 48 + transcriptEntries.length * 8) : 18
  const latestActivity = isProcessing
    ? "Assistant is processing the latest candidate response."
    : isAISpeaking
      ? "Assistant audio playback is active."
      : isListening
        ? "Listening for candidate response."
        : aiResponse || "Session activity will appear here."

  if (!isComplete) {
    return (
      <ProductShell currentPath="/voice-agent">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="relative mx-auto w-full max-w-lg">
            <div className="pointer-events-none absolute -inset-12 rounded-full bg-violet-500/10 blur-[80px]" />
            <div className="relative flex flex-col items-center gap-8 rounded-[28px] border border-white/10 bg-white/[0.03] px-8 py-14 text-center backdrop-blur-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <Lock className="h-7 w-7 text-white/40" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">Voice Agent Locked</h2>
                <p className="max-w-sm text-sm leading-7 text-white/50">
                  The AI Voice Agent requires a completed CV analysis to operate. Run an analysis first to load candidate context.
                </p>
              </div>
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
      <section>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              Voice interview workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">AI Voice Agent</h1>
            <p className="max-w-2xl text-base leading-8 text-white/60">
              Fully backend-driven WebRTC session with server-side VAD, transcription, and response generation.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <div className={`rounded-full border px-4 py-2 text-sm font-medium ${statusView.badgeClassName}`}>{statusView.label}</div>
            <div className="flex flex-wrap gap-2">
              <MetaBadge>WebRTC transport</MetaBadge>
              <MetaBadge>Backend STT/LLM/TTS</MetaBadge>
            </div>
          </div>
        </div>
      </section>

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

      <section className="grid gap-6 xl:grid-cols-2">
        <ProductPanel className="p-5 md:p-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">Live session</div>
                <div className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-white">Session controls</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60">
                {isCallActive ? "In progress" : hasCompletedSession ? "Review ready" : "Pre-session"}
              </div>
            </div>

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

            {!isCallActive && !hasCompletedSession && !isConnecting && (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(122,77,255,0.12),rgba(255,255,255,0.02))] p-5">
                  <div className="text-base font-semibold text-white">Start a backend-driven screening session</div>
                  <div className="mt-1.5 text-sm leading-6 text-white/55">
                    Browser streams mic audio with WebRTC only. Backend handles segmentation, STT, LLM, and TTS.
                  </div>
                  <ul className="mt-4 space-y-2.5 text-xs text-white/52">
                    {[
                      "No frontend MediaRecorder chunking or local VAD.",
                      "Single final transcript event per utterance.",
                      "Server-side barge-in and response orchestration.",
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
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

            {isConnecting && (
              <div className="rounded-[24px] border border-violet-400/18 bg-violet-400/10 p-5">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-violet-200" />
                  <div className="text-base font-semibold text-white">Preparing the session</div>
                </div>
                <div className="mt-2 text-sm leading-6 text-white/58">
                  Negotiating WebRTC and initializing server-side voice pipeline.
                </div>
              </div>
            )}

            {isCallActive && (
              <div className="space-y-4">
                <WaveformVisualizer
                  isActive={(isMicOn && isListening) || isAISpeaking}
                  variant={isAISpeaking ? "speaking" : "listening"}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Candidate input</div>
                    <div className="mt-2 line-clamp-3 text-sm leading-6 text-white/65">{userSpeech || "Waiting for candidate speech…"}</div>
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
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Duration</div>
                    <div className="mt-1.5 text-sm font-semibold text-white">{formatDuration(sessionDurationMs)}</div>
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
                    onClick={handleEndCall}
                  >
                    <PhoneOff className="h-4 w-4" />
                    End session
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ProductPanel>

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

            <TabsContent value="transcript">
              <div className="max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
                {!transcriptEntries.length && (
                  <div className="rounded-[22px] border border-dashed border-white/12 bg-black/20 p-5 text-sm leading-7 text-white/48">
                    Transcript entries appear after backend finalizes candidate utterances.
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
                    <div className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${entry.speaker === "Candidate" ? "text-violet-300" : "text-cyan-300"}`}>
                      {entry.speaker}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/70">{entry.text}</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="insights">
              <div className="space-y-4">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/52">
                  Live insights are directional signals derived from transcript, not final hiring decisions.
                </div>
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <InsightCard key={insight.label} {...insight} />
                  ))}
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Target className="h-4 w-4 text-cyan-200" />
                    Review guidance
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-white/52">
                    {[
                      "Confirm examples before advancing the candidate.",
                      "Validate role-specific depth beyond ownership language.",
                      "Capture follow-up questions while context is fresh.",
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summary">
              <div className="space-y-3">
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
              </div>
            </TabsContent>
          </Tabs>
        </ProductPanel>
      </section>
    </ProductShell>
  )
}

