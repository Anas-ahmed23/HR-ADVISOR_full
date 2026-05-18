# GradVoice Update — Design Spec
**Date:** 2026-04-14  
**Scope:** State persistence, Voice Agent gating, CV Analyzer UX, ATS Dashboard restructure, PDF export, language audit  
**Files affected:** `context/analysis-context.tsx` (new), `app/layout.tsx`, `components/product-shell.tsx`, `components/cv-analyzer.tsx`, `components/ats-dashboard.tsx`, `app/page.tsx`, `app/voice-agent/page.tsx`

---

## 1. State Architecture

### New file: `context/analysis-context.tsx`

A React context provider that manages the single source of truth for analysis state across the entire app.

**Type note:** `LLMAnalysis` is currently defined inside `ats-dashboard.tsx`. Before implementing the context, extract this interface (and its sub-interfaces: `MatchedSkill`, `PriorityItem`, `SkillGroup`, `ScoreBreakdown`, `JDAnalysis`, `LLMAnalysis`, `DashboardProps`) into a new shared file `types/analysis.ts`. Both `ats-dashboard.tsx` and `context/analysis-context.tsx` import from there.

**Interface:**
```ts
interface AnalysisContextValue {
  result: LLMAnalysis | null       // full backend response
  isComplete: boolean              // true when result passes validation
  setResult: (data: unknown) => void
  clearResult: () => void
}
```

**localStorage key:** `"gradvoice_analysis_v1"`

**Validation:** A result is considered valid if it contains `evaluation_result` with a numeric `final_score`, OR a top-level numeric `final_score`. Anything else (null, malformed JSON, empty object) is treated as no result.

**Behaviour on mount:** Read `localStorage["gradvoice_analysis_v1"]`, parse JSON, validate. If valid, populate `result` and set `isComplete = true`. If invalid or absent, start with `result = null, isComplete = false`.

**`setResult(data)`:** Validates the incoming data, sets context state, writes JSON string to localStorage.

**`clearResult()`:** Sets `result = null`, `isComplete = false`, removes the localStorage key.

### `app/layout.tsx`
Wrap `children` in `<AnalysisProvider>` so every page and the nav bar share the same context instance.

### `CVAnalyzer` changes
- Remove local `result` state and `handleReset` function.
- Import `useAnalysis()`. Call `setResult(data)` on successful analysis.
- On mount: if `isComplete`, skip the upload view and render `<ATSDashboard>` immediately with the stored result, showing a dismissible banner: *"Restored from your previous session."*
- The "New Analysis" entry point in the dashboard calls `clearResult()` which returns to the upload view.

---

## 2. Voice Agent Gating

### `components/product-shell.tsx`

**Client component constraint:** `product-shell.tsx` currently has no `"use client"` directive and is used by server pages. To read `useAnalysis()` from context, the nav bar portion must become a client component. The solution: extract the `<nav>` and mobile button into a new `"use client"` component `components/nav-bar.tsx`. `ProductShell` imports and renders `<NavBar currentPath={currentPath} />`. This keeps `ProductShell` itself server-compatible and isolates the client boundary to the nav.

The Voice Agent nav item is conditionally rendered based on `isComplete` from `useAnalysis()`.

**When `isComplete === false`:**
- Desktop nav: Voice Agent button is rendered as a `<span>` (not `<Link>`), opacity 40%, cursor `not-allowed`, with a `title` tooltip: *"Complete a CV analysis first to unlock the Voice Agent"*
- Mobile nav: Same treatment on the mobile button

**When `isComplete === true`:**
- Rendered as a normal `<Link href="/voice-agent">` with full opacity and interactivity

This is the only place the gating logic lives. No other files need to check `isComplete` for navigation purposes.

### `app/page.tsx` (Home)
Any CTA button or link on the home page pointing to `/voice-agent` gets the same locked treatment: disabled with tooltip when `!isComplete`.

---

## 3. CV Analyzer UX

### Dead space removal
The "How it works" `<ProductPanel>` in the right column (lines 782–826 of `cv-analyzer.tsx`) is removed entirely. The right column now contains only the JD Library panel, which expands to fill the full height of the column.

