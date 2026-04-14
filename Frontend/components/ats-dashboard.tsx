"use client"

import { useState } from "react"
import jsPDF from "jspdf"
import {
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, RefreshCw,
  Download, Briefcase, GraduationCap, Code2, Target, Star,
  BookOpen, Lightbulb, Zap, Users, BarChart3, Brain,
  ChevronRight, ChevronDown, ChevronUp, FileText, AlertCircle,
  MessageSquare, ClipboardList, Layers, Sparkles,
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
  transform:    translateY(-2px);
  transition: border-color .2s ease, background .2s ease, transform .2s cubic-bezier(.4,0,.2,1) !important;
}
.ats-tab-btn:hover  { color: rgba(255,255,255,.85) !important; }
.ats-icon-btn:hover { background: rgba(255,255,255,.07) !important; }
.ats-chip:hover     { opacity: .82; }

/* Tab content fade */
@keyframes ats-fade-tab {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ats-tab-content {
  animation: ats-fade-tab .22s cubic-bezier(.4,0,.2,1) both;
}

/* Button active press */
.ats-btn-primary { transition: transform .12s cubic-bezier(.4,0,.2,1), opacity .12s ease; }
.ats-btn-primary:active { transform: scale(0.97); opacity: .88; }
.ats-btn-secondary { transition: transform .12s cubic-bezier(.4,0,.2,1), opacity .12s ease; }
.ats-btn-secondary:active { transform: scale(0.97); opacity: .85; }

/* Export shimmer */
@keyframes ats-export-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
.ats-exporting { animation: ats-export-pulse 1.1s ease-in-out infinite; pointer-events: none; }

/* Responsive layout helpers */
.ats-role-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.ats-status-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 10px;
}
.ats-hero-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  align-items: center;
}
@media (max-width: 640px) {
  .ats-role-grid   { grid-template-columns: 1fr; }
  .ats-status-grid { grid-template-columns: 1fr; }
  .ats-hero-inner  { flex-direction: column; align-items: flex-start; gap: 18px; }
  .ats-score-grid  { grid-template-columns: 1fr !important; }
}
@media (max-width: 768px) {
  .ats-role-grid { grid-template-columns: 1fr; }
}
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
          {/* confidence score hidden from UI */}
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
    <div
      className="ats-card"
      style={{
        ...CARD,
        padding: "13px 16px",
        borderLeft: `3px solid ${c}`,
        borderRadius: "0 12px 12px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: "0.52rem", fontWeight: 800, padding: "2px 7px",
          borderRadius: 99, color: c, background: `${c}18`, border: `1px solid ${c}30`,
        }}>
          {item.priority}
        </span>
        <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.4 }}>
          {item.action}
        </p>
      </div>
      <p style={{
        fontSize: "0.7rem", color: "rgba(255,255,255,0.45)",
        margin: "0 0 0 4px", lineHeight: 1.6,
      }}>
        {item.reason}
      </p>
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
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    setIsExporting(true)
    setTimeout(() => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pw  = doc.internal.pageSize.getWidth()
    const ph  = doc.internal.pageSize.getHeight()
    const lm  = 18
    const tw  = pw - lm * 2
    let y = 20

    const newPage = () => { doc.addPage(); y = 20 }
    const guard   = (h: number) => { if (y + h > ph - 16) newPage() }

    const h1 = () => { doc.setFontSize(14); doc.setFont("helvetica", "bold");   doc.setTextColor(18, 12, 42) }
    const h2 = () => { doc.setFontSize(11); doc.setFont("helvetica", "bold");   doc.setTextColor(40, 30, 80) }
    const h3 = () => { doc.setFontSize(9);  doc.setFont("helvetica", "bold");   doc.setTextColor(60, 50, 100) }
    const bd = () => { doc.setFontSize(9);  doc.setFont("helvetica", "normal"); doc.setTextColor(70, 65, 100) }
    const sm = () => { doc.setFontSize(8);  doc.setFont("helvetica", "normal"); doc.setTextColor(120, 115, 150) }

    // ── Cover block ──
    doc.setFillColor(18, 12, 42)
    doc.rect(0, 0, pw, 52, "F")
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(150, 120, 255)
    doc.text("HR ADVISOR  ·  CV ANALYSIS REPORT", lm, 13)
    doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255)
    doc.text(evalR?.headline || jobTitle || "Candidate Analysis", lm, 28, { maxWidth: tw })
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 160, 255)
    doc.text(
      `Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`,
      lm, 42,
    )
    y = 62

    // ── Score box ──
    doc.setFillColor(243, 240, 255)
    doc.setDrawColor(122, 77, 255)
    doc.roundedRect(lm, y, tw, 30, 3, 3, "FD")
    doc.setFontSize(26); doc.setFont("helvetica", "bold"); doc.setTextColor(122, 77, 255)
    doc.text(`${fp}%`, lm + 8, y + 18)
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 30, 80)
    doc.text("Overall Match Score", lm + 34, y + 9)
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 70, 120)
    doc.text(classification, lm + 34, y + 16)
    if (readiness) doc.text(rdCfg.label, lm + 34, y + 23)
    y += 38

    // verdict
    bd()
    const vLines = doc.splitTextToSize(verdict || defaultVerdict, tw)
    guard(vLines.length * 5 + 8)
    doc.text(vLines, lm, y); y += vLines.length * 5 + 10

    // ── Score Breakdown ──
    guard(16); h2(); doc.text("Score Breakdown", lm, y); y += 8
    const scoreRows: [string, number][] = [
      ["Technical Skills", skillP], ["Experience Fit", expP],
      ["Education", eduP],          ["Soft Skills", softP],
      ["Responsibility", respP],    ["Domain Fit", domainP],
      ["Impact", impactP],          ["Resume Quality", resumeP],
    ]
    const colW = tw / 2 - 4
    scoreRows.forEach(([lbl, val], i) => {
      const col = i % 2
      const xOff = lm + col * (colW + 8)
      if (col === 0 && i > 0) y += 13
      guard(13)
      sm(); doc.text(lbl, xOff, y); doc.text(`${val}%`, xOff + colW, y, { align: "right" })
      doc.setFillColor(210, 205, 230); doc.roundedRect(xOff, y + 2, colW, 3, 1, 1, "F")
      const bc: [number, number, number] = val >= 75 ? [52, 211, 153] : val >= 50 ? [251, 191, 36] : [248, 113, 113]
      doc.setFillColor(...bc); doc.roundedRect(xOff, y + 2, Math.max(2, colW * val / 100), 3, 1, 1, "F")
    })
    y += 18

    // ── Matched Skills ──
    if (matched.length > 0) {
      guard(16); h2(); doc.text(`Matched Skills (${matched.length})`, lm, y); y += 8
      matched.forEach(m => {
        guard(18)
        h3(); doc.text(m.jd_skill, lm, y)
        bd(); doc.text(`-> ${m.cv_skill}`, lm + 4, y + 5)
        if (m.evidence) {
          sm()
          const eL = doc.splitTextToSize(`"${m.evidence}"`, tw - 6)
          guard(eL.length * 4.5 + 4)
          doc.text(eL, lm + 4, y + 11); y += 11 + eL.length * 4.5 + 3
        } else { y += 13 }
      })
      y += 4
    }

    // ── Missing Skills ──
    if (gapCount > 0) {
      guard(16); h2(); doc.text(`Missing Skills (${gapCount})`, lm, y); y += 8
      if (grouped.length > 0) {
        grouped.forEach(g => {
          guard(12); h3(); doc.text(g.group, lm, y); y += 5
          bd()
          const sL = doc.splitTextToSize(g.skills.join("  ·  "), tw - 4)
          guard(sL.length * 5); doc.text(sL, lm + 4, y); y += sL.length * 5 + 4
        })
      } else {
        bd()
        const mL = doc.splitTextToSize(missing.join("  ·  "), tw)
        guard(mL.length * 5); doc.text(mL, lm, y); y += mL.length * 5 + 4
      }
      y += 4
    }

    // ── Advice ──
    if (effectiveOverallAdvice || effectivePriorities.length > 0) {
      guard(16); h2(); doc.text("Candidate Advice", lm, y); y += 8
      if (effectiveOverallAdvice) {
        bd()
        const aL = doc.splitTextToSize(effectiveOverallAdvice, tw)
        guard(aL.length * 5); doc.text(aL, lm, y); y += aL.length * 5 + 6
      }
      effectivePriorities.forEach(p => {
        guard(18); h3(); doc.text(`${p.priority}. ${p.action}`, lm, y); y += 5
        sm()
        const rL = doc.splitTextToSize(p.reason, tw - 4)
        guard(rL.length * 4.5); doc.text(rL, lm + 4, y); y += rL.length * 4.5 + 4
      })
    }

    // ── Footer on every page ──
    const totalPages = (doc.internal as any).getNumberOfPages()
    for (let pg = 1; pg <= totalPages; pg++) {
      doc.setPage(pg)
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(160, 155, 185)
      doc.text("Generated by HR Advisor", lm, ph - 9)
      doc.text(`Page ${pg} of ${totalPages}`, pw - lm, ph - 9, { align: "right" })
    }

    const slug = (jobTitle || "analysis").toLowerCase().replace(/\s+/g, "-")
    doc.save(`hr-advisor-${slug}-${Date.now()}.pdf`)
    setIsExporting(false)
    }, 0)
  }

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

  /* ── smart fallback advice when LLM advice is sparse ── */
  const hasSomeAdvice = !!(adv?.overall_advice || priorities.length || cvImprov.length || learnRecs.length || interviewTips.length)

  const fallbackOverallAdvice = hasSomeAdvice ? "" :
    fp >= 75
      ? "You have strong alignment with this role. Focus on reinforcing your matched skills in your CV with specific metrics and outcomes, and prepare evidence-backed examples for each matched competency."
      : fp >= 50
      ? "You show moderate alignment with this role. Prioritise closing the skill gaps listed in the Missing Skills tab, and update your CV to evidence competencies that are currently underrepresented."
      : "Significant preparation is needed before applying for this role. Work systematically through the missing skills, pursue relevant certifications, and rebuild your CV to align closely with the JD requirements."

  const fallbackPriorities: PriorityItem[] = hasSomeAdvice ? [] : [
    ...(gapCount > 0 ? [{
      priority: 1,
      action: `Address the ${gapCount} missing skill${gapCount !== 1 ? "s" : ""} identified in the analysis`,
      reason: "These are required by the JD but not evidenced in the CV — closing them directly increases match score.",
    }] : []),
    ...(expP < 60 ? [{
      priority: 2,
      action: "Strengthen the experience section of your CV with quantified impact",
      reason: "Experience alignment is below threshold. Add metrics (e.g. team size, delivery outcomes, performance gains) to your existing roles.",
    }] : []),
    ...(resumeP < 60 ? [{
      priority: 3,
      action: "Improve CV structure and presentation quality",
      reason: "Resume quality is lower than optimal. Use clear section headings, consistent formatting, and concise bullet points.",
    }] : []),
    ...(fp < 50 ? [{
      priority: hasSomeAdvice ? 1 : 4,
      action: "Consider targeting a closer role match or investing in targeted upskilling",
      reason: "The current fit score suggests this role may require significant preparation. A structured learning plan is recommended.",
    }] : []),
  ]

  const effectiveOverallAdvice  = adv?.overall_advice  || fallbackOverallAdvice
  const effectivePriorities     = priorities.length     ? priorities    : fallbackPriorities
  const effectiveCvImprov       = cvImprov
  const effectiveLearnRecs      = learnRecs
  const effectiveInterviewTips  = interviewTips

  const adviceCount = (effectiveOverallAdvice ? 1 : 0) + effectivePriorities.length + effectiveCvImprov.length + effectiveLearnRecs.length + effectiveInterviewTips.length
  const TABS = [
    { id: "matches",  label: "Matched Skills",   count: matched.length,              color: "#34d399" },
    { id: "missing",  label: "Missing Skills",   count: gapCount,                    color: "#f87171" },
    { id: "advice",   label: "Candidate Advice", count: adviceCount,                 color: "#7A4DFF" },
    { id: "insights", label: "Insights",         count: strengths.length + insGaps.length + recs.length, color: "#06b6d4" },
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

      <div style={{ padding: "clamp(16px,3vw,30px)", display: "flex", flexDirection: "column", gap: 18 }}>

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
              Flair NER · Keyword Matching · Azure OpenAI GPT-4.1
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="ats-btn-primary"
              onClick={onReset}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#6d38f5,#9B6FFF)",
                color: "white", fontSize: "0.78rem", fontWeight: 700,
                boxShadow: "0 0 24px rgba(122,77,255,0.38), 0 2px 8px rgba(0,0,0,0.25)",
              }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} />
              New Analysis
            </button>
            <button
              className={`ats-btn-secondary ats-icon-btn${isExporting ? " ats-exporting" : ""}`}
              onClick={handleExport}
              disabled={isExporting}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 20px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: isExporting ? "not-allowed" : "pointer",
                background: "rgba(255,255,255,0.035)", color: "rgba(255,255,255,0.6)",
                fontSize: "0.78rem", fontWeight: 600,
              }}
            >
              <Download style={{ width: 13, height: 13 }} />
              {isExporting ? "Exporting…" : "Export PDF"}
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

          <div className="ats-hero-inner" style={{ position: "relative", zIndex: 1 }}>
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

        {/* ━━━ STATUS ROW ━━━ */}
        <div
          className="ats-up ats-status-grid"
          style={{ animationDelay: ".12s" }}
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
          <SectionLabel icon={BarChart3} mb={16}>Score Breakdown</SectionLabel>
          <div className="ats-score-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 28px" }}>
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

        {/* ━━━ ROLE OVERVIEW + RECOMMENDATION ━━━ */}
        {(jobTitle || domain || seniority || jd?.job_summary ||
          (jd?.requirements?.length ?? 0) > 0 || (jd?.tools_and_technologies?.length ?? 0) > 0 ||
          topStr.length > 0 || topGaps.length > 0) && (
          <div
            className="ats-up ats-role-grid"
            style={{ animationDelay: ".19s" }}
          >
            {/* Left: Role Overview */}
            <div style={{ ...CARD, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionLabel icon={Briefcase} color="#06b6d4">Role Overview</SectionLabel>

              {(jobTitle || domain || seniority) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {jobTitle && (
                    <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "white" }}>{jobTitle}</span>
                  )}
                  {domain    && <Pill label={domain}    color="#c4b5fd" />}
                  {seniority && <Pill label={seniority} color="#67e8f9" />}
                </div>
              )}

              {jd?.job_summary && (
                <p style={{
                  fontSize: "0.76rem", color: "rgba(255,255,255,0.48)",
                  lineHeight: 1.78, margin: 0,
                }}>
                  {jd.job_summary}
                </p>
              )}

              {(jd?.requirements?.length ?? 0) > 0 && (
                <div>
                  <SectionLabel icon={ClipboardList} color="#06b6d4" mb={10}>Key Requirements</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {jd!.requirements!.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <ChevronRight style={{ width: 10, height: 10, color: "#06b6d4", flexShrink: 0, marginTop: 4 }} />
                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
                          {r}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(jd?.tools_and_technologies?.length ?? 0) > 0 && (
                <div>
                  <SectionLabel icon={Layers} color="#a78bfa" mb={10}>Required Technologies</SectionLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {jd!.tools_and_technologies!.map((t, i) => (
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
            </div>

            {/* Right: Strengths + Gaps + Recommendation */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topStr.length > 0 && (
                <div style={{
                  ...CARD, padding: 18,
                  borderLeft: "3px solid #34d399", borderRadius: "0 16px 16px 0",
                }}>
                  <SectionLabel icon={Star} color="#34d399">Top Strengths</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {topStr.slice(0, 4).map((s, i) => (
                      <SidebarItem key={i} text={s} icon={CheckCircle2} color="#34d399" />
                    ))}
                  </div>
                </div>
              )}

              {topGaps.length > 0 && (
                <div style={{
                  ...CARD, padding: 18,
                  borderLeft: "3px solid #f87171", borderRadius: "0 16px 16px 0",
                }}>
                  <SectionLabel icon={AlertCircle} color="#f87171">Top Gaps</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {topGaps.slice(0, 4).map((s, i) => (
                      <SidebarItem key={i} text={s} icon={XCircle} color="#f87171" />
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                ...CARD, padding: 18, flex: 1,
                borderLeft: "3px solid #7A4DFF", borderRadius: "0 16px 16px 0",
              }}>
                <SectionLabel icon={Sparkles} color="#9B6FFF">Recommendation</SectionLabel>
                <p style={{
                  fontSize: "0.76rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.82, margin: 0,
                }}>
                  {fp >= 75
                    ? "Strong alignment detected. This candidate is well-positioned for the role. Proceed to interview and use the matched skills as focal talking points."
                    : fp >= 50
                    ? "Moderate alignment. The candidate meets core criteria but has notable gaps. Consider conditional progression with a targeted upskilling plan."
                    : "Significant gaps exist across key dimensions. Extensive upskilling is recommended before this candidate would be competitive for this role."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ━━━ ANALYSIS TABS (full-width) ━━━ */}
        <div
          className="ats-up"
          style={{ ...CARD, padding: 0, overflow: "hidden", animationDelay: ".23s" }}
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
                    padding: "14px 22px", whiteSpace: "nowrap",
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
          <div key={activeTab} className="ats-tab-content" style={{ padding: 22 }}>

            {/* MATCHES */}
            {activeTab === "matches" && (
              matched.length > 0
                ? (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
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
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {effectiveOverallAdvice && (
                  <div style={{
                    borderLeft: "3px solid #7A4DFF",
                    background: "rgba(122,77,255,0.06)",
                    borderRadius: "0 12px 12px 0",
                    padding: "14px 18px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <MessageSquare style={{ width: 12, height: 12, color: "#9B6FFF" }} />
                      <span style={{
                        fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "0.22em", color: "rgba(255,255,255,0.35)",
                      }}>
                        Overall Advice
                      </span>
                    </div>
                    <p style={{
                      fontSize: "0.8rem", color: "rgba(255,255,255,0.62)",
                      lineHeight: 1.82, margin: 0,
                    }}>
                      {effectiveOverallAdvice}
                    </p>
                  </div>
                )}

                {effectivePriorities.length > 0 && (
                  <div>
                    <SectionLabel icon={Target} color="#f87171">Priority Improvements</SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {effectivePriorities.map((item, i) => <PriorityCard key={i} item={item} idx={i} />)}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 22 }}>
                  {effectiveCvImprov.length > 0 && (
                    <div>
                      <SectionLabel icon={FileText} color="#06b6d4">CV Improvements</SectionLabel>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {effectiveCvImprov.map((t, i) => <ListItem key={i} text={t} color="#06b6d4" />)}
                      </div>
                    </div>
                  )}
                  {effectiveLearnRecs.length > 0 && (
                    <div>
                      <SectionLabel icon={BookOpen} color="#a78bfa">Learning Recommendations</SectionLabel>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {effectiveLearnRecs.map((t, i) => <ListItem key={i} text={t} color="#a78bfa" />)}
                      </div>
                    </div>
                  )}
                  {effectiveInterviewTips.length > 0 && (
                    <div>
                      <SectionLabel icon={Lightbulb} color="#fbbf24">Interview Tips</SectionLabel>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {effectiveInterviewTips.map((t, i) => <ListItem key={i} text={t} color="#fbbf24" />)}
                      </div>
                    </div>
                  )}
                </div>

                {!effectiveOverallAdvice && effectivePriorities.length === 0 && effectiveCvImprov.length === 0 && effectiveLearnRecs.length === 0 && (
                  <EmptyState icon={MessageSquare} text="No detailed advice generated yet." />
                )}
              </div>
            )}

            {/* INSIGHTS */}
            {activeTab === "insights" && (
              strengths.length > 0 || insGaps.length > 0 || recs.length > 0
                ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {strengths.length > 0 && (
                      <div style={{
                        borderLeft: "3px solid #34d399",
                        background: "rgba(52,211,153,0.04)",
                        borderRadius: "0 12px 12px 0",
                        padding: "14px 18px",
                      }}>
                        <SectionLabel icon={Star} color="#34d399">Strengths</SectionLabel>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {strengths.map((t, i) => <ListItem key={i} text={t} color="#34d399" />)}
                        </div>
                      </div>
                    )}
                    {insGaps.length > 0 && (
                      <div style={{
                        borderLeft: "3px solid #f87171",
                        background: "rgba(248,113,113,0.04)",
                        borderRadius: "0 12px 12px 0",
                        padding: "14px 18px",
                      }}>
                        <SectionLabel icon={AlertTriangle} color="#f87171">Gaps</SectionLabel>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {insGaps.map((t, i) => <ListItem key={i} text={t} color="#f87171" />)}
                        </div>
                      </div>
                    )}
                    {recs.length > 0 && (
                      <div style={{
                        borderLeft: "3px solid #7A4DFF",
                        background: "rgba(122,77,255,0.04)",
                        borderRadius: "0 12px 12px 0",
                        padding: "14px 18px",
                      }}>
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
      </div>
    </>
  )
}
