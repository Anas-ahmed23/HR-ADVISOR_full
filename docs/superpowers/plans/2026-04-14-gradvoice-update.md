# GradVoice Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent analysis state (localStorage), Voice Agent gating, ATS dashboard restructure, CV Analyzer UX cleanup, PDF export, and language audit across the GradVoice Next.js frontend.

**Architecture:** A React Context (`AnalysisProvider`) wraps the app in `layout.tsx`, storing the analysis result in `localStorage["gradvoice_analysis_v1"]`. The nav bar is extracted as a `"use client"` component that reads `isComplete` to gate the Voice Agent link. All shared types move to `types/analysis.ts`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, TypeScript, jsPDF (new dependency), lucide-react, existing project patterns (inline styles + Tailwind mix).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `Frontend/types/analysis.ts` | **Create** | Shared TypeScript interfaces for analysis data |
| `Frontend/context/analysis-context.tsx` | **Create** | Global analysis state + localStorage persistence |
| `Frontend/app/layout.tsx` | **Modify** | Wrap app with `AnalysisProvider` |
| `Frontend/components/nav-bar.tsx` | **Create** | Client nav component with Voice Agent gating |
| `Frontend/components/product-shell.tsx` | **Modify** | Use new `NavBar` component |
| `Frontend/components/cv-analyzer.tsx` | **Modify** | Remove dead space, use context, rewrite copy |
| `Frontend/components/ats-dashboard.tsx` | **Modify** | Full restructure: sidebar removal, new sections, PDF export, language fixes |
| `Frontend/app/page.tsx` | **Modify** | Gate "Start voice screening" hero CTA |
| `Frontend/components/voice-agent-cta.tsx` | **Create** | Client component for gated home page CTA |

---

## Task 1: Install jsPDF

**Files:**
- Modify: `Frontend/package.json` (via npm install)

- [ ] **Step 1: Install jspdf**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full\Frontend"
npm install jspdf
```

Expected output: `added 1 package` (or similar). Verify `jspdf` appears in `package.json` dependencies.

- [ ] **Step 2: Install jspdf types**

```bash
npm install --save-dev @types/jspdf
```

Note: jspdf ships its own types, so this may say "already included" — that's fine, skip if error.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add Frontend/package.json Frontend/package-lock.json
git commit -m "chore: add jspdf for PDF export"
```

---

## Task 2: Extract Shared Types

**Files:**
- Create: `Frontend/types/analysis.ts`

- [ ] **Step 1: Create the types file**

Create `Frontend/types/analysis.ts` with this exact content:

```typescript
export interface MatchedSkill {
  jd_skill: string
  cv_skill: string
  match_type?: string
  evidence?: string
  confidence?: number
  similarity?: number
}

export interface PriorityItem {
  priority: number
  action: string
  reason: string
}

export interface SkillGroup {
  group: string
  skills: string[]
}

export interface ScoreBreakdown {
  skill_score?: number
  experience_score?: number
  education_score?: number
  soft_skill_score?: number
  responsibility_alignment_score?: number
  domain_fit_score?: number
  impact_score?: number
  resume_quality_score?: number
}

export interface JDAnalysis {
  job_title?: string
  job_summary?: string
  requirements?: string[]
  responsibilities?: string[]
  tools_and_technologies?: string[]
  domain?: string
  seniority?: string
}

export interface LLMAnalysis {
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
  /* legacy fallback fields */
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
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add Frontend/types/analysis.ts
git commit -m "feat: extract shared analysis types to types/analysis.ts"
```

---

## Task 3: Create Analysis Context

**Files:**
- Create: `Frontend/context/analysis-context.tsx`

- [ ] **Step 1: Create the context file**

Create `Frontend/context/analysis-context.tsx`:

```typescript
"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { LLMAnalysis } from "@/types/analysis"

const LS_KEY = "gradvoice_analysis_v1"

function isValidResult(data: unknown): data is LLMAnalysis {
  if (!data || typeof data !== "object") return false
  const d = data as Record<string, unknown>
  const hasNewScore =
    d.evaluation_result != null &&
    typeof (d.evaluation_result as Record<string, unknown>).final_score === "number"
  const hasLegacyScore = typeof d.final_score === "number"
  return hasNewScore || hasLegacyScore
}

interface AnalysisContextValue {
  result: LLMAnalysis | null
  isComplete: boolean
  setResult: (data: unknown) => void
  clearResult: () => void
}

const AnalysisContext = createContext<AnalysisContextValue>({
  result: null,
  isComplete: false,
  setResult: () => {},
  clearResult: () => {},
})

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<LLMAnalysis | null>(null)

  /* Restore from localStorage on mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (isValidResult(parsed)) {
        setResultState(parsed)
      }
    } catch {
      /* ignore corrupt data */
    }
  }, [])

  const setResult = (data: unknown) => {
    if (!isValidResult(data)) return
    setResultState(data)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {
      /* storage full or unavailable — state still works in-memory */
    }
  }

  const clearResult = () => {
    setResultState(null)
    try {
      localStorage.removeItem(LS_KEY)
    } catch {}
  }

  return (
    <AnalysisContext.Provider
      value={{ result, isComplete: result !== null, setResult, clearResult }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  return useContext(AnalysisContext)
}
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add Frontend/context/analysis-context.tsx
git commit -m "feat: add AnalysisContext with localStorage persistence"
```

