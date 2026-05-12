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
  Sparkles,
  Target,
} from "lucide-react"

import { ProductShell } from "@/components/product-shell"
import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb"
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
      ["led", "built", "owned", "improved", "delivered", "managed", "launched", "designed", "optimized"].includes(word),
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
      ["led", "built", "owned", "improved", "delivered", "managed", "launched", "designed", "optimized"].includes(word),
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
      detail: candidateTurns.length
        ? `Average candidate response length is ${averageCandidateLength} words.`
        : "This will score once candidate answers are captured.",
      tone: "violet" as InsightTone,
      icon: MessageSquare,
    },
    {
      label: "Ownership signals",
      value: strongVerbHits >= 3 ? "Strong" : strongVerbHits >= 1 ? "Emerging" : candidateTurns.length ? "Light" : "Waiting",
      detail: strongVerbHits >= 1
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

function MetaBadge({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/50">
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
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 ${toneClasses}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70">
          {value}
        </div>
      </div>
      <div className="mt-3 text-sm leading-7 text-white/55">{detail}</div>
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
    setActiveTab("transcript")
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

  const sessionDurationMs = sessionStartedAt ? (sessionEndedAt ?? clockTick) - sessionStartedAt : 0
  const summary = getSummary(transcriptEntries)
  const insights = getInsights(transcriptEntries)
  const candidateTurns = transcriptEntries.filter((entry) => entry.speaker === "Candidate").length
  const aiTurns = transcriptEntries.filter((entry) => entry.speaker === "AI").length
  const topics = extractTopics(transcriptEntries)

  // ── Locked screen ──────────────────────────────────────────────────────────
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
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  Voice Agent Locked
                </h2>
                <p className="max-w-sm text-sm leading-7 text-white/50">
                  The AI Voice Agent requires a completed CV analysis to operate.
                  Run an analysis first to load candidate context and unlock this workspace.
                </p>
              </div>
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

  // ── Main voice interface ───────────────────────────────────────────────────
  return (
    <ProductShell currentPath="/voice-agent" mainClassName="flex flex-col items-center pb-20">

      {/* ── ORB HERO ──────────────────────────────────────────────────────── */}
      <div className="relative mt-10 mb-6 flex items-center justify-center">
        {/* Ambient glow that reacts to session state */}
        <div
          className={`pointer-events-none absolute inset-0 rounded-full blur-[80px] transition-all duration-1000 ${
            isCallActive && isListening && isMicOn
              ? "scale-125 bg-violet-500/25 opacity-100"
              : isAISpeaking
                ? "scale-125 bg-cyan-500/20 opacity-100"
                : isConnecting
                  ? "scale-110 bg-violet-500/15 opacity-100"
                  : "scale-100 bg-violet-500/8 opacity-60"
          }`}
        />
        <div className="relative h-80 w-80 md:h-[22rem] md:w-[22rem]">
          <VoicePoweredOrb
            enableVoiceControl={isCallActive && isMicOn && isListening}
            hue={isAISpeaking ? 180 : 0}
            voiceSensitivity={1.8}
            maxRotationSpeed={1.2}
            maxHoverIntensity={0.8}
            className="rounded-full overflow-hidden"
          />
        </div>
      </div>

      {/* ── PRE-SESSION ───────────────────────────────────────────────────── */}
      {!isCallActive && !hasCompletedSession && !isConnecting && (
        <div className="flex flex-col items-center gap-6 text-center px-4 max-w-md w-full">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">
              AI Voice Agent
            </h1>
            <p className="text-sm leading-7 text-white/45">
              Click the button to start a live screening session. Speak naturally — the orb responds to your voice in real time.
            </p>
          </div>

          {error && (
            <div className="w-full rounded-2xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-left">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            </div>
          )}

          <Button
            size="lg"
            className="rounded-full bg-white px-8 py-3 text-[#09090f] font-medium shadow-[0_16px_40px_rgba(255,255,255,0.12)] hover:bg-white/90 transition-all"
            onClick={() => void handleStartListening()}
            disabled={!speechSupported || isConnecting || isConnected}
          >
            <Mic className="h-4 w-4 mr-2" />
            Start Recording
          </Button>

          <p className="text-xs text-white/30 leading-6">
            Click the button to enable voice control. Speak to see the orb respond to your voice with subtle movements.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <MetaBadge>Live transcription</MetaBadge>
            <MetaBadge>Barge-in support</MetaBadge>
            <MetaBadge>Recruiter workflow</MetaBadge>
          </div>
        </div>
      )}

      {/* ── CONNECTING ────────────────────────────────────────────────────── */}
      {isConnecting && (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <RefreshCw className="h-4 w-4 animate-spin text-violet-300" />
            Preparing the session…
          </div>
        </div>
      )}

      {/* ── ACTIVE CALL ───────────────────────────────────────────────────── */}
      {isCallActive && (
        <div className="flex w-full max-w-md flex-col items-center gap-5 px-4">
          {/* Latest speech bubbles */}
          <div className="w-full space-y-2.5">
            {aiResponse && (
              <div className="rounded-2xl border border-cyan-400/16 bg-cyan-400/8 px-4 py-3">
                <div className="mb-1 text-[10px] uppercase tracking-[0.22em] text-cyan-300">AI</div>
                <div className="line-clamp-2 text-sm leading-6 text-white/70">{aiResponse}</div>
              </div>
            )}
            {userSpeech && (
              <div className="rounded-2xl border border-violet-400/16 bg-violet-400/8 px-4 py-3">
                <div className="mb-1 text-[10px] uppercase tracking-[0.22em] text-violet-300">You</div>
                <div className="line-clamp-2 text-sm leading-6 text-white/70">{userSpeech}</div>
              </div>
            )}
            {!aiResponse && !userSpeech && (
              <p className="text-center text-sm text-white/30">Listening for the conversation…</p>
            )}
          </div>

          {error && (
            <div className="w-full rounded-2xl border border-red-400/20 bg-red-400/8 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-white/15 bg-white/[0.03] px-6 text-white hover:bg-white/[0.08] hover:text-white"
              onClick={handleToggleMic}
            >
              {isMicOn ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
              {isMicOn ? "Mute" : "Unmute"}
            </Button>
            <Button
              size="lg"
              className="rounded-full border border-red-400/20 bg-red-400/10 px-6 text-red-100 hover:bg-red-400/18"
              onClick={() => void handleEndCall()}
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              End Session
            </Button>
          </div>

          {/* Session micro-stats */}
          <div className="flex gap-4 text-xs text-white/30">
            <span>{transcriptEntries.length} turns</span>
            <span>·</span>
            <span>{formatDuration(sessionDurationMs)}</span>
            <span>·</span>
            <span>{isAISpeaking ? "AI speaking" : isProcessing ? "Processing" : isListening ? "Listening" : "Idle"}</span>
          </div>
        </div>
      )}

      {/* ── COMPLETED ─────────────────────────────────────────────────────── */}
      {hasCompletedSession && !isCallActive && (
        <div className="flex w-full max-w-2xl flex-col items-center gap-6 px-4">

          {/* Session stats row */}
          <div className="grid w-full grid-cols-3 gap-3">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-center">
              <div className="text-2xl font-semibold text-white">{candidateTurns}</div>
              <div className="mt-1 text-xs text-white/38">Candidate turns</div>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-center">
              <div className="text-2xl font-semibold text-white">{topics.length}</div>
              <div className="mt-1 text-xs text-white/38">Topics detected</div>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-center">
              <div className="text-xl font-semibold text-white">{formatDuration(sessionDurationMs)}</div>
              <div className="mt-1 text-xs text-white/38">Duration</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              size="lg"
              className="rounded-full bg-[#7A4DFF] px-6 text-white shadow-[0_16px_40px_rgba(122,77,255,0.28)] hover:bg-[#6a3ff2]"
              onClick={() => void handleStartListening()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </div>

          {/* Review tabs */}
          <div className="w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="h-auto w-full rounded-full border border-white/10 bg-white/[0.04] p-1">
                <TabsTrigger
                  value="transcript"
                  className="flex-1 rounded-full px-3 py-1.5 text-xs text-white/60 data-[state=active]:bg-white data-[state=active]:text-[#09090f]"
                >
                  Transcript
                </TabsTrigger>
                <TabsTrigger
                  value="insights"
                  className="flex-1 rounded-full px-3 py-1.5 text-xs text-white/60 data-[state=active]:bg-white data-[state=active]:text-[#09090f]"
                >
                  Insights
                </TabsTrigger>
                <TabsTrigger
                  value="summary"
                  className="flex-1 rounded-full px-3 py-1.5 text-xs text-white/60 data-[state=active]:bg-white data-[state=active]:text-[#09090f]"
                >
                  Summary
                </TabsTrigger>
              </TabsList>

              {/* TRANSCRIPT TAB */}
              <TabsContent value="transcript">
                <div className="max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
                  {!transcriptEntries.length && (
                    <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-white/40">
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
                      <div className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${entry.speaker === "Candidate" ? "text-violet-300" : "text-cyan-300"}`}>
                        {entry.speaker}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-white/70">{entry.text}</div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* INSIGHTS TAB */}
              <TabsContent value="insights">
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-white/45">
                    Live insights are directional signals derived from the transcript — not final hiring decisions.
                  </div>
                  <div className="space-y-3">
                    {insights.map((insight) => (
                      <InsightCard key={insight.label} {...insight} />
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Brain className="h-4 w-4 text-violet-200" />
                        Topics
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(topics.length ? topics : ["No topics captured yet"]).map((topic) => (
                          <div
                            key={topic}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55"
                          >
                            {topic}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Target className="h-4 w-4 text-cyan-200" />
                        Review guidance
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-white/48">
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
                <div className="space-y-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <FileText className="h-4 w-4 text-violet-200" />
                      Session overview
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/55">{summary.overview}</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Next step</div>
                      <div className="mt-2 text-sm leading-6 text-white/55">{summary.recommendation}</div>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Recruiter notes</div>
                      <ul className="mt-2 space-y-2 text-xs text-white/48">
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
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Sparkles className="h-4 w-4 text-violet-200" />
                        Strengths
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-white/48">
                        {summary.strengths.map((item) => (
                          <li key={item} className="flex gap-2.5">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <AlertCircle className="h-4 w-4 text-cyan-200" />
                        Concerns
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-white/48">
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
          </div>
        </div>
      )}

    </ProductShell>
  )
}