### Layout
```
grid xl:grid-cols-[1fr_1.1fr]
  LEFT:  CV upload → JD mode toggle → JD indicator → error → CTA
  RIGHT: JD Library panel (full height)
```

### Copy rewrite

**Page header badge:**
- Before: `"Evidence-based AI analysis"`
- After: `"AI-powered fit analysis"`

**Page subtitle:**
- Before: `"Upload a candidate CV, select a job description, and get structured fit analysis, skill extraction, and evidence-backed scoring in seconds."`
- After: `"Upload a CV, select a role, and get a detailed fit score across 8 dimensions — skill gaps, evidence-backed matches, and recruiter-grade recommendations in seconds."`

**Step 1 label:** `"Upload your CV"` — keep, it's accurate  
**Step 2 label:** `"Job description"` — keep

**Upload status strip:** No copy changes needed — it's functional and accurate.

**Run Analysis button hint text:**
- `"Upload your CV above to get started"` — keep
- `"Select a job description from the library →"` — keep

---

## 4. ATS Dashboard Restructure

### Layout change
Remove `gridTemplateColumns: "1fr 292px"`. The main layout becomes a single full-width flex column.

### Sidebar removal
The entire sidebar div (lines 1286–1365 of `ats-dashboard.tsx`) is deleted. This removes:
- Top Strengths card
- Top Gaps card
- JD Requirements (sidebar version)
- Required Technologies
- Next Steps

### JD strip removal
The JD strip (lines 1032–1055) is removed. Its data (job title, domain, seniority, summary) moves into the new Role Overview card below.

### New section: "Role Overview + Recommendation"

Inserted between the Score Breakdown card and the tabbed panel. Two-column grid on `md+` screens, single column on mobile.

**Left card — Role Overview:**
- Header: `ClipboardList` icon + "Role Overview" label
- Job title (if present) in large white type
- Domain + Seniority as colored pills (existing `Pill` component)
- `jd.job_summary` as muted paragraph text (if present)
- Separator line
- Sub-label "Requirements" with `ChevronRight` list of all `jd.requirements` (no cap — show all)
- Sub-label "Required Technologies" with tag cloud of `jd.tools_and_technologies`
- If `jd` data is absent, this card is not rendered

**Right card — Recommendation:**
- Subtle violet background: `rgba(122,77,255,0.06)` with `border: 1px solid rgba(122,77,255,0.15)`
- Header: `Sparkles` icon + "Recommendation" label in violet
- `candidate_advice.overall_advice` as the lead paragraph (16px, line-height 1.8, white/70)
- If `priority_improvements` exist: numbered list of top 3 items — priority badge + action (bold) + reason (muted)
- Falls back to `fallbackOverallAdvice` / `fallbackPriorities` if backend advice is sparse (existing fallback logic is retained)
- If no advice data at all: show `"Analysis complete — see the Candidate Advice tab for detailed guidance."`

### Tab panel
Becomes full-width. No other structural changes to the tab bar or tab IDs.

---

## 5. Candidate Advice Tab (Redesigned)

**Overall Advice block:**
- Full-width card with `border-left: 3px solid #7A4DFF`
- Background: `rgba(122,77,255,0.05)`
- Text at 15px / line-height 1.85 — legible, not cramped