---

## Task 4: Wrap App with AnalysisProvider

**Files:**
- Modify: `Frontend/app/layout.tsx`

- [ ] **Step 1: Update layout.tsx**

Replace the full contents of `Frontend/app/layout.tsx` with:

```typescript
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AnalysisProvider } from "@/context/analysis-context"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GradVoice - AI-Powered CV Analysis",
  description:
    "Transform your CV with AI-powered insights. Get instant feedback on ATS compatibility, keyword optimization, and recruiter recommendations.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png",  media: "(prefers-color-scheme: dark)"  },
      { url: "/icon.svg",             type: "image/svg+xml"                  },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AnalysisProvider>
          {children}
        </AnalysisProvider>
        <Analytics />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add Frontend/app/layout.tsx
git commit -m "feat: wrap app with AnalysisProvider"
```

---

## Task 5: Create Client Nav Bar with Voice Agent Gating

**Files:**
- Create: `Frontend/components/nav-bar.tsx`

- [ ] **Step 1: Create nav-bar.tsx**

Create `Frontend/components/nav-bar.tsx`:

```typescript
"use client"

import Link from "next/link"
import { useAnalysis } from "@/context/analysis-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"

const NAV_ITEMS = [
  { href: "/",            label: "Overview"    },
  { href: "/analyzer",   label: "CV Analyzer" },
  { href: "/voice-agent", label: "Voice Agent" },
] as const

export function NavBar({ currentPath }: { currentPath: string }) {
  const { isComplete } = useAnalysis()

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1.5 md:flex">
        {NAV_ITEMS.map((item) => {
          const active   = currentPath === item.href
          const locked   = item.href === "/voice-agent" && !isComplete

          if (locked) {
            return (
              <span
                key={item.href}
                title="Complete a CV analysis first to unlock the Voice Agent"
                className="flex cursor-not-allowed items-center gap-1.5 rounded-full px-4 py-1.5 text-sm text-white/25 select-none"
              >
                <Lock className="h-3 w-3" />
                {item.label}
              </span>
            )
          }

          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn(
                "rounded-full px-4 text-sm text-white/65 hover:bg-white/[0.08] hover:text-white",
                active && "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
              )}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          )
        })}
      </nav>

      {/* Mobile nav */}
      <div className="flex items-center gap-2 md:hidden">
        {currentPath === "/voice-agent" ? (
          <Button
            asChild
            variant="ghost"
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Link href="/analyzer">CV Analyzer</Link>
          </Button>
        ) : isComplete ? (
          <Button
            asChild
            variant="ghost"
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Link href="/voice-agent">Voice Agent</Link>
          </Button>
        ) : (
          <span
            title="Complete a CV analysis first"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 text-sm text-white/25 select-none"
          >
            <Lock className="h-3 w-3" />
            Voice Agent
          </span>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add Frontend/components/nav-bar.tsx
git commit -m "feat: add NavBar client component with Voice Agent gating"
```

---

## Task 6: Update ProductShell to Use NavBar

**Files:**
- Modify: `Frontend/components/product-shell.tsx`

- [ ] **Step 1: Read current product-shell.tsx** (already done in context — full file was read)

- [ ] **Step 2: Replace the nav section in ProductShell**

In `Frontend/components/product-shell.tsx`, find the full `<header>` block inside `ProductShell` and replace it so it imports and uses `NavBar`. The file currently has the nav inline. Make the following targeted edit:

At the top of the file, add the import:
```typescript
import { NavBar } from "@/components/nav-bar"
```

Then replace the existing `<nav>` block and mobile `<div>` inside the `<header>` with `<NavBar currentPath={currentPath} />`:

The header content (inside the `<div className="mx-auto flex...">`) becomes:
```typescript
<Link href="/" className="shrink-0">
  <BrandMark />
</Link>

<NavBar currentPath={currentPath} />
```

Full updated `ProductShell` function (replace from line 54 to end of `ProductShell`):

```typescript
export function ProductShell({
  children,
  currentPath,
  mainClassName,
}: {
  children: ReactNode
  currentPath: string
  mainClassName?: string
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05050b] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,77,255,0.22),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_24%),linear-gradient(180deg,#06060d_0%,#080913_52%,#05050b_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:120px_120px] opacity-[0.08]" />
      <div className="pointer-events-none absolute left-[-12%] top-28 h-80 w-80 rounded-full bg-[#7a4dff]/16 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-[-10%] h-96 w-96 rounded-full bg-cyan-400/10 blur-[180px]" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080911]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="shrink-0">
            <BrandMark />
          </Link>
          <NavBar currentPath={currentPath} />
        </div>
      </header>

      <main className={cn("relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-10 md:px-8 md:pt-12", mainClassName)}>
        {children}
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black/20">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-6 text-sm text-white/45 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <BrandMark compact />
            <span>Structured CV analysis and voice screening in one product.</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/analyzer" className="transition-colors hover:text-white/75">CV Analyzer</Link>
            <Link href="/voice-agent" className="transition-colors hover:text-white/75">Voice Agent</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add Frontend/components/product-shell.tsx
git commit -m "feat: use NavBar component in ProductShell, voice agent gating"
```

