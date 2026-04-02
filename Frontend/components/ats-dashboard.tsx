"use client"

import { useState } from "react"
import {
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, RefreshCw,
  Download, Briefcase, GraduationCap, Code2, Target, Star,
  BookOpen, Lightbulb, Award, Zap, Users, BarChart3, Brain,
  ChevronRight, ChevronDown, ChevronUp, FileText, AlertCircle,
  MessageSquare, ClipboardList, Shield, Layers,
} from "lucide-react"

/* ─────────────────────────────────────────────────────────────
   CSS  (animations + hover helpers — inline-style only project)
───────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
@keyframes ats-fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ats-ring-draw {
  from { stroke-dashoffset: var(--circ); }
}
.ats-up  { animation: ats-fade-up .42s cubic-bezier(.4,0,.2,1) both; }
.ats-card:hover {
  border-color: rgba(255,255,255,0.12) !important;
  background:   rgba(255,255,255,0.045) !important;
  transform:    translateY(-1px);
}
.ats-tab-btn:hover  { color: rgba(255,255,255,.75) !important; }
.ats-icon-btn:hover { background: rgba(255,255,255,.07) !important; }
.ats-chip:hover     { opacity: .82; }
`

/* ─────────────────────────────────────────────────────────────
   TYPES  — new rich structure (+ legacy fallback fields)
───────────────────────────────────────────────────────────── */
interface MatchedSkill {
  jd_skill: string
  cv_skill: string
  match_type?: string
  evidence?: string
  confidence?: number
  similarity?: number        // legacy
}

interface PriorityItem {
  priority: number
  action: string
  reason: string
}

interface SkillGroup {
  group: string
  skills: string[]
}

interface ScoreBreakdown {
  skill_score?: number
  experience_score?: number
  education_score?: number
  soft_skill_score?: number
  responsibility_alignment_score?: number
  domain_fit_score?: number
  impact_score?: number
  resume_quality_score?: number
}

interface JDAnalysis {
  job_title?: string
  job_summary?: string
  requirements?: string[]
  responsibilities?: string[]
  tools_and_technologies?: string[]
  domain?: string
  seniority?: string
}

interface LLMAnalysis {
  /* ── new structure ── */
  metadata?: { job_title?: string; created_at?: string }
  evaluation_result?: {
    classification?: string
    final_score?: number
    application_readiness?: string
    headline?: string
    short_verdict?: string
  }
  ats_summary?: {
    headline?: string
    short_verdict?: string
    top_strengths?: string[]
    top_gaps?: string[]
  }
  job_description_analysis?: JDAnalysis
  cv_skills_hard?: string[]
  cv_skills_soft?: string[]
  jd_skills_hard?: string[]
  jd_skills_soft?: string[]
  matched_skills?: MatchedSkill[]
  missing_skills?: string[]
  missing_skills_grouped?: SkillGroup[]
  score_breakdown?: ScoreBreakdown
  candidate_advice?: {
    overall_advice?: string
    priority_improvements?: PriorityItem[]
    cv_improvements?: string[]
    learning_recommendations?: string[]
    interview_tips?: string[]
  }
  insights?: { strengths?: string[]; gaps?: string[]; recommendations?: string[] }

  /* ── legacy (old hr_analyzer) ── */
  final_score?: number
  classification?: string
  skill_score?: number
  experience_score?: number
  education_score?: number
}

export interface DashboardProps {
  llm_analysis: LLMAnalysis
  onReset: () => void
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const safeN = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0

const clamp = (v: number) => Math.max(0, Math.min(100, v))

/** Normalise 0-1 or 0-100 → integer 0-100 */
const pct = (v: unknown) =>
  clamp(Math.round(safeN(v) <= 1 ? safeN(v) * 100 : safeN(v)))

function scoreColor(p: number) {
  if (p >= 85) return "#34d399"
  if (p >= 70) return "#10b981"
  if (p >= 50) return "#fbbf24"
  if (p >= 30) return "#f97316"
  return "#f87171"
}

const MATCH_COLOR: Record<string, string> = {
  exact:    "#34d399",
  synonym:  "#06b6d4",
  semantic: "#a78bfa",
}

const READINESS: Record<string, { color: string; bg: string; label: string }> = {
  "Ready to Apply":                { color: "#34d399", bg: "rgba(52,211,153,.12)",  label: "Ready to Apply" },
  "Apply with Minor Improvements": { color: "#06b6d4", bg: "rgba(6,182,212,.12)",   label: "Minor Improvements Needed" },
  "Apply After Upskilling":        { color: "#fbbf24", bg: "rgba(251,191,36,.12)",  label: "Upskilling Required" },
  "Not Ready Yet":                 { color: "#f87171", bg: "rgba(248,113,113,.12)", label: "Not Ready Yet" },
}

/* ─────────────────────────────────────────────────────────────
   BASE CARD STYLE
───────────────────────────────────────────────────────────── */
const CARD: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.025)",
  transition: "border-color .2s ease, background .2s ease, transform .2s ease",
}