**Priority Improvements:**
- Each item: numbered badge (color-coded: 1=#f87171, 2=#fbbf24, 3=#7A4DFF, 4=#06b6d4, 5=#34d399) + `action` as H4 (14px bold) + `reason` as muted paragraph below
- Card has subtle border, hover lift (existing `.ats-card` class)
- Renders all items, not capped

**CV Improvements / Learning Recommendations / Interview Tips:**
- 3-column auto-fit grid (existing layout retained)
- Each section: colored section label + clean bullet list
- Items use `ListItem` component — no changes needed, but spacing increased to `gap: 12` from `gap: 10`

**Empty state:** If all fields are absent, single centered message with icon — unchanged.

---

## 6. Insights Tab (Improved)

**Current:** Auto-fit 3-column grid — columns can be very narrow on some viewports.

**New layout:** Single column, each section (Strengths, Gaps, Recommendations) as its own card.

**Each section card:**
- Colored left-border accent (green=strengths, red=gaps, violet=recommendations)
- Section label row at top
- Items as rows: icon (12×12) + text, `gap: 10` between rows
- Card background: `rgba(255,255,255,0.02)`

**Empty state:** Unchanged but icon updated to `Brain` and text updated to: *"No insight data returned for this analysis. The Candidate Advice tab contains detailed recommendations."*

---

## 7. Language Audit

### Removals
| Location | Before | After |
|---|---|---|
| `ats-dashboard.tsx` line 899 | `"Flair NER · Keyword Matching · Azure OpenAI GPT-4.1 · RAG-Ready Output"` | `"Flair NER · Keyword Matching · Azure OpenAI GPT-4.1"` |
| `cv-analyzer.tsx` feature list | `"Recruiter advice — Priority improvements and next steps"` | `"Recruiter recommendations — Priority actions and role-specific guidance"` |
| `app/page.tsx` bento feature | `"Decision-ready output — Shortlist recommendations, follow-up flags, and recruiter summaries — generated, not guessed."` | Keep — accurate |
| `ats-dashboard.tsx` export footer | `"Generated by HR Advisor"` | `"Generated by GradVoice HR Advisor"` |

### Check
Search `"RAG"` across all `.tsx` and `.ts` files before implementation to catch any other occurrences.

---

## 8. PDF Export

### Dependency
Add `jspdf` to `package.json`. No other PDF dependencies.

### Structure
The `handleExport` function in `ATSDashboard` is replaced with a `jsPDF`-based implementation. The export button label changes from "Export" to "Export PDF".

**PDF layout (single-pass, A4 portrait):**

```
[Page 1]
  HR ADVISOR — CV ANALYSIS REPORT       (title, 18pt bold)
  ─────────────────────────────────
  Role: [jobTitle]   Domain: [domain]   Seniority: [seniority]
  Generated: [datetime]

  OVERALL RESULT
  Match Score:     XX%    [color-coded]
  Classification:  Strong Match / etc
  Readiness:       Ready to Apply / etc

  Headline:  [evalR.headline]
  Verdict:   [verdict text]

[Page break if content overflows]

  SCORE BREAKDOWN
  Technical Skills         XX%   ████████░░
  Experience Fit           XX%   ███████░░░
  Education                XX%   ...
  [all 8 dimensions]

  JD REQUIREMENTS
  · [requirement 1]
  · [requirement 2]
  ...

  RECOMMENDATION
  [overall_advice paragraph]

  Priority Actions:
  1. [action] — [reason]
  2. [action] — [reason]
  3. [action] — [reason]

  MATCHED SKILLS  (N)
  [table: JD Skill | CV Skill | Match Type | Evidence]

  MISSING SKILLS  (N)
  [grouped by category if grouped data exists]

  CANDIDATE ADVICE
  CV Improvements:
  · ...
  Learning Recommendations:
  · ...
  Interview Tips:
  · ...

  INSIGHTS
  Strengths: · ...
  Gaps: · ...
  Recommendations: · ...

  ─────────────────────────────────
  Generated by GradVoice HR Advisor · [date]
```

**Text only — no screenshots.** All content is drawn with `jsPDF` text/line primitives. Color is used for scores (green/amber/red) and section headers (violet `#7A4DFF`).

**Filename:** `hr-advisor-[sanitized-job-title]-[YYYYMMDD].pdf`

---

## 9. Data Flow Summary

```
User uploads CV + JD
        ↓
CVAnalyzer calls /api/analyze_cv
        ↓
setResult(data) → AnalysisContext → localStorage["gradvoice_analysis_v1"]
        ↓
ATSDashboard renders (full-width, no sidebar, new Role Overview + Recommendation section)
        ↓
User navigates away / refreshes
        ↓
AnalysisProvider.onMount → reads localStorage → restores result → isComplete = true
        ↓
Voice Agent nav link becomes active
CVAnalyzer shows restored dashboard with banner
        ↓
User clicks "New Analysis"
        ↓
clearResult() → localStorage cleared → isComplete = false → upload view restored
Voice Agent nav link locks again
```

---

## 10. Out of Scope

- Backend changes (all backend API responses remain as-is)
- Voice Agent page internals (gating is nav-level only)
- Authentication or user accounts
- Multi-analysis history (only one result is stored at a time)
- Mobile responsive redesign beyond what the layout changes naturally provide