---

## Task 7: Create Gated Voice Agent CTA for Home Page

**Files:**
- Create: `Frontend/components/voice-agent-cta.tsx`
- Modify: `Frontend/app/page.tsx`

- [ ] **Step 1: Create the CTA component**

Create `Frontend/components/voice-agent-cta.tsx`:

```typescript
"use client"

import Link from "next/link"
import { Mic, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAnalysis } from "@/context/analysis-context"

export function VoiceAgentCTA() {
  const { isComplete } = useAnalysis()

  if (isComplete) {
    return (
      <Button
        asChild
        size="lg"
        variant="outline"
        className="w-full rounded-full border-white/14 bg-white/[0.03] px-7 text-white transition-all duration-200 hover:bg-white/[0.07] hover:text-white sm:w-auto"
      >
        <Link href="/voice-agent">
          <Mic className="h-4 w-4" />
          Start voice screening
        </Link>
      </Button>
    )
  }

  return (
    <span
      title="Complete a CV analysis first to unlock the Voice Agent"
      className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/8 bg-white/[0.02] px-7 py-2.5 text-base text-white/30 select-none sm:w-auto"
    >
      <Lock className="h-4 w-4" />
      Start voice screening
    </span>
  )
}
```

- [ ] **Step 2: Update app/page.tsx to use VoiceAgentCTA**

In `Frontend/app/page.tsx`:
1. Add import at the top (after existing imports):
```typescript
import { VoiceAgentCTA } from "@/components/voice-agent-cta"
```

2. Find the "Start voice screening" button in the hero CTA block (around line 408–418):
```typescript
<Button
  asChild
  size="lg"
  variant="outline"
  className="w-full rounded-full border-white/14 bg-white/[0.03] px-7 text-white transition-all duration-200 hover:bg-white/[0.07] hover:text-white sm:w-auto"
>
  <Link href="/voice-agent">
    <Mic className="h-4 w-4" />
    Start voice screening
  </Link>
</Button>
```

Replace it with:
```typescript
<VoiceAgentCTA />
```