/* ─────────────────────────────────────────────────────────────
   RING
───────────────────────────────────────────────────────────── */
function Ring({
  value, size, stroke, color, label, large,
}: {
  value: number; size: number; stroke: number
  color: string; label?: string; large?: boolean
}) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (value / 100) * circ
  const cx   = size / 2

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* track */}
          <circle cx={cx} cy={cx} r={r} fill="none"
            stroke="rgba(255,255,255,0.055)" strokeWidth={stroke} />
          {/* glow ring behind */}
          <circle cx={cx} cy={cx} r={r} fill="none"
            stroke={color} strokeWidth={stroke + 4} opacity={0.07}
            strokeDasharray={circ} strokeDashoffset={off} />
          {/* main arc */}
          <circle cx={cx} cy={cx} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={off}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 ${large ? 14 : 7}px ${color}99)`,
              transition: "stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1)",
            }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: large ? "1.8rem" : "0.88rem",
            fontWeight: 900, color: "white", lineHeight: 1,
          }}>
            {value}%
          </span>
          {large && (
            <span style={{
              fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.16em", color: "rgba(255,255,255,0.35)", marginTop: 4,
            }}>
              match
            </span>
          )}
        </div>
      </div>
      {label && (
        <span style={{
          fontSize: "0.54rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.18em", color: "rgba(255,255,255,0.32)", textAlign: "center",
        }}>
          {label}
        </span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SCORE BAR
───────────────────────────────────────────────────────────── */
function ScoreBar({
  label, value, color, icon: Icon,
}: {
  label: string; value: number; color: string; icon?: React.ElementType
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {Icon && <Icon style={{ width: 10, height: 10, color, opacity: 0.85 }} />}
          <span style={{
            fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.13em", color: "rgba(255,255,255,0.38)",
          }}>
            {label}
          </span>
        </div>
        <span style={{ fontSize: "0.7rem", fontWeight: 900, color: scoreColor(value) }}>
          {value}%
        </span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.055)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 10px ${color}55`,
          borderRadius: 99,
          transition: "width 1.3s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   STATUS CHIP
───────────────────────────────────────────────────────────── */
function StatusChip({
  icon: Icon, tone, label, value,
}: {
  icon: React.ElementType; tone: "pass" | "warn" | "fail"
  label: string; value: string
}) {
  const t = {
    pass: { bg: "rgba(52,211,153,.07)",  border: "rgba(52,211,153,.18)",  txt: "#6ee7b7" },
    warn: { bg: "rgba(251,191,36,.07)",  border: "rgba(251,191,36,.2)",   txt: "#fde68a" },
    fail: { bg: "rgba(248,113,113,.07)", border: "rgba(248,113,113,.2)",  txt: "#fca5a5" },
  }[tone]

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: t.bg, border: `1px solid ${t.border}`,
      borderRadius: 12, padding: "12px 16px", color: t.txt,
    }}>
      <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
      <div>
        <p style={{
          fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.18em", opacity: 0.65, margin: "0 0 2px",
        }}>
          {label}
        </p>
        <p style={{ fontSize: "0.76rem", fontWeight: 600, margin: 0 }}>{value}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SECTION LABEL
───────────────────────────────────────────────────────────── */
function SectionLabel({
  children, icon: Icon, color = "#7A4DFF", mb = 14,
}: {
  children: React.ReactNode; icon?: React.ElementType
  color?: string; mb?: number
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: mb }}>
      {Icon && <Icon style={{ width: 12, height: 12, color }} />}
      <span style={{
        fontSize: "0.56rem", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.22em", color: "rgba(255,255,255,0.28)",
      }}>
        {children}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MATCH CARD
