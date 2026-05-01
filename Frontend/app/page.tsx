import type { ReactNode } from "react"
import Link from "next/link"
import { Barlow_Condensed } from "next/font/google"
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  FileSearch,
  MessageSquare,
  Mic,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"

import { ProductPanel, ProductShell } from "@/components/product-shell"
import { VoiceAgentCTA } from "@/components/voice-agent-cta"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["900"],
  display: "swap",
})

export const metadata = {
  title: "GradVoice — AI Recruitment Intelligence",
  description:
    "Evaluate candidates with precision using AI-driven CV analysis and real-time voice screening in a single unified workflow.",
}

// ─── Data ────────────────────────────────────────────────────────────────────

const stats = [
  { value: "3×", label: "Faster candidate screening", icon: Zap, accent: "text-violet-300" },
  { value: "100%", label: "Structured, evidence-backed output", icon: CheckCircle2, accent: "text-cyan-300" },
  { value: "Real-time", label: "AI voice interview transcription", icon: Mic, accent: "text-violet-300" },
  { value: "One", label: "Unified workflow, end to end", icon: TrendingUp, accent: "text-cyan-300" },
]


const steps = [
  {
    number: "01",
    title: "Define the role",
    description:
      "Paste your job description. GradVoice maps it into structured hiring criteria — skills, requirements, and must-haves — so every evaluation starts from the same baseline.",
    icon: Briefcase,
    iconAccent: "text-violet-300",
    border: "border-violet-400/20",
    bg: "bg-violet-400/10",
    line: "bg-gradient-to-b from-violet-400/40 to-cyan-400/30",
  },
  {
    number: "02",
    title: "Analyze CVs",
    description:
      "Upload candidate resumes. Get evidence-backed role-fit scores, skill extraction, gap analysis, and structured shortlist recommendations — in one pass.",
    icon: FileSearch,
    iconAccent: "text-cyan-300",
    border: "border-cyan-400/20",
    bg: "bg-cyan-400/10",
    line: "bg-gradient-to-b from-cyan-400/40 to-violet-400/30",
  },
  {
    number: "03",
    title: "Run voice screening",
    description:
      "Launch AI-guided interviews with live transcription. Capture conversational signals, communication quality, and recruiter-ready summaries without leaving the platform.",
    icon: Mic,
    iconAccent: "text-violet-300",
    border: "border-violet-400/20",
    bg: "bg-violet-400/10",
    line: null,
  },
]