3. Remove `Mic` from the lucide-react import line if it's no longer used elsewhere in the file (check: `Mic` is also used in `bentoFeatures` data and `steps` data — keep the import).

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add Frontend/components/voice-agent-cta.tsx Frontend/app/page.tsx
git commit -m "feat: gate 'Start voice screening' CTA on home page behind analysis completion"
```

---

## Task 8: Update CV Analyzer (Context + Dead Space + Copy)

**Files:**
- Modify: `Frontend/components/cv-analyzer.tsx`

- [ ] **Step 1: Import useAnalysis and update state management**

At the top of `cv-analyzer.tsx`, add:
```typescript
import { useAnalysis } from "@/context/analysis-context"
import { ATSDashboard } from "@/components/ats-dashboard"
```
(ATSDashboard import already exists, just verify.)

Inside `CVAnalyzer()`, replace the local result state and handlers:

**Remove:**
```typescript
const [result, setResult] = useState<any>(null)
```

**Add above the other useState calls:**
```typescript
const { result, setResult, clearResult, isComplete } = useAnalysis()
```

**Replace `handleAnalyze` result handling** — change:
```typescript
setResult(await res.json())
```
to:
```typescript
const data = await res.json()
setResult(data)
```

**Replace `handleReset`:**
```typescript
const handleReset = () => {
  clearResult()
  setError(null)
  setCvFile(null)
  setJdFile(null)
  setSelectedJd(null)
}
```

- [ ] **Step 2: Add restore banner and auto-show dashboard**

Replace the results check block:
```typescript
/* ── RESULTS VIEW ── */
if (result) {
  return <ATSDashboard llm_analysis={result} onReset={handleReset} />
}
```

With:
```typescript
/* ── RESULTS VIEW ── */
if (result) {
  return (
    <div>
      {isComplete && (
        <div
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-violet-400/20 bg-violet-400/8 px-5 py-3"
        >
          <div className="flex items-center gap-2 text-sm text-violet-200">
            <CheckCircle2 className="h-4 w-4 text-violet-300" />
            Analysis restored from your previous session.
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-white/40 underline hover:text-white/70 transition-colors"
          >
            Clear &amp; start new
          </button>
        </div>
      )}
      <ATSDashboard llm_analysis={result} onReset={handleReset} />
    </div>
  )
}
```

- [ ] **Step 3: Update page header copy**

Find and replace the badge text:
```typescript
Evidence-based AI analysis
```
→
```typescript
AI-powered fit analysis
```

Find and replace the subtitle paragraph:
```typescript
Upload a candidate CV, select a job description, and get structured fit analysis, skill extraction, and evidence-backed scoring in seconds.
```
→
```typescript
Upload a CV, select a role, and get a detailed fit score across 8 dimensions — skill gaps, evidence-backed matches, and recruiter-grade recommendations in seconds.
```

Find and replace the feature item description for "Recruiter advice":
```typescript
detail: "Priority improvements and next steps.",
```
→
```typescript
detail: "Recruiter recommendations — priority actions and role-specific guidance.",
```

- [ ] **Step 4: Remove "How it works" panel (dead space)**

Find and delete the entire "How it works" `<ProductPanel>` block inside the right column. It starts at:
```typescript
{/* How it works */}
<ProductPanel className="p-5 md:p-6">
```
and ends just before:
```typescript
{/* JD Library */}
<ProductPanel
```

Delete everything from `{/* How it works */}` up to (but not including) `{/* JD Library */}`.

The right column `<div className="space-y-4">` will then contain only the JD Library panel. Change that wrapper div's className to remove the unnecessary `space-y-4` spacing:
```typescript
<div>
  {/* JD Library */}
  <ProductPanel ...>
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add Frontend/components/cv-analyzer.tsx
git commit -m "feat: cv-analyzer uses global analysis context, remove dead space, update copy"
```

---

## Task 9: Restructure ATS Dashboard — Layout + Language

**Files:**
- Modify: `Frontend/components/ats-dashboard.tsx`

- [ ] **Step 1: Update imports**

At the top of `ats-dashboard.tsx`, replace the local interface definitions block (lines 37–118) with a single import:

```typescript
import type { LLMAnalysis, DashboardProps, MatchedSkill, PriorityItem, SkillGroup, ScoreBreakdown, JDAnalysis } from "@/types/analysis"
```

Remove the locally-defined interfaces (`MatchedSkill`, `PriorityItem`, `SkillGroup`, `ScoreBreakdown`, `JDAnalysis`, `LLMAnalysis`, `DashboardProps`) from the file — they now live in `types/analysis.ts`.

Also add `Sparkles` to the lucide-react import line at the top. The current import does not include `Sparkles` — add it:
```typescript
import {
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, RefreshCw,
  Download, Briefcase, GraduationCap, Code2, Target, Star,
  BookOpen, Lightbulb, Award, Zap, Users, BarChart3, Brain,
  ChevronRight, ChevronDown, ChevronUp, FileText, AlertCircle,
  MessageSquare, ClipboardList, Shield, Layers, Sparkles,
} from "lucide-react"
```

- [ ] **Step 2: Fix language — remove RAG-Ready Output**

Find (line ~899):
```typescript
Flair NER · Keyword Matching · Azure OpenAI GPT-4.1 · RAG-Ready Output
```
Replace with:
```typescript
Flair NER · Keyword Matching · Azure OpenAI GPT-4.1
```

- [ ] **Step 3: Remove the JD strip**

Find and delete the entire `{/* ━━━ JD STRIP ━━━ */}` block (approx lines 1032–1055):
```typescript
{/* ━━━ JD STRIP ━━━ */}
{(jobTitle || domain || seniority || jd?.job_summary) && (
  <div
    className="ats-up"
    style={{ ...CARD, padding: "13px 20px", animationDelay: ".09s" }}
  >
    ...
  </div>
)}
```
Delete this entire conditional block.

- [ ] **Step 4: Change main grid to full-width**

Find:
```typescript
{/* ━━━ MAIN GRID ━━━ */}
<div style={{ display: "grid", gridTemplateColumns: "1fr 292px", gap: 16, alignItems: "start" }}>
```
Replace with:
```typescript
{/* ━━━ MAIN PANEL ━━━ */}
<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
```

- [ ] **Step 5: Delete the entire sidebar**

Find and delete the `{/* ━━━ SIDEBAR ━━━ */}` block — everything from:
```typescript
{/* ━━━ SIDEBAR ━━━ */}
<div
  className="ats-up"
  style={{ display: "flex", flexDirection: "column", gap: 12, animationDelay: ".23s" }}