───────────────────────────────────────────────────────────── */
function MatchCard({ m, idx }: { m: MatchedSkill; idx: number }) {
  const rawConf = m.confidence ?? (m.similarity != null ? m.similarity : null)
  const conf    = rawConf != null ? pct(rawConf) : null
  const mtype   = (m.match_type ?? "").toLowerCase()
  const typeCol = MATCH_COLOR[mtype] ?? "#9B6FFF"

  return (
    <div
      className="ats-card"
      style={{
        ...CARD, padding: 16, cursor: "default",
        animationDelay: `${idx * 0.035}s`,
      }}
    >
      {/* top row */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: "0.5rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.2em", color: "#7A4DFF", margin: "0 0 4px",
          }}>
            JD Requirement
          </p>
          <p style={{
            fontSize: "0.82rem", fontWeight: 700, color: "white",
            margin: 0, lineHeight: 1.4, wordBreak: "break-word",
          }}>
            {m.jd_skill}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
          {mtype && (
            <span style={{
              fontSize: "0.58rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6,
              color: typeCol, background: `${typeCol}16`, border: `1px solid ${typeCol}30`,
              textTransform: "capitalize",
            }}>
              {mtype}
            </span>
          )}
          {conf !== null && (
            <span style={{ fontSize: "0.58rem", fontWeight: 800, color: scoreColor(conf) }}>
              {conf}% conf.
            </span>
          )}
        </div>
      </div>

      {/* cv skill */}
      <div style={{
        background: "rgba(255,255,255,0.03)", borderRadius: 10,
        padding: "9px 12px", marginBottom: m.evidence ? 10 : 0,
      }}>
        <p style={{
          fontSize: "0.5rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.18em", color: "rgba(255,255,255,0.22)", margin: "0 0 3px",
        }}>
          Found in CV
        </p>
        <p style={{
          fontSize: "0.78rem", fontWeight: 500,
          color: "rgba(255,255,255,0.72)", margin: 0, lineHeight: 1.4,
        }}>
          {m.cv_skill}
        </p>
      </div>

      {/* evidence */}
      {m.evidence && (
        <div style={{
          borderLeft: "2px solid rgba(122,77,255,0.5)",
          background: "rgba(122,77,255,0.06)",
          borderRadius: "0 8px 8px 0", padding: "8px 12px",
        }}>
          <p style={{
            fontSize: "0.65rem", color: "rgba(255,255,255,0.42)",
            fontStyle: "italic", lineHeight: 1.7, margin: 0,
          }}>
            "{m.evidence}"
          </p>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SKILL GROUP  (collapsible)
───────────────────────────────────────────────────────────── */
function SkillGroup({ group, skills, idx }: { group: string; skills: string[]; idx: number }) {
  const [open, setOpen] = useState(true)

  return (
    <div
      className="ats-card"
      style={{ ...CARD, overflow: "hidden", animationDelay: `${idx * 0.055}s` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "13px 16px",
          background: "none", border: "none", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "white" }}>{group}</span>
          <span style={{
            fontSize: "0.58rem", fontWeight: 700, padding: "2px 8px",
            borderRadius: 99, color: "#f87171", background: "rgba(248,113,113,0.12)",
          }}>
            {skills.length}
          </span>
        </div>
        {open
          ? <ChevronUp  style={{ width: 13, height: 13, color: "rgba(255,255,255,0.3)" }} />
          : <ChevronDown style={{ width: 13, height: 13, color: "rgba(255,255,255,0.3)" }} />
        }
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexWrap: "wrap", gap: 7 }}>
          {skills.map((s, i) => (
            <span key={i} style={{
              fontSize: "0.72rem", fontWeight: 600, padding: "5px 12px", borderRadius: 8,
              border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.07)",
              color: "#fca5a5", cursor: "default",
            }}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PRIORITY CARD
───────────────────────────────────────────────────────────── */
const PRIORITY_COLORS = ["#f87171", "#fbbf24", "#7A4DFF", "#06b6d4", "#34d399"]

function PriorityCard({ item, idx }: { item: PriorityItem; idx: number }) {
  const c = PRIORITY_COLORS[idx % PRIORITY_COLORS.length]
  return (
    <div className="ats-card" style={{ ...CARD, padding: "14px 16px", display: "flex", gap: 12 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: `${c}16`, border: `1px solid ${c}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 900, color: c }}>{item.priority}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: "0.8rem", fontWeight: 700, color: "white",
          margin: "0 0 5px", lineHeight: 1.4,
        }}>
          {item.action}
        </p>
        <p style={{
          fontSize: "0.7rem", color: "rgba(255,255,255,0.42)",
          margin: 0, lineHeight: 1.55,
        }}>
          {item.reason}
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   BULLET LIST ITEM
───────────────────────────────────────────────────────────── */
function ListItem({ text, color }: { text: string; color: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{
        width: 5, height: 5, borderRadius: "50%", background: color,
        flexShrink: 0, marginTop: 7,
      }} />
      <span style={{
        fontSize: "0.76rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.65,
      }}>
        {text}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SIDEBAR ITEM  (strength / gap row)
───────────────────────────────────────────────────────────── */
function SidebarItem({ text, icon: Icon, color }: {
  text: string; icon: React.ElementType; color: string
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <Icon style={{ width: 12, height: 12, color, flexShrink: 0, marginTop: 3 }} />
      <span style={{
        fontSize: "0.73rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5,
      }}>
        {text}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────────────────────── */
function EmptyState({ icon: Icon, text, green }: {
  icon: React.ElementType; text: string; green?: boolean
}) {
  return (
    <div style={{ padding: "56px 20px", textAlign: "center" }}>
      <Icon style={{
        width: 38, height: 38, margin: "0 auto 12px", display: "block",
        color: green ? "rgba(52,211,153,0.35)" : "rgba(255,255,255,0.09)",
      }} />
      <p style={{
        fontSize: "0.78rem", color: "rgba(255,255,255,0.27)",
        fontStyle: "italic", margin: 0, lineHeight: 1.65,
      }}>
        {text}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PILL BADGE
───────────────────────────────────────────────────────────── */
function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: "0.65rem", fontWeight: 600, padding: "4px 11px", borderRadius: 8,
      background: `${color}12`, border: `1px solid ${color}28`, color,
    }}>
      {label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────────────────────── */
export function ATSDashboard({ llm_analysis: raw, onReset }: DashboardProps) {

  const [activeTab, setActiveTab] = useState<"matches" | "missing" | "advice" | "insights">("matches")

  /* ── normalise data (new rich format + legacy fallback) ──── */
  const evalR   = raw?.evaluation_result
  const ats     = raw?.ats_summary
  const jd      = raw?.job_description_analysis
  const sb      = raw?.score_breakdown
  const adv     = raw?.candidate_advice
  const ins     = raw?.insights

  const matched     = raw?.matched_skills          ?? []
  const missing     = raw?.missing_skills           ?? []
  const grouped     = raw?.missing_skills_grouped   ?? []
  const priorities  = adv?.priority_improvements    ?? []
  const cvImprov    = adv?.cv_improvements          ?? []
  const learnRecs   = adv?.learning_recommendations ?? []
  const interviewTips = adv?.interview_tips         ?? []
  const strengths   = ins?.strengths                ?? []
  const insGaps     = ins?.gaps                     ?? []
  const recs        = ins?.recommendations          ?? []
  const topStr      = ats?.top_strengths            ?? []
  const topGaps     = ats?.top_gaps                 ?? []

  /* final score */
  const rawScore = evalR?.final_score ?? raw?.final_score ?? 0
  const fp       = pct(rawScore)
  const mc       = scoreColor(fp)

  const classification = evalR?.classification ?? raw?.classification ?? "N/A"
  const headline       = evalR?.headline       ?? ats?.headline        ?? ""
  const verdict        = evalR?.short_verdict  ?? ats?.short_verdict   ?? ""
  const readiness      = evalR?.application_readiness ?? ""
  const rdCfg          = READINESS[readiness] ?? { color: "#9B6FFF", bg: "rgba(155,111,255,0.12)", label: readiness }

  /* 8-dimension scores */
  const skillP   = pct(sb?.skill_score                       ?? raw?.skill_score       ?? 0)
  const expP     = pct(sb?.experience_score                  ?? raw?.experience_score   ?? 0)
  const eduP     = pct(sb?.education_score                   ?? raw?.education_score    ?? 0)
  const softP    = pct(sb?.soft_skill_score                  ?? 0)
  const respP    = pct(sb?.responsibility_alignment_score    ?? 0)
  const domainP  = pct(sb?.domain_fit_score                  ?? 0)
  const impactP  = pct(sb?.impact_score                      ?? 0)
  const resumeP  = pct(sb?.resume_quality_score              ?? 0)

  const hasExpIssue = expP < 60
  const hasEduIssue = eduP < 60
  const gapCount    = missing.length

  const jobTitle  = jd?.job_title  ?? raw?.metadata?.job_title ?? ""
  const domain    = jd?.domain     ?? ""
  const seniority = jd?.seniority  ?? ""

  const TABS = [
    { id: "matches",  label: "Matched Skills",   count: matched.length,  color: "#34d399" },
    { id: "missing",  label: "Missing Skills",   count: gapCount,        color: "#f87171" },
    { id: "advice",   label: "Candidate Advice", count: priorities.length, color: "#7A4DFF" },
    { id: "insights", label: "Insights",         count: strengths.length + insGaps.length, color: "#06b6d4" },
  ] as const

  /* default verdict copy */
  const defaultVerdict =
    fp >= 75 ? "Strong semantic alignment with the job description — the candidate is well-positioned for this role."
  : fp >= 50 ? "Moderate alignment detected. The candidate meets many criteria but notable gaps remain."
  :            "Significant gaps found across key dimensions. Targeted upskilling is recommended."

  /* ─────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ━━━ HEADER ━━━ */}
        <div className="ats-up" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <h2 style={{
              fontSize: "1.2rem", fontWeight: 900, margin: "0 0 3px",
              letterSpacing: "-0.025em", color: "white",
            }}>
              Analysis Results
            </h2>
            <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>
              Flair NER · Keyword Matching · Azure OpenAI GPT-4.1 · RAG-Ready Output
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onReset}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#6d38f5,#9B6FFF)",
                color: "white", fontSize: "0.78rem", fontWeight: 700,
                boxShadow: "0 0 24px rgba(122,77,255,0.38), 0 2px 8px rgba(0,0,0,0.25)",
                transition: "box-shadow .2s, opacity .2s",
              }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} />
              New Analysis
            </button>
            <button
              className="ats-icon-btn"
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 20px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                background: "rgba(255,255,255,0.035)", color: "rgba(255,255,255,0.6)",
                fontSize: "0.78rem", fontWeight: 600, transition: "background .15s",
              }}
            >
              <Download style={{ width: 13, height: 13 }} />
              Export
            </button>
          </div>
        </div>

        {/* ━━━ HERO CARD ━━━ */}
        <div
          className="ats-up"
          style={{ ...CARD, padding: "28px 28px", position: "relative", overflow: "hidden", animationDelay: ".05s" }}
        >
          {/* glow blobs */}
          <div style={{
            position: "absolute", top: -90, right: -90, width: 340, height: 340,
            borderRadius: "50%", pointerEvents: "none",
            background: `radial-gradient(circle, ${mc}1a 0%, transparent 68%)`,
          }} />
          <div style={{
            position: "absolute", bottom: -50, left: 80, width: 200, height: 200,
            borderRadius: "50%", pointerEvents: "none",
            background: "radial-gradient(circle, rgba(122,77,255,0.09) 0%, transparent 70%)",
          }} />

          <div style={{
            position: "relative", zIndex: 1,
            display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center",
          }}>
            {/* big ring */}
            <Ring value={fp} size={158} stroke={12} color={mc} large />

            {/* centre block */}
            <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 13 }}>
              {/* badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{
                  fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.2em", color: "rgba(255,255,255,0.32)",
                }}>
                  Overall Match
                </span>
                <span style={{
                  fontSize: "0.65rem", fontWeight: 700, padding: "4px 12px",
                  borderRadius: 999, color: mc, background: `${mc}18`, border: `1px solid ${mc}38`,
                }}>
                  {classification}
                </span>
                {readiness && (
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 700, padding: "4px 12px",
                    borderRadius: 999, color: rdCfg.color, background: rdCfg.bg,
                    border: `1px solid ${rdCfg.color}30`,
                  }}>
                    {rdCfg.label}
                  </span>
                )}
              </div>

              {/* headline */}
              {headline && (
                <h3 style={{
                  fontSize: "1rem", fontWeight: 800, color: "white",
                  margin: 0, lineHeight: 1.35, letterSpacing: "-0.01em",
                }}>
                  {headline}
                </h3>
              )}

              {/* verdict */}
              <p style={{
                fontSize: "0.8rem", color: "rgba(255,255,255,0.48)",
                lineHeight: 1.75, margin: 0, maxWidth: 500,
              }}>
                {verdict || defaultVerdict}
              </p>

              {/* stats row */}
              <div style={{ display: "flex", gap: 24, marginTop: 2 }}>
                {[
                  { n: matched.length,   lbl: "Skills Matched",  c: "#34d399" },
                  { n: gapCount,         lbl: "Skills Missing",  c: gapCount > 0 ? "#f87171" : "#34d399" },
                  { n: priorities.length, lbl: "Action Items",   c: "#7A4DFF" },
                ].map(({ n, lbl, c }) => (
                  <div key={lbl} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: "1.45rem", fontWeight: 900, color: c, lineHeight: 1 }}>{n}</span>
                    <span style={{
                      fontSize: "0.53rem", fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.15em", color: "rgba(255,255,255,0.28)",
                    }}>
                      {lbl}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* mini rings */}
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
              <Ring value={skillP}  size={74} stroke={6} color="#7A4DFF" label="Skills"     />
              <Ring value={expP}    size={74} stroke={6} color="#06b6d4" label="Experience" />
              <Ring value={eduP}    size={74} stroke={6} color="#a78bfa" label="Education"  />
            </div>
          </div>
        </div>

        {/* ━━━ JD STRIP ━━━ */}
        {(jobTitle || domain || seniority || jd?.job_summary) && (
          <div
            className="ats-up"
            style={{ ...CARD, padding: "13px 20px", animationDelay: ".09s" }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <Briefcase style={{ width: 13, height: 13, color: "#7A4DFF", flexShrink: 0 }} />
              {jobTitle && (
                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "white" }}>{jobTitle}</span>
              )}
              {domain    && <Pill label={domain}    color="#c4b5fd" />}
              {seniority && <Pill label={seniority} color="#67e8f9" />}
              {jd?.job_summary && (
                <span style={{
                  fontSize: "0.72rem", color: "rgba(255,255,255,0.35)",
                  lineHeight: 1.5, flex: 1, minWidth: 180,
                }}>
                  {jd.job_summary}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ━━━ STATUS ROW ━━━ */}
        <div
          className="ats-up"
          style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, animationDelay: ".12s" }}
        >
          <StatusChip
            icon={gapCount > 0 ? XCircle : CheckCircle2}
            tone={gapCount > 0 ? "fail" : "pass"}
            label="Hard Skills"
            value={gapCount > 0 ? `${gapCount} gap${gapCount !== 1 ? "s" : ""} detected` : "No critical gaps"}
          />
          <StatusChip
            icon={hasExpIssue ? AlertTriangle : CheckCircle2}
            tone={hasExpIssue ? "warn" : "pass"}
            label="Experience"
            value={hasExpIssue ? "Needs stronger alignment" : "Meets requirements"}
          />
          <StatusChip
            icon={hasEduIssue ? AlertTriangle : CheckCircle2}
            tone={hasEduIssue ? "warn" : "pass"}
            label="Education"
            value={hasEduIssue ? "Below expectation" : "Requirement satisfied"}
          />
        </div>

        {/* ━━━ SCORE BREAKDOWN ━━━ */}
        <div
          className="ats-up"
          style={{ ...CARD, padding: "20px 22px", animationDelay: ".15s" }}
        >
          <SectionLabel icon={BarChart3} mb={16}>Score Breakdown · 8 Dimensions</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 28px" }}>
            <ScoreBar label="Technical Skills"          value={skillP}   color="#7A4DFF" icon={Code2}         />
            <ScoreBar label="Experience Fit"            value={expP}     color="#06b6d4" icon={Briefcase}     />
            <ScoreBar label="Education"                 value={eduP}     color="#a78bfa" icon={GraduationCap} />
            <ScoreBar label="Soft Skills"               value={softP}    color="#34d399" icon={Users}         />
            <ScoreBar label="Responsibility Alignment"  value={respP}    color="#f59e0b" icon={Target}        />
            <ScoreBar label="Domain Fit"                value={domainP}  color="#10b981" icon={Brain}         />
            <ScoreBar label="Impact & Achievements"     value={impactP}  color="#f97316" icon={Zap}           />
            <ScoreBar label="Resume Quality"            value={resumeP}  color="#ec4899" icon={Star}          />
          </div>
        </div>

        {/* ━━━ MAIN GRID ━━━ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 292px", gap: 16, alignItems: "start" }}>

          {/* LEFT — tabbed panel */}
          <div
            className="ats-up"
            style={{ ...CARD, padding: 0, overflow: "hidden", animationDelay: ".19s" }}
          >
            {/* tab bar */}
            <div style={{
              display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)",
              overflowX: "auto",
            }}>
              {TABS.map(t => {
                const active = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    className="ats-tab-btn"
                    onClick={() => setActiveTab(t.id as typeof activeTab)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "14px 20px", whiteSpace: "nowrap",
                      background: "none", border: "none",
                      borderBottom: active ? "2px solid #7A4DFF" : "2px solid transparent",
                      color: active ? "white" : "rgba(255,255,255,0.32)",
                      fontSize: "0.78rem", fontWeight: 700,
                      cursor: "pointer", transition: "color .15s",
                    }}
                  >
                    {t.label}
                    <span style={{
                      fontSize: "0.58rem", fontWeight: 700, padding: "2px 7px",
                      borderRadius: 99, color: t.color, background: `${t.color}18`,
                    }}>
                      {t.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* ── tab content ── */}
            <div style={{ padding: 20 }}>

              {/* MATCHES */}
              {activeTab === "matches" && (
                matched.length > 0
                  ? (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
                      gap: 10,
                    }}>
                      {matched.map((m, i) => <MatchCard key={i} m={m} idx={i} />)}
                    </div>
                  )
                  : <EmptyState icon={FileText} text="No verified skill matches found. Consider tailoring the CV more closely to the job description." />
              )}

              {/* MISSING */}
              {activeTab === "missing" && (
                grouped.length > 0
                  ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <p style={{
                        fontSize: "0.65rem", color: "rgba(255,255,255,0.28)",
                        margin: "0 0 4px", lineHeight: 1.6,
                      }}>
                        Requirements with no supporting evidence in the CV, grouped by category.
                      </p>
                      {grouped.map((g, i) => (
                        <SkillGroup key={i} group={g.group} skills={g.skills} idx={i} />
                      ))}
                    </div>
                  )
                  : missing.length > 0
                    ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {missing.map((s, i) => (
                          <span key={i} style={{
                            fontSize: "0.74rem", fontWeight: 600, padding: "6px 13px",
                            borderRadius: 9, border: "1px solid rgba(248,113,113,0.2)",
                            background: "rgba(248,113,113,0.07)", color: "#fca5a5",
                          }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )
                    : <EmptyState icon={CheckCircle2} text="No missing requirements detected — excellent alignment." green />
              )}

              {/* ADVICE */}
              {activeTab === "advice" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {adv?.overall_advice && (
                    <div>
                      <SectionLabel icon={MessageSquare} color="#7A4DFF">Overall Advice</SectionLabel>
                      <p style={{
                        fontSize: "0.8rem", color: "rgba(255,255,255,0.58)",
                        lineHeight: 1.8, margin: 0,
                      }}>
                        {adv.overall_advice}
                      </p>
                    </div>
                  )}

                  {priorities.length > 0 && (
                    <div>
                      <SectionLabel icon={Target} color="#f87171">Priority Improvements</SectionLabel>
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        {priorities.map((item, i) => <PriorityCard key={i} item={item} idx={i} />)}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 22 }}>
                    {cvImprov.length > 0 && (
                      <div>
                        <SectionLabel icon={FileText} color="#06b6d4">CV Improvements</SectionLabel>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {cvImprov.map((t, i) => <ListItem key={i} text={t} color="#06b6d4" />)}
                        </div>
                      </div>
                    )}
                    {learnRecs.length > 0 && (
                      <div>
                        <SectionLabel icon={BookOpen} color="#a78bfa">Learning Recommendations</SectionLabel>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {learnRecs.map((t, i) => <ListItem key={i} text={t} color="#a78bfa" />)}
                        </div>
                      </div>
                    )}
                    {interviewTips.length > 0 && (
                      <div>
                        <SectionLabel icon={Lightbulb} color="#fbbf24">Interview Tips</SectionLabel>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {interviewTips.map((t, i) => <ListItem key={i} text={t} color="#fbbf24" />)}
                        </div>
                      </div>
                    )}
                  </div>

                  {!adv?.overall_advice && priorities.length === 0 && cvImprov.length === 0 && learnRecs.length === 0 && (
                    <EmptyState icon={MessageSquare} text="No detailed advice generated yet." />
                  )}
                </div>
              )}

              {/* INSIGHTS */}
              {activeTab === "insights" && (
                strengths.length > 0 || insGaps.length > 0 || recs.length > 0
                  ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 22 }}>
                      {strengths.length > 0 && (
                        <div>
                          <SectionLabel icon={Star} color="#34d399">Strengths</SectionLabel>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {strengths.map((t, i) => <ListItem key={i} text={t} color="#34d399" />)}
                          </div>
                        </div>
                      )}
                      {insGaps.length > 0 && (
                        <div>
                          <SectionLabel icon={AlertTriangle} color="#f87171">Gaps</SectionLabel>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {insGaps.map((t, i) => <ListItem key={i} text={t} color="#f87171" />)}
                          </div>
                        </div>
                      )}
                      {recs.length > 0 && (
                        <div>
                          <SectionLabel icon={TrendingUp} color="#7A4DFF">Recommendations</SectionLabel>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {recs.map((t, i) => <ListItem key={i} text={t} color="#7A4DFF" />)}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                  : <EmptyState icon={Brain} text="No detailed insights available yet." />
              )}
            </div>
          </div>

          {/* ━━━ SIDEBAR ━━━ */}
          <div
            className="ats-up"
            style={{ display: "flex", flexDirection: "column", gap: 12, animationDelay: ".23s" }}
          >
            {/* Top Strengths */}
            {topStr.length > 0 && (
              <div style={{ ...CARD, padding: 18 }}>
                <SectionLabel icon={Star} color="#34d399">Top Strengths</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {topStr.slice(0, 5).map((s, i) => (
                    <SidebarItem key={i} text={s} icon={CheckCircle2} color="#34d399" />
                  ))}
                </div>
              </div>
            )}

            {/* Top Gaps */}
            {topGaps.length > 0 && (
              <div style={{ ...CARD, padding: 18 }}>
                <SectionLabel icon={AlertCircle} color="#f87171">Top Gaps</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {topGaps.slice(0, 5).map((s, i) => (
                    <SidebarItem key={i} text={s} icon={XCircle} color="#f87171" />
                  ))}
                </div>
              </div>
            )}

            {/* JD Requirements */}
            {(jd?.requirements?.length ?? 0) > 0 && (
              <div style={{ ...CARD, padding: 18 }}>
                <SectionLabel icon={ClipboardList} color="#06b6d4">JD Requirements</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {jd!.requirements!.slice(0, 6).map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <ChevronRight style={{ width: 10, height: 10, color: "#06b6d4", flexShrink: 0, marginTop: 4 }} />
                      <span style={{
                        fontSize: "0.7rem", color: "rgba(255,255,255,0.52)", lineHeight: 1.55,
                      }}>
                        {r}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JD Tools */}
            {(jd?.tools_and_technologies?.length ?? 0) > 0 && (
              <div style={{ ...CARD, padding: 18 }}>
                <SectionLabel icon={Layers} color="#a78bfa">Required Technologies</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {jd!.tools_and_technologies!.slice(0, 10).map((t, i) => (
                    <span key={i} style={{
                      fontSize: "0.65rem", fontWeight: 600, padding: "4px 10px", borderRadius: 7,
                      background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)",
                      color: "#c4b5fd",
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div style={{ ...CARD, padding: 18 }}>
              <SectionLabel icon={TrendingUp} color="#7A4DFF">Next Steps</SectionLabel>
              <p style={{
                fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.75, margin: 0,
              }}>
                {fp >= 75
                  ? "You're well-positioned. Use your matched skills as key talking points in interviews and tailor your cover letter to the specific responsibilities."
                  : fp >= 50
                  ? "Address the identified skill gaps and enrich your CV with targeted evidence. Focus on the priority improvements in the Advice tab."
                  : "Significant upskilling is recommended before applying. Work through the learning recommendations and rebuild your CV around the JD requirements."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
