"use client"

import { useState } from "react"
import {
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  FileText,
  XCircle,
  AlertTriangle,
  TrendingUp,
  GraduationCap,
  Briefcase,
  Code2,
  ShieldAlert,
  RefreshCw,
  Download,
} from "lucide-react"

/* ─────────────────────────────────────────
   TYPES  (must match Python output exactly)
───────────────────────────────────────── */
interface MatchedSkill {
  jd_skill: string
  cv_skill: string
  similarity?: number
  evidence?: string
}

interface LLMAnalysis {
  final_score: number
  classification: string
  matched_skills: MatchedSkill[]
  missing_skills: string[]
  skill_score: number
  experience_score: number
  education_score: number
}

export interface DashboardProps {
  llm_analysis: LLMAnalysis
  onReset: () => void
}

const safe  = (v: number) => (Number.isFinite(v) && v >= 0 ? v : 0)
const clamp = (v: number) => Math.max(0, Math.min(100, v))

/* ─────────────────────────────────────────
   RADIAL RING
───────────────────────────────────────── */
function Ring({
  value, size, stroke, color, label, large,
}: {
  value: number; size: number; stroke: number
  color: string; label?: string; large?: boolean
}) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (clamp(value) / 100) * circ
  const cx   = size / 2
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 ${large ? 10 : 5}px ${color}99)`, transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: large ? "1.7rem" : "0.9rem", fontWeight: 900, color: "white" }}>
            {clamp(value)}%
          </span>
        </div>
      </div>
      {label && (
        <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.2em", color: "rgba(255,255,255,0.38)", textAlign: "center" }}>
          {label}
        </span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   SCORE BAR
───────────────────────────────────────── */
function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const c = clamp(value)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.16em", color: "rgba(255,255,255,0.38)" }}>{label}</span>
        <span style={{ fontSize: "0.72rem", fontWeight: 900, color: "white" }}>{c}%</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${c}%`, background: color,
          boxShadow: `0 0 8px ${color}66`, borderRadius: 99, transition: "width 1s ease" }} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   STATUS CHIP
───────────────────────────────────────── */
function Chip({ icon: Icon, tone, label, value }: {
  icon: typeof CheckCircle2; tone: "pass" | "warn" | "fail"; label: string; value: string
}) {
  const p = {
    pass: { bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)",  text: "#6ee7b7" },
    warn: { bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.22)", text: "#fde68a" },
    fail: { bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.22)",text: "#fca5a5" },
  }[tone]
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: p.bg,
      border: `1px solid ${p.border}`, borderRadius: 12, padding: "11px 14px", color: p.text, flex: 1 }}>
      <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.18em", opacity: 0.7, margin: "0 0 2px" }}>{label}</p>
        <p style={{ fontSize: "0.75rem", fontWeight: 600, margin: 0 }}>{value}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   MATCH CARD
───────────────────────────────────────── */
function MatchCard({ m }: { m: MatchedSkill }) {
  const sim = typeof m.similarity === "number"
    ? clamp(Math.round(safe(m.similarity) * 100)) : null
  const col = sim !== null
    ? (sim >= 80 ? "#34d399" : sim >= 60 ? "#fbbf24" : "#f87171") : "#9B6FFF"

  return (
    <div
      style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.025)", padding: 14, transition: "all 0.18s", cursor: "default" }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.background = "rgba(255,255,255,0.05)"
        el.style.borderColor = "rgba(255,255,255,0.12)"
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.background = "rgba(255,255,255,0.025)"
        el.style.borderColor = "rgba(255,255,255,0.07)"
      }}
    >
      {/* JD skill */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.2em", color: "#9B6FFF", margin: "0 0 3px" }}>JD Requirement</p>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "white", margin: 0, lineHeight: 1.4 }}>
            {m.jd_skill}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {sim !== null && (
            <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "3px 9px", borderRadius: 7,
              color: col, background: `${col}18`, border: `1px solid ${col}33` }}>{sim}%</span>
          )}
          <ChevronRight style={{ width: 13, height: 13, color: "rgba(255,255,255,0.2)" }} />
        </div>
      </div>
      {/* CV skill */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
        <p style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.2em", color: "rgba(255,255,255,0.28)", margin: "0 0 3px" }}>Found in CV</p>
        <p style={{ fontSize: "0.8rem", fontWeight: 500, color: "rgba(255,255,255,0.72)", margin: 0, lineHeight: 1.4 }}>
          {m.cv_skill}
        </p>
      </div>
      {/* Evidence */}
      {m.evidence && (
        <div style={{ marginTop: 10, borderLeft: "2px solid rgba(122,77,255,0.45)",
          background: "rgba(122,77,255,0.07)", borderRadius: "0 8px 8px 0", padding: "8px 12px" }}>
          <p style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.48)",
            fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>"{m.evidence}"</p>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   CARD BASE STYLE
───────────────────────────────────────── */
const card: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.025)",
  padding: 20,
}