>
```
all the way through its closing `</div>` (which ends the grid). This removes Top Strengths, Top Gaps, JD Requirements (sidebar), Required Technologies, and Next Steps cards.

- [ ] **Step 6: Insert Role Overview + Recommendation section**

After the score breakdown block (after the closing `</div>` of `{/* ━━━ SCORE BREAKDOWN ━━━ */}`), insert this new section:

```typescript
{/* ━━━ ROLE OVERVIEW + RECOMMENDATION ━━━ */}
{(jobTitle || domain || seniority || (jd?.requirements?.length ?? 0) > 0 || effectiveOverallAdvice) && (
  <div
    className="ats-up"
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      gap: 16,
      animationDelay: ".17s",
    }}
  >
    {/* Left: Role Overview */}
    {(jobTitle || domain || seniority || (jd?.requirements?.length ?? 0) > 0) && (
      <div style={{ ...CARD, padding: 22 }}>
        <SectionLabel icon={ClipboardList} color="#06b6d4" mb={16}>Role Overview</SectionLabel>
        {jobTitle && (
          <p style={{ fontSize: "1rem", fontWeight: 800, color: "white", margin: "0 0 10px", lineHeight: 1.3 }}>
            {jobTitle}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: (jd?.job_summary || (jd?.requirements?.length ?? 0) > 0) ? 14 : 0 }}>
          {domain    && <Pill label={domain}    color="#c4b5fd" />}
          {seniority && <Pill label={seniority} color="#67e8f9" />}
        </div>
        {jd?.job_summary && (
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.7, margin: "0 0 14px" }}>
            {jd.job_summary}
          </p>
        )}
        {(jd?.requirements?.length ?? 0) > 0 && (
          <>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "14px 0" }} />
            <SectionLabel icon={ChevronRight} color="#06b6d4" mb={10}>Requirements</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {jd!.requirements!.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <ChevronRight style={{ width: 11, height: 11, color: "#06b6d4", flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{r}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {(jd?.tools_and_technologies?.length ?? 0) > 0 && (
          <>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "14px 0" }} />
            <SectionLabel icon={Layers} color="#a78bfa" mb={10}>Required Technologies</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {jd!.tools_and_technologies!.map((t, i) => (
                <span key={i} style={{
                  fontSize: "0.65rem", fontWeight: 600, padding: "4px 10px", borderRadius: 7,
                  background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#c4b5fd",
                }}>
                  {t}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    )}

    {/* Right: Recommendation */}
    <div style={{
      ...CARD,
      padding: 22,
      background: "rgba(122,77,255,0.06)",
      border: "1px solid rgba(122,77,255,0.15)",
    }}>
      <SectionLabel icon={Sparkles} color="#9B6FFF" mb={16}>Recommendation</SectionLabel>
      {effectiveOverallAdvice ? (
        <>
          <p style={{
            fontSize: "0.82rem", color: "rgba(255,255,255,0.68)",
            lineHeight: 1.85, margin: "0 0 18px",
          }}>
            {effectiveOverallAdvice}
          </p>
          {effectivePriorities.slice(0, 3).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {effectivePriorities.slice(0, 3).map((item, i) => {
                const c = PRIORITY_COLORS[i % PRIORITY_COLORS.length]
                return (
                  <div key={i} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 12px",
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      background: `${c}16`, border: `1px solid ${c}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: "0.62rem", fontWeight: 900, color: c }}>{item.priority}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "white", margin: "0 0 3px", lineHeight: 1.4 }}>
                        {item.action}
                      </p>
                      <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.38)", margin: 0, lineHeight: 1.5 }}>
                        {item.reason}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
          Analysis complete — see the Candidate Advice tab for detailed guidance.
        </p>
      )}
    </div>
  </div>
)}
```

Make sure `Layers` and `Sparkles` are in the import list at the top of the file (they likely already are — verify).

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add Frontend/components/ats-dashboard.tsx
git commit -m "feat: dashboard restructure — full-width layout, remove sidebar, add Role Overview + Recommendation section, remove RAG copy"
```

---

## Task 10: Redesign Candidate Advice Tab

**Files:**
- Modify: `Frontend/components/ats-dashboard.tsx`

- [ ] **Step 1: Replace the Candidate Advice tab content**

Find the `{/* ADVICE */}` section inside the tab content area:
```typescript
{/* ADVICE */}
{activeTab === "advice" && (
  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
```

Replace the entire advice tab block with:

```typescript
{/* ADVICE */}
{activeTab === "advice" && (
  <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

    {/* Overall advice callout */}
    {effectiveOverallAdvice && (
      <div style={{
        borderLeft: "3px solid #7A4DFF",
        background: "rgba(122,77,255,0.05)",
        borderRadius: "0 12px 12px 0",
        padding: "16px 20px",
      }}>
        <SectionLabel icon={MessageSquare} color="#7A4DFF" mb={10}>Overall Advice</SectionLabel>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.85, margin: 0 }}>
          {effectiveOverallAdvice}
        </p>
      </div>
    )}

    {/* Priority improvements */}
    {effectivePriorities.length > 0 && (
      <div>
        <SectionLabel icon={Target} color="#f87171" mb={14}>Priority Improvements</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {effectivePriorities.map((item, i) => {
            const c = PRIORITY_COLORS[i % PRIORITY_COLORS.length]
            return (
              <div
                key={i}
                className="ats-card"
                style={{
                  ...CARD,
                  padding: "16px 18px",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  animationDelay: `${i * 0.04}s`,
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: `${c}16`, border: `1px solid ${c}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 900, color: c }}>{item.priority}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: "0.86rem", fontWeight: 700, color: "white",
                    margin: "0 0 6px", lineHeight: 1.4,
                  }}>
                    {item.action}
                  </p>
                  <p style={{
                    fontSize: "0.74rem", color: "rgba(255,255,255,0.42)",
                    margin: 0, lineHeight: 1.6,
                  }}>
                    {item.reason}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )}

    {/* CV Improvements / Learning Recs / Interview Tips grid */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 22 }}>
      {effectiveCvImprov.length > 0 && (
        <div>
          <SectionLabel icon={FileText} color="#06b6d4">CV Improvements</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {effectiveCvImprov.map((t, i) => <ListItem key={i} text={t} color="#06b6d4" />)}
          </div>
        </div>
      )}
      {effectiveLearnRecs.length > 0 && (
        <div>
          <SectionLabel icon={BookOpen} color="#a78bfa">Learning Recommendations</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {effectiveLearnRecs.map((t, i) => <ListItem key={i} text={t} color="#a78bfa" />)}
          </div>
        </div>
      )}
      {effectiveInterviewTips.length > 0 && (
        <div>
          <SectionLabel icon={Lightbulb} color="#fbbf24">Interview Tips</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
```

- [ ] **Step 2: Redesign Insights tab**

Find the `{/* INSIGHTS */}` section and replace it:

```typescript
{/* INSIGHTS */}
{activeTab === "insights" && (
  strengths.length > 0 || insGaps.length > 0 || recs.length > 0
    ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {strengths.length > 0 && (
          <div style={{
            ...CARD,
            borderLeft: "3px solid #34d399",
            borderRadius: "0 12px 12px 0",
            padding: "16px 20px",
          }}>
            <SectionLabel icon={Star} color="#34d399" mb={12}>Strengths</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {strengths.map((t, i) => <ListItem key={i} text={t} color="#34d399" />)}
            </div>
          </div>
        )}
        {insGaps.length > 0 && (
          <div style={{
            ...CARD,
            borderLeft: "3px solid #f87171",
            borderRadius: "0 12px 12px 0",
            padding: "16px 20px",
          }}>
            <SectionLabel icon={AlertTriangle} color="#f87171" mb={12}>Gaps</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {insGaps.map((t, i) => <ListItem key={i} text={t} color="#f87171" />)}
            </div>
          </div>
        )}
        {recs.length > 0 && (
          <div style={{
            ...CARD,
            borderLeft: "3px solid #7A4DFF",
            borderRadius: "0 12px 12px 0",
            padding: "16px 20px",
          }}>
            <SectionLabel icon={TrendingUp} color="#7A4DFF" mb={12}>Recommendations</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recs.map((t, i) => <ListItem key={i} text={t} color="#7A4DFF" />)}
            </div>
          </div>
        )}
      </div>
    )
    : (
      <EmptyState
        icon={Brain}
        text="No insight data returned for this analysis. The Candidate Advice tab contains detailed recommendations."
      />
    )
)}
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add Frontend/components/ats-dashboard.tsx
git commit -m "feat: redesign Candidate Advice and Insights tabs for clarity and readability"
```

---

## Task 11: Replace TXT Export with PDF Export

**Files:**
- Modify: `Frontend/components/ats-dashboard.tsx`

- [ ] **Step 1: Add jsPDF import**

At the top of `ats-dashboard.tsx`, add:
```typescript
import { jsPDF } from "jspdf"
```

- [ ] **Step 2: Replace handleExport with PDF implementation**

Find the entire `const handleExport = () => {` function and replace it completely with:

```typescript
const handleExport = () => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const W   = doc.internal.pageSize.getWidth()
  const H   = doc.internal.pageSize.getHeight()
  const L   = 18  // left margin
  const R   = W - L  // right margin
  const CW  = R - L  // content width
  let y     = 20

  const VIOLET = "#7A4DFF"
  const MUTED  = "#888888"
  const WHITE  = "#FFFFFF"
  const scoreCol = (p: number) =>
    p >= 75 ? "#34d399" : p >= 50 ? "#fbbf24" : "#f87171"

  const checkPage = (needed = 12) => {
    if (y + needed > H - 18) {
      addFooter()
      doc.addPage()
      y = 20
    }
  }

  const addFooter = () => {
    doc.setFontSize(7.5)
    doc.setTextColor(MUTED)
    doc.text(
      `Generated by GradVoice HR Advisor · ${new Date().toLocaleDateString()}`,
      W / 2, H - 10, { align: "center" }
    )
  }

  const section = (title: string) => {
    checkPage(18)
    y += 6
    doc.setDrawColor(50, 50, 60)
    doc.setLineWidth(0.3)
    doc.line(L, y, R, y)
    y += 5
    doc.setFontSize(8)
    doc.setTextColor(VIOLET)
    doc.setFont("helvetica", "bold")
    doc.text(title.toUpperCase(), L, y)
    doc.setFont("helvetica", "normal")
    y += 7
  }

  const textRow = (label: string, value: string, valColor = WHITE) => {
    checkPage(7)
    doc.setFontSize(9)
    doc.setTextColor(MUTED)
    doc.text(label, L, y)
    doc.setTextColor(valColor)
    doc.text(value, L + 52, y)
    y += 6
  }

  const bullet = (text: string, indent = 0, color = "#cccccc") => {
    const lines = doc.splitTextToSize(text, CW - indent - 6)
    checkPage(lines.length * 5 + 3)
    doc.setFontSize(8.5)
    doc.setTextColor(color)
    doc.text("·", L + indent, y)
    doc.text(lines, L + indent + 5, y)
    y += lines.length * 5 + 1
  }

  const para = (text: string, color = "#bbbbbb") => {
    const lines = doc.splitTextToSize(text, CW)
    checkPage(lines.length * 5 + 4)
    doc.setFontSize(9)
    doc.setTextColor(color)
    doc.text(lines, L, y)
    y += lines.length * 5 + 4
  }

  /* ── Cover ── */
  doc.setFillColor(10, 10, 20)
  doc.rect(0, 0, W, 42, "F")
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(WHITE)
  doc.text("HR ADVISOR — CV ANALYSIS REPORT", W / 2, 18, { align: "center" })
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor("#aaaaaa")
  const subtitle = [
    jobTitle && `Role: ${jobTitle}`,
    domain    && `Domain: ${domain}`,
    seniority && `Seniority: ${seniority}`,
  ].filter(Boolean).join("   ")
  if (subtitle) doc.text(subtitle, W / 2, 27, { align: "center" })
  doc.text(`Generated: ${new Date().toLocaleString()}`, W / 2, 34, { align: "center" })
  y = 52

  /* ── Overall Result ── */
  section("Overall Result")
  textRow("Match Score:",    `${fp}%`,           scoreCol(fp))
  textRow("Classification:", classification,      WHITE)
  if (readiness) textRow("Readiness:",  rdCfg.label, WHITE)
  if (headline)  { y += 2; para(headline, WHITE) }
  if (verdict)   { para(verdict) }

  /* ── Score Breakdown ── */
  if (sb) {
    section("Score Breakdown")
    const dims: [string, number][] = [
      ["Technical Skills",          skillP  ],
      ["Experience Fit",            expP    ],
      ["Education",                 eduP    ],
      ["Soft Skills",               softP   ],
      ["Responsibility Alignment",  respP   ],
      ["Domain Fit",                domainP ],
      ["Impact & Achievements",     impactP ],
      ["Resume Quality",            resumeP ],
    ]
    dims.forEach(([lbl, val]) => textRow(`${lbl}:`, `${val}%`, scoreCol(val)))
  }

  /* ── JD Overview ── */
  if (jobTitle || (jd?.requirements?.length ?? 0) > 0) {
    section("Role Overview")
    if (jd?.job_summary) para(jd.job_summary)
    if ((jd?.requirements?.length ?? 0) > 0) {
      y += 2
      doc.setFontSize(8)
      doc.setTextColor(VIOLET)
      doc.text("REQUIREMENTS", L, y)
      y += 5
      jd!.requirements!.forEach(r => bullet(r))
    }
    if ((jd?.tools_and_technologies?.length ?? 0) > 0) {
      y += 2
      doc.setFontSize(8)
      doc.setTextColor(VIOLET)
      doc.text("REQUIRED TECHNOLOGIES", L, y)
      y += 5
      bullet(jd!.tools_and_technologies!.join("   ·   "))
    }
  }

  /* ── Recommendation ── */
  if (effectiveOverallAdvice) {
    section("Recommendation")
    para(effectiveOverallAdvice)
    if (effectivePriorities.length > 0) {
      y += 2
      doc.setFontSize(8)
      doc.setTextColor(VIOLET)
      doc.text("PRIORITY ACTIONS", L, y)
      y += 5
      effectivePriorities.slice(0, 5).forEach(p => {
        checkPage(14)
        doc.setFontSize(9)
        doc.setTextColor(WHITE)
        doc.setFont("helvetica", "bold")
        doc.text(`${p.priority}. ${p.action}`, L, y)
        doc.setFont("helvetica", "normal")
        y += 5
        if (p.reason) {
          const lines = doc.splitTextToSize(p.reason, CW - 8)
          doc.setFontSize(8)
          doc.setTextColor(MUTED)
          doc.text(lines, L + 5, y)
          y += lines.length * 4.5 + 2
        }
      })
    }
  }

  /* ── Matched Skills ── */
  if (matched.length > 0) {
    section(`Matched Skills (${matched.length})`)
    matched.forEach(m => {
      checkPage(12)
      doc.setFontSize(9)
      doc.setTextColor(WHITE)
      doc.setFont("helvetica", "bold")
      doc.text(m.jd_skill, L, y)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(MUTED)
      doc.text(`→ ${m.cv_skill}${m.match_type ? `  [${m.match_type}]` : ""}`, L + 4, y + 4.5)
      if (m.evidence) {
        const lines = doc.splitTextToSize(`"${m.evidence}"`, CW - 8)
        doc.setFontSize(7.5)
        doc.setTextColor("#777777")
        doc.text(lines, L + 4, y + 9)
        y += lines.length * 4 + 10
      } else {
        y += 11
      }
    })
  }

  /* ── Missing Skills ── */
  if (grouped.length > 0 || missing.length > 0) {
    section(`Missing Skills (${gapCount})`)
    if (grouped.length > 0) {
      grouped.forEach(g => {
        checkPage(10)
        doc.setFontSize(8.5)
        doc.setTextColor(VIOLET)
        doc.setFont("helvetica", "bold")
        doc.text(`[${g.group}]`, L, y)
        doc.setFont("helvetica", "normal")
        y += 5
        g.skills.forEach(s => bullet(s, 4, "#fca5a5"))
      })
    } else {
      missing.forEach(s => bullet(s, 0, "#fca5a5"))
    }
  }

  /* ── Candidate Advice ── */
  const hasAdviceDetail = effectiveCvImprov.length > 0 || effectiveLearnRecs.length > 0 || effectiveInterviewTips.length > 0
  if (hasAdviceDetail) {
    section("Candidate Advice")
    if (effectiveCvImprov.length > 0) {
      doc.setFontSize(8); doc.setTextColor(VIOLET); doc.text("CV IMPROVEMENTS", L, y); y += 5
      effectiveCvImprov.forEach(t => bullet(t))
    }
    if (effectiveLearnRecs.length > 0) {
      y += 2
      doc.setFontSize(8); doc.setTextColor(VIOLET); doc.text("LEARNING RECOMMENDATIONS", L, y); y += 5
      effectiveLearnRecs.forEach(t => bullet(t))
    }
    if (effectiveInterviewTips.length > 0) {
      y += 2
      doc.setFontSize(8); doc.setTextColor(VIOLET); doc.text("INTERVIEW TIPS", L, y); y += 5
      effectiveInterviewTips.forEach(t => bullet(t))
    }
  }

  /* ── Insights ── */
  if (strengths.length > 0 || insGaps.length > 0 || recs.length > 0) {
    section("Insights")
    if (strengths.length > 0) {
      doc.setFontSize(8); doc.setTextColor("#34d399"); doc.text("STRENGTHS", L, y); y += 5
      strengths.forEach(t => bullet(t, 0, "#a7f3d0"))
    }
    if (insGaps.length > 0) {
      y += 2
      doc.setFontSize(8); doc.setTextColor("#f87171"); doc.text("GAPS", L, y); y += 5
      insGaps.forEach(t => bullet(t, 0, "#fca5a5"))
    }
    if (recs.length > 0) {
      y += 2
      doc.setFontSize(8); doc.setTextColor(VIOLET); doc.text("RECOMMENDATIONS", L, y); y += 5
      recs.forEach(t => bullet(t))
    }
  }

  addFooter()

  const safeName = (jobTitle || "analysis").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const dateStr  = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  doc.save(`hr-advisor-${safeName}-${dateStr}.pdf`)
}
```

- [ ] **Step 3: Update Export button label**

Find:
```typescript
Export
```
in the export button (near `<Download style=...`), and change to:
```typescript
Export PDF
```

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add Frontend/components/ats-dashboard.tsx
git commit -m "feat: replace TXT export with structured jsPDF report"
```

---

## Task 12: Verification

- [ ] **Step 1: Run the dev server**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full\Frontend"
npm run dev
```

Expected: server starts on http://localhost:3000 with no compilation errors.

- [ ] **Step 2: Verify Voice Agent gating**

1. Navigate to http://localhost:3000
2. Confirm "Start voice screening" CTA is dimmed/locked
3. Open http://localhost:3000/analyzer — confirm Voice Agent nav item shows lock icon and is not clickable
4. Clear localStorage (`localStorage.removeItem("gradvoice_analysis_v1")` in browser console) and refresh — confirm still locked

- [ ] **Step 3: Verify analysis persistence**

1. Run an analysis (upload CV + JD)
2. After results appear, navigate to http://localhost:3000 (home page)
3. Navigate back to http://localhost:3000/analyzer
4. Confirm the dashboard is shown with the "Restored from your previous session" banner
5. Hard refresh (Ctrl+Shift+R) — confirm analysis is still present
6. Confirm Voice Agent nav item is now active and navigable

- [ ] **Step 4: Verify dashboard layout**

1. On the analysis results page:
   - No right sidebar visible
   - "Role Overview + Recommendation" section appears between Score Breakdown and tabs
   - "RAG-Ready Output" text is gone from the subtitle
   - Candidate Advice tab has left-bordered callout + improved priority cards
   - Insights tab shows full-width cards with left border accents
   - JD Library fills the right column on the CV Analyzer page
   - No "How it works" panel on the CV Analyzer page

- [ ] **Step 5: Verify PDF export**

1. Click "Export PDF" on the dashboard
2. Confirm a `.pdf` file downloads (not `.txt`)
3. Open the PDF — confirm it has structured sections, readable text, correct filename

- [ ] **Step 6: Build check**

```bash
npm run build
```

Expected: successful build with no TypeScript errors.

- [ ] **Step 7: Final commit**

```bash
cd "C:\Users\User\OneDrive\Documents\HR-ADVISOR_full"
git add -A
git commit -m "feat: complete GradVoice update — state persistence, gating, dashboard restructure, PDF export"
```
