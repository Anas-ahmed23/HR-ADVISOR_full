"use client"

import { useState, useRef } from "react"
import { ATSDashboard } from "@/components/ats-dashboard"
import {
  FileSearch,
  Settings,
  Sparkles,
  FileText,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  Users,
  Briefcase,
} from "lucide-react"

/* ─────────────────────────────────────────
   SIDEBAR NAV ITEM
───────────────────────────────────────── */
function NavItem({
  icon: Icon, label, active = false,
}: {
  icon: typeof FileSearch; label: string; active?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "9px 12px", borderRadius: 10,
        fontSize: "0.8rem", fontWeight: active ? 700 : 500,
        background: active ? "rgba(122,77,255,0.16)" : hover ? "rgba(255,255,255,0.04)" : "transparent",
        color: active ? "#c4b5fd" : hover ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.42)",
        transition: "all 0.15s",
        cursor: "default",
        userSelect: "none",
      }}
    >
      <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
      {label}
      {active && (
        <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%",
          background: "#7A4DFF", boxShadow: "0 0 7px #7A4DFF", flexShrink: 0 }} />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   FILE DROP ZONE
───────────────────────────────────────── */
function DropZone({
  label, sublabel, accept, file, onFile, icon: Icon, color,
}: {
  label: string; sublabel: string; accept: string
  file: File | null; onFile: (f: File) => void
  icon: typeof FileText; color: string
}) {
  const ref  = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={e  => { e.preventDefault(); setDrag(true)  }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => {
        e.preventDefault(); setDrag(false)
        const f = e.dataTransfer.files[0]; if (f) onFile(f)
      }}
      style={{
        flex: 1, minHeight: 180,
        border: `1.5px dashed ${drag ? color : file ? `${color}99` : "rgba(255,255,255,0.1)"}`,
        borderRadius: 16, padding: "28px 20px", textAlign: "center",
        cursor: "pointer",
        background: drag ? `${color}0d` : file ? `${color}08` : "rgba(255,255,255,0.02)",
        transition: "all 0.2s",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
      }}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />

      <div style={{ width: 48, height: 48, borderRadius: 13, background: `${color}18`,
        border: `1px solid ${color}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {file
          ? <CheckCircle2 style={{ width: 22, height: 22, color }} />
          : <Icon        style={{ width: 22, height: 22, color }} />
        }
      </div>

      <div>
        <p style={{ fontSize: "0.85rem", fontWeight: 700,
          color: file ? "white" : "rgba(255,255,255,0.72)", margin: "0 0 4px",
          maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file ? file.name : label}
        </p>
        <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>
          {file ? `${(file.size / 1024).toFixed(1)} KB · Click to replace` : sublabel}
        </p>
      </div>

      {!file && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Upload style={{ width: 12, height: 12, color: "rgba(255,255,255,0.22)" }} />
          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.22)" }}>
            Drag & drop or click
          </span>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Target; label: string; value: string; color: string
}) {
  return (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.025)", padding: "18px 20px",
      display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: `${color}18`,
        border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon style={{ width: 18, height: 18, color }} />
      </div>
      <div>
        <p style={{ fontSize: "1.3rem", fontWeight: 900, color: "white", margin: 0 }}>{value}</p>
        <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.32)", fontWeight: 600,
          margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export function CVAnalyzer() {
  const [cvFile, setCvFile]   = useState<File | null>(null)
  const [jdFile, setJdFile]   = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<any>(null)
  const [error,   setError]   = useState<string | null>(null)

  const canRun = !!cvFile && !!jdFile && !loading

  const handleAnalyze = async () => {
    if (!cvFile || !jdFile) return
    setLoading(true); setError(null); setResult(null)
    try {
      const form = new FormData()
      form.append("cv_file", cvFile)
      form.append("jd_file", jdFile)
      const res = await fetch("/api/analyze_cv", { method: "POST", body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      setResult(await res.json())
    } catch (err: any) {
      setError(err.message ?? "Analysis failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null); setError(null); setCvFile(null); setJdFile(null)
  }

  /* ── ROOT: owns the entire viewport ── */
  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "flex",
      background: "#07070f",
      color: "white",
      fontFamily: "inherit",
      overflow: "hidden",
    }}>

      {/* ══════════════════════════
          SIDEBAR
      ══════════════════════════ */}
      <aside style={{
        width: 216, flexShrink: 0,
        background: "rgba(255,255,255,0.022)",
        borderRight: "1px solid rgba(255,255,255,0.055)",
        display: "flex", flexDirection: "column",
        padding: "18px 10px", gap: 2,
        overflowY: "auto",
      }}>
        {/* Logo — no link, no hover */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 8px 20px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg,#7A4DFF,#b57bff)",
            boxShadow: "0 0 20px rgba(122,77,255,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles style={{ width: 16, height: 16, color: "white" }} />
          </div>
          <div>
            <p style={{ fontSize: "0.88rem", fontWeight: 900, margin: 0,
              letterSpacing: "-0.02em", color: "white" }}>GradVoice</p>
            <p style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.28)", margin: 0,
              fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              AI-Powered Recruitment
            </p>
          </div>
        </div>

        <p style={{ fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.2em", color: "rgba(255,255,255,0.22)", padding: "0 8px 5px", margin: 0 }}>
          Navigation
        </p>

        {/* Only the page that actually works is active */}
        <NavItem icon={FileSearch} label="Resume Analyzer" active />

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.055)", paddingTop: 10 }}>
          <NavItem icon={Settings} label="Settings" />
        </div>

        {/* Engine status */}
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10,
          background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399",
              boxShadow: "0 0 6px #34d399", flexShrink: 0 }} />
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#86efac" }}>Engine Active</span>
          </div>
          <p style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>
            GLiNER + SBERT ready
          </p>
        </div>
      </aside>

      {/* ══════════════════════════
          MAIN CONTENT
      ══════════════════════════ */}
      <main style={{
        flex: 1, overflow: "auto",
        background: "radial-gradient(ellipse 60% 35% at 65% -5%, rgba(122,77,255,0.09) 0%, transparent 55%)",
      }}>

        {/* ── RESULTS ── */}
        {result && <ATSDashboard llm_analysis={result} onReset={handleReset} />}

        {/* ── UPLOAD VIEW ── */}
        {!result && (
          <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 28, maxWidth: 960 }}>

            {/* Page header */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7,
                fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em",
                color: "#9B6FFF", background: "rgba(122,77,255,0.12)", border: "1px solid rgba(122,77,255,0.22)",
                padding: "5px 13px", borderRadius: 999, marginBottom: 14 }}>
                <Sparkles style={{ width: 10, height: 10 }} />
                Evidence-Based AI Analysis
              </div>
              <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 6px",
                letterSpacing: "-0.03em", color: "white" }}>
                ATS Resume Analyzer
              </h1>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.38)", margin: 0 }}>
                AI-powered recruitment insights and candidate analysis.
              </p>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              <StatCard icon={FileText} label="Total Resumes"    value="0"  color="#7A4DFF" />
              <StatCard icon={Users}    label="Analyzed"         value="0"  color="#06b6d4" />
              <StatCard icon={Target}   label="Avg Match Score"  value="0%" color="#34d399" />
              <StatCard icon={Clock}    label="Avg Process Time" value="0s" color="#f59e0b" />
            </div>

            {/* Upload panel */}
            <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.025)", padding: 28 }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "white", margin: "0 0 4px" }}>
                  Upload Documents
                </h2>
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>
                  Upload the candidate's CV and the job description to begin analysis.
                </p>
              </div>

              {/* Drop zones */}
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <DropZone label="Candidate CV"    sublabel="PDF, DOCX, or TXT" accept=".pdf,.docx,.txt"
                  file={cvFile} onFile={setCvFile} icon={FileText}  color="#7A4DFF" />
                <DropZone label="Job Description" sublabel="PDF, DOCX, or TXT" accept=".pdf,.docx,.txt"
                  file={jdFile} onFile={setJdFile} icon={Briefcase} color="#06b6d4" />
              </div>

              {/* Error */}
              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)",
                  color: "#fca5a5", fontSize: "0.78rem", marginBottom: 16 }}>
                  <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                  {error}
                </div>
              )}

              {/* Run button */}
              <button
                onClick={handleAnalyze}
                disabled={!canRun}
                style={{
                  width: "100%", padding: 14, borderRadius: 12, border: "none",
                  fontSize: "0.88rem", fontWeight: 800,
                  cursor: canRun ? "pointer" : "not-allowed",
                  background: canRun
                    ? "linear-gradient(135deg,#7A4DFF,#9B6FFF)"
                    : "rgba(255,255,255,0.06)",
                  color: canRun ? "white" : "rgba(255,255,255,0.28)",
                  boxShadow: canRun ? "0 0 24px rgba(122,77,255,0.35)" : "none",
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}
              >
                {loading
                  ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                      Analyzing — this may take a moment…</>
                  : <><Sparkles style={{ width: 16, height: 16 }} /> Run Analysis</>
                }
              </button>

              {!cvFile && !jdFile && (
                <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.2)",
                  textAlign: "center", margin: "12px 0 0" }}>
                  Upload both files above to enable analysis
                </p>
              )}
            </div>

            {/* How it works */}
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.018)", padding: "22px 24px" }}>
              <h3 style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase",
                letterSpacing: "0.16em", color: "rgba(255,255,255,0.3)", margin: "0 0 16px" }}>
                How It Works
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {[
                  { step: "01", title: "Entity Extraction",  desc: "GLiNER extracts technical skills, tools, and requirements from both documents." },
                  { step: "02", title: "Semantic Matching",  desc: "SBERT embeddings + agglomerative clustering find deep skill alignments." },
                  { step: "03", title: "Score & Report",     desc: "Weighted scoring across technical, experience, and education dimensions." },
                ].map(({ step, title, desc }) => (
                  <div key={step} style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: "0.6rem", fontWeight: 900, color: "#7A4DFF",
                      background: "rgba(122,77,255,0.12)", border: "1px solid rgba(122,77,255,0.2)",
                      borderRadius: 7, padding: "3px 8px", height: "fit-content", flexShrink: 0 }}>{step}</span>
                    <div>
                      <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "white", margin: "0 0 4px" }}>{title}</p>
                      <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.6 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default CVAnalyzer