/* ─────────────────────────────────────────
   DASHBOARD  — NO own background / wrapper
───────────────────────────────────────── */
export function ATSDashboard({ llm_analysis, onReset }: DashboardProps) {
  const [tab, setTab] = useState<"matches" | "gaps">("matches")

  const {
    final_score = 0, classification = "N/A",
    matched_skills = [], missing_skills = [],
    skill_score = 0, experience_score = 0, education_score = 0,
  } = llm_analysis || {}

  const fp  = clamp(Math.round(safe(final_score) * 100))
  const tp  = clamp(Math.round(safe(skill_score) * 100))
  const ep  = clamp(Math.round(safe(experience_score) * 100))
  const edp = clamp(Math.round(safe(education_score) * 100))

  const hasExpIssue = experience_score < 0.6
  const hasEduIssue = education_score < 0.6
  const gaps        = missing_skills.length
  const mc          = fp >= 75 ? "#34d399" : fp >= 50 ? "#fbbf24" : "#f87171"

  return (
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 900, margin: "0 0 2px", letterSpacing: "-0.02em", color: "white" }}>
            Analysis Results
          </h2>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>
            GLiNER + SBERT evidence-based match
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onReset} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
            borderRadius: 9, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#7A4DFF,#9B6FFF)", color: "white",
            fontSize: "0.78rem", fontWeight: 700, boxShadow: "0 0 18px rgba(122,77,255,0.35)",
          }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> New Analysis
          </button>
          <button style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
            borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
            background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)",
            fontSize: "0.78rem", fontWeight: 600,
          }}>
            <Download style={{ width: 13, height: 13 }} /> Export
          </button>
        </div>
      </div>

      {/* ── HERO SCORE CARD ── */}
      <div style={{ ...card, padding: "28px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(122,77,255,0.13) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center", position: "relative", zIndex: 1 }}>

          <Ring value={fp} size={150} stroke={11} color={mc} large />

          <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.22em", color: "rgba(255,255,255,0.38)" }}>Overall Match</span>
              <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "4px 11px", borderRadius: 999,
                color: mc, background: `${mc}18`, border: `1px solid ${mc}40` }}>{classification}</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: 420, margin: 0 }}>
              {fp >= 75 ? "Strong semantic alignment with the job description."
                : fp >= 50 ? "Moderate alignment — candidate meets many but not all criteria."
                : "Weak alignment — significant gaps detected across key dimensions."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              <Bar label="Technical"  value={tp}  color="#7A4DFF" />
              <Bar label="Experience" value={ep}  color="#06b6d4" />
              <Bar label="Education"  value={edp} color="#a78bfa" />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { n: matched_skills.length, lbl: "Matches", c: "#34d399" },
              { n: gaps, lbl: "Gaps", c: gaps > 0 ? "#f87171" : "#34d399" },
            ].map(({ n, lbl, c }) => (
              <div key={lbl} style={{ ...card, padding: "14px 20px", textAlign: "center", minWidth: 72 }}>
                <p style={{ fontSize: "1.6rem", fontWeight: 900, color: c, margin: 0 }}>{n}</p>
                <p style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.16em", color: "rgba(255,255,255,0.32)", margin: "3px 0 0" }}>{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATUS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        <Chip icon={gaps > 0 ? XCircle : CheckCircle2} tone={gaps > 0 ? "fail" : "pass"}
          label="Hard Skills" value={gaps > 0 ? `${gaps} gap${gaps !== 1 ? "s" : ""} found` : "No critical gaps"} />
        <Chip icon={hasExpIssue ? AlertTriangle : CheckCircle2} tone={hasExpIssue ? "warn" : "pass"}
          label="Experience" value={hasExpIssue ? "Needs stronger alignment" : "Meets requirements"} />
        <Chip icon={hasEduIssue ? AlertTriangle : CheckCircle2} tone={hasEduIssue ? "warn" : "pass"}
          label="Education" value={hasEduIssue ? "Below expectation" : "Requirement satisfied"} />
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>

        {/* LEFT — tabbed panel */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {(["matches", "gaps"] as const).map(t => {
              const active = tab === t
              const count  = t === "matches" ? matched_skills.length : missing_skills.length
              const acc    = t === "matches" ? "#34d399" : "#f87171"
              return (
                <button key={t} onClick={() => setTab(t)} style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "14px 22px",
                  background: "none", border: "none",
                  borderBottom: active ? "2px solid #7A4DFF" : "2px solid transparent",
                  color: active ? "white" : "rgba(255,255,255,0.38)",
                  fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", transition: "color 0.15s",
                }}>
                  {t === "matches"
                    ? <CheckCircle2 style={{ width: 14, height: 14, color: "#34d399" }} />
                    : <AlertCircle  style={{ width: 14, height: 14, color: "#f87171" }} />}
                  {t === "matches" ? "Documented Matches" : "Inferred Gaps"}
                  <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px",
                    borderRadius: 999, color: acc, background: `${acc}18` }}>{count}</span>
                </button>
              )
            })}
          </div>

          <div style={{ padding: 18 }}>
            {tab === "matches" && (
              matched_skills.length > 0
                ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
                    {matched_skills.map((m, i) => <MatchCard key={i} m={m} />)}
                  </div>
                : <div style={{ padding: "56px 20px", textAlign: "center" }}>
                    <FileText style={{ width: 36, height: 36, color: "rgba(255,255,255,0.1)", margin: "0 auto 10px" }} />
                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", fontStyle: "italic", margin: 0 }}>
                      No verifiable matches identified. Consider revising the CV.
                    </p>
                  </div>
            )}
            {tab === "gaps" && (
              missing_skills.length > 0
                ? <div>
                    <p style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", margin: "0 0 14px" }}>
                      Requirements lacking evidence in CV
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {missing_skills.map((s, i) => (
                        <span key={i} style={{ fontSize: "0.74rem", fontWeight: 600, padding: "6px 13px",
                          borderRadius: 9, border: "1px solid rgba(248,113,113,0.22)",
                          background: "rgba(248,113,113,0.07)", color: "#fca5a5", cursor: "default" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                : <div style={{ padding: "56px 20px", textAlign: "center" }}>
                    <CheckCircle2 style={{ width: 36, height: 36, color: "rgba(52,211,153,0.4)", margin: "0 auto 10px" }} />
                    <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", margin: 0 }}>
                      No missing requirements detected
                    </p>
                  </div>
            )}
          </div>
        </div>

        {/* RIGHT sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Score rings */}
          <div style={card}>
            <p style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)", margin: "0 0 18px" }}>Score Breakdown</p>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <Ring value={tp}  size={78} stroke={6} color="#7A4DFF" label="Technical"  />
              <Ring value={ep}  size={78} stroke={6} color="#06b6d4" label="Experience" />
              <Ring value={edp} size={78} stroke={6} color="#a78bfa" label="Education"  />
            </div>
          </div>

          {/* Risk */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <ShieldAlert style={{ width: 14, height: 14, color: "#fbbf24" }} />
              <p style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)", margin: 0 }}>Risk Summary</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { Icon: Code2,        color: "#7A4DFF", body: <><strong style={{ color: "white" }}>{gaps} gap{gaps !== 1 ? "s" : ""}</strong> identified across JD requirements.</> },
                { Icon: Briefcase,    color: "#06b6d4", body: <>Experience <strong style={{ color: "white" }}>{ep}%</strong> — {hasExpIssue ? "partial fit." : "solid fit."}</> },
                { Icon: GraduationCap,color: "#a78bfa", body: <>Education <strong style={{ color: "white" }}>{edp}%</strong> — {hasEduIssue ? "qualification gaps." : "degree met."}</> },
              ].map(({ Icon, color, body }, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <Icon style={{ width: 14, height: 14, color, flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{body}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next steps */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <TrendingUp style={{ width: 14, height: 14, color: "#7A4DFF" }} />
              <p style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)", margin: 0 }}>Next Steps</p>
            </div>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.65, margin: 0 }}>
              Use documented matches to validate strengths in technical interviews. For each inferred gap,
              determine whether it is mandatory or can be offset by adjacent skills.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}