const outcomes = [
  {
    title: "Reduce screening effort",
    description: "Surface high-signal candidate insights earlier, eliminating hours of manual document review.",
    icon: Clock,
    accent: "text-violet-300",
    bg: "bg-violet-400/10",
    border: "border-violet-400/15",
  },
  {
    title: "Standardize evaluation",
    description: "Apply consistent, structured assessment criteria across every resume and interview — no bias drift.",
    icon: Target,
    accent: "text-cyan-300",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/15",
  },
  {
    title: "Capture deeper signals",
    description: "Preserve conversational context and communication quality that CVs alone cannot convey.",
    icon: MessageSquare,
    accent: "text-violet-300",
    bg: "bg-violet-400/10",
    border: "border-violet-400/15",
  },
  {
    title: "Enable faster decisions",
    description: "Turn screening data into clear, actionable next steps — so hiring teams move with confidence.",
    icon: Users,
    accent: "text-cyan-300",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/15",
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroWidget() {
  return (
    <div
      className="hidden lg:flex lg:items-center lg:justify-end"
      style={{ perspective: "1100px", perspectiveOrigin: "50% 50%" }}
    >
      <div className="gv-float-card relative" style={{ width: "290px" }}>
        {/* Stacked depth cards behind */}
        <div
          className="absolute inset-0 rounded-[22px] border border-white/[0.045] bg-[#090818]"
          style={{ transform: "translate(10px, 10px)" }}
        />
        <div
          className="absolute inset-0 rounded-[22px] border border-white/[0.025] bg-[#070615]"
          style={{ transform: "translate(20px, 20px)" }}
        />

        {/* Main card */}
        <div className="relative overflow-hidden rounded-[22px] border border-white/[0.1] bg-[#0d0c20] shadow-[0_36px_90px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]">
          {/* Subtle violet glow inside card */}
          <div className="pointer-events-none absolute -top-10 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-violet-500/15 blur-[40px]" />

          {/* Title bar */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400/50" />
              <span className="h-2 w-2 rounded-full bg-yellow-400/50" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/50" />
            </div>
            <span className="text-[9px] font-medium uppercase tracking-[0.24em] text-white/25">
              CV Analysis
            </span>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[9px] text-white/28">Live</span>
            </div>
          </div>

          <div className="relative p-4">
            {/* Candidate row */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/28">Candidate</div>
                <div className="mt-0.5 text-[13px] font-semibold text-white">Sarah Mansour</div>
                <div className="text-[10px] text-white/38">Senior Backend Eng · 6 yrs</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/28">Role fit</div>
                <div className="mt-0.5 text-[22px] font-bold text-violet-300">91%</div>
              </div>
            </div>

            {/* Score bars */}
            <div className="mt-3 space-y-2">
              {[
                { label: "Technical", score: 94, color: "bg-violet-400" },
                { label: "Experience", score: 88, color: "bg-cyan-400" },
                { label: "Coverage", score: 82, color: "bg-violet-300" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/38">{item.label}</span>
                    <span className="text-white/55">{item.score}%</span>
                  </div>
                  <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={cn("h-[3px] rounded-full opacity-80", item.color)}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Skills */}
            <div className="mt-3 flex flex-wrap gap-1">
              {["Python", "FastAPI", "AWS", "Docker", "CI/CD"].map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/45"
                >
                  {s}
                </span>
              ))}
            </div>

            {/* Recommendation */}
            <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-3 py-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-violet-300" />
                <span className="text-[10px] font-semibold text-violet-200">Shortlist recommended</span>
              </div>
              <p className="mt-0.5 text-[10px] leading-[1.5] text-white/40">
                Advance to technical interview. Validate system design depth.
              </p>
            </div>

            {/* Voice screening row */}
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-cyan-400/14 bg-cyan-400/[0.05] px-3 py-2">
              <Mic className="h-3 w-3 shrink-0 text-cyan-300" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Voice screening</span>
              <span className="ml-auto flex items-center gap-1">
                <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" />
                <span className="text-[9px] text-white/28">Queued</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
      <Sparkles className="h-3 w-3" />
      {children}
    </div>
  )
}

function LivePreviewCard() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#090a14] shadow-[0_40px_100px_rgba(0,0,0,0.55),0_0_0_1px_rgba(122,77,255,0.08)]">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-violet-500/20 blur-[60px]" />

      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-400/60" />
          <span className="h-2 w-2 rounded-full bg-yellow-400/60" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/30">
          CV Analysis · Live
        </span>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-[10px] text-white/35">Active</span>
        </div>
      </div>

      <div className="p-5 md:p-6">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3.5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Candidate</div>
            <div className="mt-1 text-sm font-semibold text-white">Sarah Mansour</div>
            <div className="text-[11px] text-white/45">Senior Backend Engineer · 6 yrs exp</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Role fit</div>
            <div className="mt-1 text-2xl font-bold text-violet-300">91%</div>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {[
            { label: "Technical alignment", score: 94, color: "bg-violet-400" },
            { label: "Experience depth", score: 88, color: "bg-cyan-400" },
            { label: "Requirements coverage", score: 82, color: "bg-violet-300" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/50">{item.label}</span>
                <span className="font-semibold text-white/75">{item.score}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn("h-1.5 rounded-full opacity-80", item.color)}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Extracted skills</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["Python", "FastAPI", "AWS", "Docker", "PostgreSQL", "Redis", "CI/CD"].map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-400/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-violet-300" />
            <span className="text-[11px] font-semibold text-violet-200">Shortlist recommendation</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-5 text-white/55">
            Advance to technical interview. Strong architecture signals — validate system design depth.
          </p>
        </div>

        <div className="mt-2.5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] px-4 py-3">
          <div className="flex items-center gap-2">
            <Mic className="h-3 w-3 shrink-0 text-cyan-300" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Voice screening
            </span>
            <span className="ml-auto flex items-center gap-1">
              <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" />
              <span className="text-[10px] text-white/30">Live</span>
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-[1.6] text-white/50 italic">
            &ldquo;I&apos;ve fully owned our notification service — designed, shipped, and maintained it in production for two years...&rdquo;
          </p>
        </div>
      </div>
    </div>
  )
}


function StepCard({
  step,
  index,
  total,
}: {
  step: (typeof steps)[number]
  index: number
  total: number
}) {
  const { number, title, description, icon: Icon, iconAccent, border, bg, line } = step
  return (
    <div className="relative flex gap-5 md:gap-6">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xs font-bold tracking-wider text-white",
            border,
            bg,
          )}
        >
          <Icon className={cn("h-5 w-5", iconAccent)} />
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-[#05050b] text-[9px] font-bold text-white/50">
            {number}
          </div>
        </div>
        {index < total - 1 && (
          <div className={cn("mt-3 w-0.5 flex-1 rounded-full", line ?? "bg-white/8")} />
        )}
      </div>
      <div className={cn("pb-10", index === total - 1 && "pb-0")}>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 max-w-xl text-sm leading-7 text-white/58">{description}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <style>{`
        @keyframes gv-blob-a {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
          33%      { transform: translate(3.5%,-4.5%) scale(1.07) rotate(6deg); }
          70%      { transform: translate(-4%,2.5%) scale(0.96) rotate(-4deg); }
        }
        @keyframes gv-blob-b {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
          40%     { transform: translate(-5.5%,5%) scale(1.10) rotate(-9deg); }
          76%     { transform: translate(6%,-4.5%) scale(0.93) rotate(5deg); }
        }
        @keyframes gv-blob-c {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
          28%     { transform: translate(9%,2.5%) scale(0.91) rotate(11deg); }
          66%     { transform: translate(-3%,-8%) scale(1.09) rotate(-7deg); }
        }
        @keyframes gv-blob-d {
          0%,100% { transform: translate(0,0) scale(1); }
          54%     { transform: translate(-7%,6%) scale(1.06); }
        }
        .gv-blob-a { animation: gv-blob-a 20s ease-in-out infinite; }
        .gv-blob-b { animation: gv-blob-b 26s ease-in-out infinite 3s; }
        .gv-blob-c { animation: gv-blob-c 22s ease-in-out infinite 7s; }
        .gv-blob-d { animation: gv-blob-d 32s ease-in-out infinite 12s; }
        .gv-grain {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='gr'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23gr)'/%3E%3C/svg%3E");
          background-size: 180px 180px;
          opacity: 0.042;
          mix-blend-mode: overlay;
        }
        @keyframes gv-float-card {
          0%, 100% { transform: rotateY(-22deg) rotateX(6deg) translateY(0px); }
          50%       { transform: rotateY(-18deg) rotateX(9deg) translateY(-12px); }
        }
        .gv-float-card { animation: gv-float-card 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gv-blob-a,.gv-blob-b,.gv-blob-c,.gv-blob-d,.gv-float-card { animation: none !important; }
          .gv-float-card { transform: rotateY(-22deg) rotateX(6deg); }
        }
      `}</style>

      <ProductShell currentPath="/" mainClassName="space-y-20 pt-0 md:space-y-24">

        {/* ── 1. Hero ──────────────────────────────────────────────────────────── */}
        <section className="relative -mx-4 overflow-hidden px-4 pb-14 pt-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 lg:pb-18 lg:pt-10">

          {/* Fluid background — blobs sit right-side so they don't fight the type */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="gv-blob-a absolute rounded-full"
              style={{
                width: "55vw",
                height: "60vw",
                top: "-15%",
                right: "-8%",
                background:
                  "radial-gradient(ellipse at 40% 35%, oklch(46% 0.27 292) 0%, oklch(35% 0.20 300) 38%, transparent 68%)",
                filter: "blur(72px)",
                opacity: 0.88,
              }}
            />
            <div
              className="gv-blob-b absolute rounded-full"
              style={{
                width: "45vw",
                height: "50vw",
                top: "15%",
                right: "-2%",
                background:
                  "radial-gradient(ellipse at 48% 52%, oklch(57% 0.30 338) 0%, oklch(42% 0.25 315) 40%, transparent 70%)",
                filter: "blur(78px)",
                opacity: 0.72,
              }}
            />
            <div
              className="gv-blob-c absolute rounded-full"
              style={{
                width: "38vw",
                height: "42vw",
                top: "40%",
                right: "12%",
                background:
                  "radial-gradient(ellipse at 50% 50%, oklch(72% 0.19 202) 0%, oklch(58% 0.22 218) 42%, transparent 70%)",
                filter: "blur(90px)",
                opacity: 0.58,
              }}
            />
            <div
              className="gv-blob-d absolute rounded-full"
              style={{
                width: "26vw",
                height: "30vw",
                top: "5%",
                right: "28%",
                background:
                  "radial-gradient(ellipse at 50% 50%, oklch(68% 0.24 38) 0%, oklch(52% 0.20 50) 42%, transparent 70%)",
                filter: "blur(100px)",
                opacity: 0.38,
              }}
            />
            <div className="gv-grain absolute inset-0" />
          </div>

          {/* Content — left text + right 3D widget at lg */}
          <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_auto]">

            {/* Left: text content */}
            <div>
              <p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.34em] text-white/35">
                AI Recruitment Intelligence
              </p>

              <div
                className={barlow.className}
                style={{ lineHeight: 0.86, letterSpacing: "-0.01em" }}
                aria-label="Analyze. Screen. Hire."
              >
                <span
                  className="block"
                  style={{ fontSize: "clamp(3.5rem, 10vw, 14rem)", color: "oklch(97% 0.005 272)" }}
                >
                  ANALYZE
                </span>
                <span
                  className="block"
                  style={{ fontSize: "clamp(3.5rem, 10vw, 14rem)", color: "oklch(88% 0.007 272)" }}
                >
                  SCREEN
                </span>
                <span
                  className="block"
                  style={{ fontSize: "clamp(3.5rem, 10vw, 14rem)", color: "oklch(74% 0.20 288)" }}
                >
                  HIRE
                </span>
              </div>

              <p className="mt-8 max-w-[52ch] text-base leading-[1.8] text-white/55 lg:text-lg">
                GradVoice combines structured CV analysis with AI-guided voice screening so hiring teams
                can compare candidates with precision — and move forward with confidence.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-full bg-[#7A4DFF] px-8 text-white shadow-[0_20px_50px_rgba(122,77,255,0.38)] transition-all duration-200 hover:bg-[#6a3ff2] hover:shadow-[0_24px_60px_rgba(122,77,255,0.48)] sm:w-auto"
                >
                  <Link href="/analyzer">
                    Analyze a CV now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <VoiceAgentCTA />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                {["No manual review required", "Real-time transcription", "Decision-ready output"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-white/38">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-violet-400/60" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: 3D floating widget */}
            <HeroWidget />
          </div>
        </section>

        {/* ── 2. Stats strip ───────────────────────────────────────────────────── */}
        <section>
          <ProductPanel className="p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {stats.map(({ value, label, icon: Icon, accent }) => (
                <div
                  key={label}
                  className="flex flex-col items-start gap-3 rounded-[22px] border border-white/8 bg-black/20 px-5 py-5 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                    <Icon className={cn("h-4.5 w-4.5", accent)} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{value}</div>
                    <div className="mt-0.5 text-xs leading-5 text-white/50">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </ProductPanel>
        </section>

        {/* ── 3. Platform capabilities ─────────────────────────────────────────── */}
        <section>
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <SectionBadge>Platform</SectionBadge>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                Two ways to see a candidate clearly
              </h2>
            </div>
            <p className="max-w-[38ch] shrink-0 text-sm leading-7 text-white/45 sm:text-right">
              CV analysis and voice screening built as a connected system, not bolted together.
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/[0.07]">
            <div className="grid divide-y divide-white/[0.07] lg:grid-cols-2 lg:divide-x lg:divide-y-0">

              {/* CV Analyzer */}
              <div className="relative overflow-hidden bg-[#06040f] p-8 md:p-10">
                <div
                  className={cn(barlow.className, "pointer-events-none absolute -right-1 top-3 select-none text-[8.5rem] leading-none text-violet-500/[0.07]")}
                  aria-hidden
                >
                  01
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10">
                      <FileSearch className="h-4 w-4 text-violet-300" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-300/80">
                      CV Analyzer
                    </span>
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold leading-tight text-white">
                    Parse every resume.<br />Score every candidate.
                  </h3>
                  <p className="mt-3 max-w-[44ch] text-sm leading-7 text-white/50">
                    Upload any CV, define the role. GradVoice extracts skills, maps them against your requirements, and returns a structured fit score with a shortlist recommendation — in one pass.
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {[
                      "Role-fit scoring with evidence breakdown",
                      "Skill and tool extraction from unstructured text",
                      "Gap identification for targeted interview questions",
                      "Shortlist recommendations with clear reasoning",
                    ].map((cap) => (
                      <li key={cap} className="flex items-start gap-3 text-sm text-white/58">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-violet-400/70" />
                        {cap}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 border-t border-white/[0.07] pt-6">
                    <Link
                      href="/analyzer"
                      className="group inline-flex items-center gap-2 text-sm font-medium text-violet-300 transition-colors hover:text-violet-200"
                    >
                      Open CV Analyzer
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Voice Agent */}
              <div className="relative overflow-hidden bg-[#030b0e] p-8 md:p-10">
                <div
                  className={cn(barlow.className, "pointer-events-none absolute -right-1 top-3 select-none text-[8.5rem] leading-none text-cyan-500/[0.07]")}
                  aria-hidden
                >
                  02
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                      <Mic className="h-4 w-4 text-cyan-300" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                      Voice Agent
                    </span>
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold leading-tight text-white">
                    Screen every candidate.<br />Miss nothing important.
                  </h3>
                  <p className="mt-3 max-w-[44ch] text-sm leading-7 text-white/50">
                    Start an AI-guided interview in seconds. The agent asks structured questions, captures live transcription, and delivers a recruiter-ready summary — without a human moderator in the room.
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {[
                      "Real-time voice transcription during live sessions",
                      "AI-guided structured interview questions",
                      "Conversational signal and communication analysis",
                      "Recruiter summaries with follow-up recommendations",
                    ].map((cap) => (
                      <li key={cap} className="flex items-start gap-3 text-sm text-white/58">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-cyan-400/70" />
                        {cap}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 border-t border-white/[0.07] pt-6">
                    <Link
                      href="/voice-agent"
                      className="group inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200"
                    >
                      Launch Voice Agent
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Connector row */}
            <div className="border-t border-white/[0.07] bg-white/[0.02] px-8 py-5">
              <p className="text-sm leading-7 text-white/38">
                <span className="font-medium text-white/65">Everything connects.</span>{" "}
                Resume scores inform interview prep. Interview signals reinforce evaluation. One workflow, zero context lost — from job brief to hiring decision.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. How it works ──────────────────────────────────────────────────── */}
        <section>
          <ProductPanel className="p-7 md:p-10">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 bg-[radial-gradient(circle_at_80%_50%,rgba(34,211,238,0.07),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-2/5 bg-[radial-gradient(circle_at_20%_50%,rgba(122,77,255,0.09),transparent_60%)]" />

            <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-16">
              <div className="lg:sticky lg:top-24">
                <SectionBadge>Workflow</SectionBadge>
                <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                  From job brief to hiring decision — in one place
                </h2>
                <p className="mt-4 text-base leading-8 text-white/55">
                  GradVoice connects every step of candidate assessment without switching tools, losing context, or
                  rebuilding evaluation criteria from scratch.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full bg-[#7A4DFF] px-6 text-white shadow-[0_16px_40px_rgba(122,77,255,0.3)] hover:bg-[#6a3ff2]"
                  >
                    <Link href="/analyzer">
                      Open CV Analyzer
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/14 bg-white/[0.03] px-6 text-white hover:bg-white/[0.07] hover:text-white"
                  >
                    <Link href="/voice-agent">
                      <Mic className="h-4 w-4" />
                      Launch Voice Agent
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="pt-1">
                {steps.map((step, i) => (
                  <StepCard key={step.number} step={step} index={i} total={steps.length} />
                ))}
              </div>
            </div>
          </ProductPanel>
        </section>

        {/* ── 5. Product showcase ──────────────────────────────────────────────── */}
        <section className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <SectionBadge>Core workflows</SectionBadge>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Choose the workflow that fits your hiring stage
            </h2>
            <p className="text-base leading-8 text-white/55">
              Resume evaluation and voice screening are connected systems — each built for high-quality candidate assessment.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* CV Analyzer card */}
            <ProductPanel className="group h-full p-7 md:p-8">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-violet-500/18 via-violet-400/8 to-transparent" />
              <div className="relative flex h-full flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10">
                      <FileSearch className="h-6 w-6 text-violet-300" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">CV Analyzer</h2>
                    <p className="mt-3 max-w-md text-sm leading-7 text-white/58">
                      Assess candidate resumes against role requirements with transparent scoring, skill extraction,
                      and structured fit analysis — in one pass.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
                    Workflow
                  </span>
                </div>

                <div className="grid gap-2.5">
                  {[
                    "Upload CVs and job descriptions in seconds",
                    "Evaluate skill alignment, experience depth, and coverage gaps",
                    "Generate shortlist recommendations backed by clear reasoning",
                  ].map((bullet) => (
                    <div
                      key={bullet}
                      className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/18 px-4 py-3 text-sm text-white/65"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/30">Sample output</div>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "Technical alignment", pct: 94, color: "bg-violet-400" },
                      { label: "Role coverage", pct: 82, color: "bg-cyan-400" },
                    ].map((bar) => (
                      <div key={bar.label}>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-white/45">{bar.label}</span>
                          <span className="text-white/70">{bar.pct}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-white/[0.06]">
                          <div
                            className={cn("h-1.5 rounded-full opacity-75", bar.color)}
                            style={{ width: `${bar.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-4 pt-1">
                  <div className="text-sm text-white/38">Built for recruiter review, not demo theatrics.</div>
                  <Button
                    asChild
                    className="shrink-0 rounded-full bg-white px-5 text-[#09090f] hover:bg-white/92"
                  >
                    <Link href="/analyzer">
                      Open CV Analyzer
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </ProductPanel>

            {/* Voice Agent card */}
            <ProductPanel className="group h-full p-7 md:p-8">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-cyan-400/16 via-cyan-400/7 to-transparent" />
              <div className="relative flex h-full flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                      <Mic className="h-6 w-6 text-cyan-300" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">Voice Agent</h2>
                    <p className="mt-3 max-w-md text-sm leading-7 text-white/58">
                      Run AI-guided screening interviews with live transcription, conversational intelligence,
                      and structured post-call summaries designed for hiring decisions.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
                    Workflow
                  </span>
                </div>

                <div className="grid gap-2.5">
                  {[
                    "Start real-time AI interview sessions instantly",
                    "Capture transcripts, conversational signals, and insights live",
                    "Review structured summaries designed for hiring decisions",
                  ].map((bullet) => (
                    <div
                      key={bullet}
                      className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/18 px-4 py-3 text-sm text-white/65"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/30">Live transcript</div>
                  <div className="mt-3 space-y-2">
                    {[
                      { speaker: "AI", text: "What backend systems have you fully owned?", accent: "text-cyan-300" },
                      { speaker: "Candidate", text: "I managed the billing and notification services end-to-end.", accent: "text-violet-300" },
                    ].map((line) => (
                      <div key={line.text} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
                        <span className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", line.accent)}>
                          {line.speaker}
                        </span>
                        <p className="mt-1 text-[11px] leading-5 text-white/55">{line.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-4 pt-1">
                  <div className="text-sm text-white/38">Structured conversations, not scripted demos.</div>
                  <Button
                    asChild
                    className="shrink-0 rounded-full bg-white px-5 text-[#09090f] hover:bg-white/92"
                  >
                    <Link href="/voice-agent">
                      Launch Voice Agent
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </ProductPanel>
          </div>
        </section>

        {/* ── 6. Operational depth ─────────────────────────────────────────────── */}
        <section className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <SectionBadge>Operational depth</SectionBadge>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Outputs designed for real hiring decisions
            </h2>
            <p className="text-base leading-8 text-white/55">
              Every analysis surfaces the evidence recruiters need — without the noise they don&apos;t.
            </p>
          </div>

          <ProductPanel className="p-6 md:p-8">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                        Candidate evaluation
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        Evidence-based resume review output
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[10px] font-medium text-violet-200">
                      Structured
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">What it surfaces</div>
                      <ul className="mt-3 space-y-2.5 text-sm text-white/62">
                        {[
                          "Skills, tools, and requirements extracted from CV and JD",
                          "Role-fit signals across experience, technical alignment, and coverage",
                          "A structured summary recruiters can review without reading raw files",
                        ].map((item) => (
                          <li key={item} className="flex gap-3">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">What it flags</div>
                      <ul className="mt-3 space-y-2.5 text-sm text-white/62">
                        {[
                          "Missing or weakly evidenced requirements from the role brief",
                          "Gaps that should be validated in interview, not assumed",
                          "Areas where recruiters need deeper context before deciding",
                        ].map((item) => (
                          <li key={item} className="flex gap-3">
                            <Target className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Evidence map", value: "Skills extracted", sub: "Python, FastAPI, AWS, Docker, CI/CD, system design" },
                    { label: "Decision support", value: "Shortlist recommendation", sub: "Advance to technical interview with architecture follow-up." },
                    { label: "Review time", value: "Condensed", sub: "Recruiters read signals, not raw document noise." },
                  ].map((card) => (
                    <div key={card.label} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">{card.label}</div>
                      <div className="mt-2.5 text-base font-semibold text-white">{card.value}</div>
                      <div className="mt-1.5 text-[12px] leading-5 text-white/50">{card.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                        Conversation review
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        Interview transcript and AI insights
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-medium text-cyan-200">
                      Real-time
                    </span>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    {[
                      { speaker: "AI interviewer", text: "What backend systems have you fully owned?", accent: "text-cyan-200" },
                      { speaker: "Candidate", text: "I managed our notification and billing services — including deployment and monitoring.", accent: "text-violet-200" },
                      { speaker: "AI interviewer", text: "What improvements did you introduce in reliability or delivery speed?", accent: "text-cyan-200" },
                    ].map((line, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3.5"
                      >
                        <div className={cn("text-[10px] font-semibold uppercase tracking-[0.2em]", line.accent)}>
                          {line.speaker}
                        </div>
                        <div className="mt-1.5 text-sm leading-6 text-white/62">{line.text}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">AI interview summary</div>
                    <div className="mt-2.5 text-[12px] leading-6 text-white/55">
                      Strong ownership indicators, relevant production experience, and credible process improvements. Further validation needed in leadership depth.
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Recruiter recommendation</div>
                    <div className="mt-2.5 text-[12px] leading-6 text-white/55">
                      Proceed to technical interview with scenario-based architecture evaluation.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ProductPanel>
        </section>

        {/* ── 7. Outcomes ──────────────────────────────────────────────────────── */}
        <section className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <SectionBadge>Outcomes</SectionBadge>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Better structure leads to better hiring outcomes
            </h2>
            <p className="text-base leading-8 text-white/55">
              GradVoice helps teams move faster while preserving the depth required for confident decisions.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {outcomes.map(({ title, description, icon: Icon, accent, bg, border }) => (
              <ProductPanel key={title} className="h-full p-6">
                <div
                  className={cn(
                    "inline-flex h-11 w-11 items-center justify-center rounded-2xl border",
                    bg,
                    border,
                  )}
                >
                  <Icon className={cn("h-5 w-5", accent)} />
                </div>
                <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2.5 text-sm leading-7 text-white/52">{description}</p>
              </ProductPanel>
            ))}
          </div>
        </section>

        {/* ── 8. Final CTA ─────────────────────────────────────────────────────── */}
        <section>
          <ProductPanel className="overflow-hidden p-8 md:p-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(122,77,255,0.22),transparent_55%),radial-gradient(ellipse_at_20%_80%,rgba(34,211,238,0.10),transparent_45%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:80px_80px] opacity-60" />

            <div className="relative mx-auto max-w-3xl text-center">
              <SectionBadge>Get started</SectionBadge>

              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl lg:text-[56px]">
                Start the workflow that fits{" "}
                <span className="text-violet-300">
                  your next hire
                </span>
              </h2>

              <p className="mx-auto mt-5 max-w-[50ch] text-base leading-8 text-white/55 md:text-lg">
                Analyze candidate resumes or launch a structured voice screening session — both inside one unified platform, no setup required.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-full bg-[#7A4DFF] px-8 text-white shadow-[0_20px_52px_rgba(122,77,255,0.4)] hover:bg-[#6a3ff2] hover:shadow-[0_24px_60px_rgba(122,77,255,0.5)] sm:w-auto"
                >
                  <Link href="/analyzer">
                    Analyze a candidate
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full rounded-full border-white/14 bg-white/[0.03] px-8 text-white hover:bg-white/[0.08] hover:text-white sm:w-auto"
                >
                  <Link href="/voice-agent">
                    <Mic className="h-4 w-4" />
                    Start voice interview
                  </Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/8 pt-8">
                {["No account setup required", "Works on any device", "Structured output every time"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-white/40">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-violet-300/60" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </ProductPanel>
        </section>

      </ProductShell>
    </>
  )
}
