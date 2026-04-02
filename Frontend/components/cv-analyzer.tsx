"use client"

import { useState, useRef } from "react"
import { ATSDashboard } from "@/components/ats-dashboard"
import { ProductPanel } from "@/components/product-shell"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Briefcase,
  CheckCircle2,
  FileSearch,
  FileText,
  Loader2,
  Sparkles,
  Target,
  Upload,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────
   DROP ZONE
───────────────────────────────────────── */
function DropZone({
  label,
  sublabel,
  accept,
  file,
  onFile,
  icon: Icon,
  accentColor,
  accentClass,
}: {
  label: string
  sublabel: string
  accept: string
  file: File | null
  onFile: (f: File) => void
  icon: typeof FileText
  accentColor: string
  accentClass: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[24px] border-2 border-dashed p-8 text-center transition-all duration-200",
        dragging
          ? "scale-[1.01]"
          : "hover:scale-[1.005]",
      )}
      style={{
        borderColor: dragging
          ? accentColor
          : file
          ? `${accentColor}88`
          : "rgba(255,255,255,0.1)",
        background: dragging
          ? `${accentColor}0e`
          : file
          ? `${accentColor}07`
          : "rgba(255,255,255,0.018)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {/* Icon */}
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200"
        style={{
          background: file ? `${accentColor}18` : "rgba(255,255,255,0.04)",
          borderColor: file ? `${accentColor}30` : "rgba(255,255,255,0.1)",
        }}
      >
        {file
          ? <CheckCircle2 className="h-6 w-6" style={{ color: accentColor }} />
          : <Icon className="h-6 w-6 text-white/40 transition-colors group-hover:text-white/65" />
        }
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        {file ? (
          <>
            <p className="max-w-[180px] truncate text-sm font-semibold text-white">{file.name}</p>
            <p className="text-xs text-white/40">{(file.size / 1024).toFixed(1)} KB · Click to replace</p>
          </>
        ) : (
          <>
            <p className={cn("text-sm font-semibold", accentClass)}>{label}</p>
            <p className="text-xs text-white/38">{sublabel}</p>
          </>
        )}
      </div>

      {/* Upload hint */}
      {!file && (
        <div className="flex items-center gap-1.5 text-white/28">
          <Upload className="h-3 w-3" />
          <span className="text-xs">Drag & drop or click</span>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   PIPELINE STEP
───────────────────────────────────────── */
function PipelineStep({
  step,
  title,
  description,
}: {
  step: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/10 text-[10px] font-bold text-violet-300">
        {step}
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-white/48">{description}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export function CVAnalyzer() {
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const canRun = !!cvFile && !!jdFile && !loading

  const handleAnalyze = async () => {
    if (!cvFile || !jdFile) return
    setLoading(true)
    setError(null)
    setResult(null)
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
    setResult(null)
    setError(null)
    setCvFile(null)
    setJdFile(null)
  }

  /* ── RESULTS VIEW ── */
  if (result) {
    return <ATSDashboard llm_analysis={result} onReset={handleReset} />
  }

  /* ── UPLOAD VIEW ── */
  return (
    <div className="space-y-8">

      {/* PAGE HEADER */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
          <Sparkles className="h-3.5 w-3.5" />
          Evidence-based AI analysis
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
          CV Analyzer
        </h1>
        <p className="max-w-2xl text-base leading-8 text-white/60">
          Upload a candidate CV and job description to get structured fit analysis, skill extraction, and evidence-backed scoring in seconds.
        </p>
      </div>

      {/* UPLOAD STATUS STRIP */}
      <ProductPanel className="p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
            <div className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              cvFile
                ? "border-violet-400/30 bg-violet-400/15"
                : "border-white/10 bg-white/[0.04]"
            )}>
              <FileText className={cn("h-4 w-4", cvFile ? "text-violet-300" : "text-white/35")} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Candidate CV</div>
              <div className={cn("mt-1 text-sm font-semibold", cvFile ? "text-white" : "text-white/35")}>
                {cvFile ? "Uploaded" : "Pending"}
              </div>
              <div className="mt-0.5 truncate text-xs text-white/35">
                {cvFile ? cvFile.name : "No file selected"}
              </div>
            </div>
          </div>

          <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
            <div className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              jdFile
                ? "border-cyan-400/30 bg-cyan-400/15"
                : "border-white/10 bg-white/[0.04]"
            )}>
              <Briefcase className={cn("h-4 w-4", jdFile ? "text-cyan-300" : "text-white/35")} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Job Description</div>
              <div className={cn("mt-1 text-sm font-semibold", jdFile ? "text-white" : "text-white/35")}>
                {jdFile ? "Uploaded" : "Pending"}
              </div>
              <div className="mt-0.5 truncate text-xs text-white/35">
                {jdFile ? jdFile.name : "No file selected"}
              </div>
            </div>
          </div>

          <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
            <div className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              canRun
                ? "border-emerald-400/30 bg-emerald-400/15"
                : "border-white/10 bg-white/[0.04]"
            )}>
              <CheckCircle2 className={cn("h-4 w-4", canRun ? "text-emerald-300" : "text-white/35")} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Ready</div>
              <div className={cn("mt-1 text-sm font-semibold", canRun ? "text-white" : "text-white/35")}>
                {canRun ? "Ready" : "Waiting"}
              </div>
              <div className="mt-0.5 text-xs text-white/35">
                {cvFile && jdFile ? "Both files uploaded" : "Upload both files"}
              </div>
            </div>
          </div>

          <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
            <div className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              loading
                ? "border-violet-400/30 bg-violet-400/15"
                : "border-white/10 bg-white/[0.04]"
            )}>
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
                : <FileSearch className="h-4 w-4 text-white/35" />
              }
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Analysis</div>
              <div className={cn("mt-1 text-sm font-semibold", loading ? "text-white" : "text-white/35")}>
                {loading ? "Running" : "Idle"}
              </div>
              <div className="mt-0.5 text-xs text-white/35">
                {loading ? "Processing files…" : "Awaiting run command"}
              </div>
            </div>
          </div>
        </div>
      </ProductPanel>

      {/* MAIN WORKSPACE */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">

        {/* LEFT: UPLOAD PANEL */}
        <ProductPanel className="p-6 md:p-7">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">Document upload</div>
                <div className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-white">Upload documents</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/55">
                {cvFile && jdFile ? "Both ready" : cvFile || jdFile ? "1 of 2 uploaded" : "No files yet"}
              </div>
            </div>

            {/* Drop zones */}
            <div className="grid gap-4 sm:grid-cols-2">
              <DropZone
                label="Candidate CV"
                sublabel="PDF, DOCX, or TXT"
                accept=".pdf,.docx,.txt"
                file={cvFile}
                onFile={setCvFile}
                icon={FileText}
                accentColor="#7A4DFF"
                accentClass="text-violet-300"
              />
              <DropZone
                label="Job Description"
                sublabel="PDF, DOCX, or TXT"
                accept=".pdf,.docx,.txt"
                file={jdFile}
                onFile={setJdFile}
                icon={Briefcase}
                accentColor="#06b6d4"
                accentClass="text-cyan-300"
              />
            </div>

            {/* File summary */}
            {(cvFile || jdFile) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {cvFile && (
                  <div className="flex items-center gap-3 rounded-2xl border border-violet-400/15 bg-violet-400/8 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-300" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-white">{cvFile.name}</div>
                      <div className="text-[10px] text-white/40">{(cvFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                )}
                {jdFile && (
                  <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-white">{jdFile.name}</div>
                      <div className="text-[10px] text-white/40">{(jdFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-[22px] border border-red-400/20 bg-red-400/8 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <div>
                    <div className="text-sm font-medium text-red-200">Analysis failed</div>
                    <div className="mt-1 text-sm leading-6 text-red-100/75">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full rounded-full bg-[#7A4DFF] text-white shadow-[0_16px_40px_rgba(122,77,255,0.28)] hover:bg-[#6a3ff2] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                onClick={() => void handleAnalyze()}
                disabled={!canRun}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing — this may take a moment…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Run Analysis
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              {!cvFile && !jdFile && (
                <p className="text-center text-xs text-white/28">
                  Upload both files above to enable analysis
                </p>
              )}
              {cvFile && !jdFile && (
                <p className="text-center text-xs text-white/28">
                  Add a job description to continue
                </p>
              )}
              {!cvFile && jdFile && (
                <p className="text-center text-xs text-white/28">
                  Add the candidate CV to continue
                </p>
              )}
            </div>
          </div>
        </ProductPanel>

        {/* RIGHT: PIPELINE + OUTPUTS */}
        <div className="space-y-4">

          {/* How it works */}
          <ProductPanel className="p-5 md:p-6">
            <div className="space-y-5">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">Analysis pipeline</div>
                <div className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-white">How it works</div>
              </div>
              <div className="space-y-5">
                <PipelineStep
                  step="01"
                  title="Entity Extraction"
                  description="GLiNER extracts technical skills, tools, and requirements from both the CV and job description."
                />
                <PipelineStep
                  step="02"
                  title="Semantic Matching"
                  description="SBERT embeddings and agglomerative clustering find deep skill alignments beyond keyword matching."
                />
                <PipelineStep
                  step="03"
                  title="Score & Report"
                  description="Weighted scoring across technical, experience, and education dimensions with evidence-backed reasoning."
                />
              </div>
            </div>
          </ProductPanel>

          {/* What you get */}
          <ProductPanel className="p-5 md:p-6">
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">Analysis outputs</div>
                <div className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-white">What you get</div>
              </div>
              <div className="space-y-3">
                {[
                  {
                    icon: Target,
                    label: "Fit score",
                    detail: "Weighted match percentage across all dimensions.",
                    accent: "text-violet-300",
                    bg: "bg-violet-400/12 border-violet-400/20",
                  },
                  {
                    icon: Brain,
                    label: "Skill gap analysis",
                    detail: "Missing and matched skills with evidence from both documents.",
                    accent: "text-cyan-300",
                    bg: "bg-cyan-400/12 border-cyan-400/20",
                  },
                  {
                    icon: Zap,
                    label: "Recruiter recommendation",
                    detail: "Structured verdict with priority improvements and next steps.",
                    accent: "text-emerald-300",
                    bg: "bg-emerald-400/12 border-emerald-400/20",
                  },
                ].map(({ icon: Icon, label, detail, accent, bg }) => (
                  <div key={label} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border", bg)}>
                      <Icon className={cn("h-4 w-4", accent)} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{label}</div>
                      <div className="mt-0.5 text-xs leading-5 text-white/48">{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ProductPanel>

        </div>
      </div>
    </div>
  )
}

export default CVAnalyzer
