import type { ReactNode } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Brain,
  Briefcase,
  CheckCircle2,
  Clock,
  FileCheck,
  FileSearch,
  MessageSquare,
  Mic,
  Shield,
  Sparkles,
  Target,
  Users,
} from "lucide-react"

import { ProductPanel, ProductShell } from "@/components/product-shell"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "GradVoice - AI Recruitment Intelligence",
  description:
    "Evaluate candidates with precision using AI-driven CV analysis and real-time voice screening in a single unified workflow.",
}

const heroWorkflowPreview = [
  {
    title: "Role requirements mapped",
    description: "Turn raw job briefs into structured hiring criteria before candidate review starts.",
    icon: Briefcase,
    accent: "text-cyan-300",
  },
  {
    title: "Resume evidence scored",
    description: "Extract skills, experience, and fit signals into a recruiter-readable assessment.",
    icon: Brain,
    accent: "text-violet-300",
  },
  {
    title: "Interview signals captured",
    description: "Add transcript-backed voice screening insights before you move a candidate forward.",
    icon: FileCheck,
    accent: "text-cyan-300",
  },
]

const valuePillars = [
  {
    title: "Accelerated candidate screening",
    description: "Transform raw applications into structured hiring signals without manual overhead.",
    icon: Clock,
    accent: "text-violet-300",
  },
  {
    title: "Actionable candidate insights",
    description: "Understand strengths, gaps, and role fit through evidence-backed analysis.",
    icon: BarChart3,
    accent: "text-cyan-300",
  },
  {
    title: "AI-driven voice interviews",
    description: "Conduct structured conversations with real-time transcription and contextual capture.",
    icon: Mic,
    accent: "text-violet-300",
  },
  {
    title: "End-to-end hiring clarity",
    description: "Unify resume evaluation and interview insights into one coherent decision layer.",
    icon: Shield,
    accent: "text-cyan-300",
  },
]

const workflows = [
  {
    title: "CV Analyzer",
    description:
      "Assess candidate resumes against role requirements with transparent scoring, skill extraction, and structured fit analysis.",
    href: "/analyzer",
    cta: "Open CV Analyzer",
    icon: FileSearch,
    accentClass: "from-[#7A4DFF]/20 via-[#7A4DFF]/10 to-transparent",
    iconClass: "text-violet-300",
    bullets: [
      "Upload candidate CVs alongside role descriptions in seconds",
      "Evaluate skill alignment, experience depth, and coverage gaps",
      "Generate structured recommendations backed by clear reasoning",
    ],
  },
  {
    title: "Voice Agent",
    description:
      "Run AI-guided screening interviews with live transcription, conversational intelligence, and structured post-call summaries.",
    href: "/voice-agent",
    cta: "Launch Voice Agent",
    icon: Mic,
    accentClass: "from-cyan-400/18 via-cyan-400/8 to-transparent",
    iconClass: "text-cyan-300",
    bullets: [
      "Start real-time interview sessions instantly",
      "Capture transcripts, conversational signals, and insights live",
      "Review structured summaries designed for hiring decisions",
    ],
  },
]

const outcomes = [
  {
    title: "Reduce screening effort",
    description: "Surface high-signal candidate insights earlier, minimizing manual review time.",
    icon: Clock,
    accent: "bg-violet-400/12 text-violet-200",
  },
  {
    title: "Standardize evaluation",
    description: "Apply consistent, structured assessment across resumes and interviews.",
    icon: Target,
    accent: "bg-cyan-400/12 text-cyan-200",
  },
  {
    title: "Capture deeper signals",
    description: "Preserve conversational context, communication quality, and decision-critical details.",
    icon: MessageSquare,
    accent: "bg-violet-400/12 text-violet-200",
  },
  {
    title: "Enable faster decisions",
    description: "Turn screening data into clear next steps for hiring teams.",
    icon: Users,
    accent: "bg-cyan-400/12 text-cyan-200",
  },
]

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </div>
  )
}

function WorkflowCard({
  title,
  description,
  href,
  cta,
  icon: Icon,
  bullets,
  accentClass,
  iconClass,
}: (typeof workflows)[number]) {
  return (
    <ProductPanel className="group h-full p-7 md:p-8">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${accentClass}`} />
      <div className="relative flex h-full flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Icon className={`h-6 w-6 ${iconClass}`} />
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">{title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/65">{description}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
            Workflow
          </span>
        </div>

        <div className="grid gap-3">
          {bullets.map((bullet) => (
            <div
              key={bullet}
              className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/72"
            >
              <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
              <span>{bullet}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 pt-2">
          <div className="text-sm text-white/45">Designed for recruiter review, not demo theatrics.</div>
          <Button
            asChild
            className="rounded-full bg-white px-5 text-[#09090f] hover:bg-white/90"
          >
            <Link href={href}>
              {cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </ProductPanel>
  )
}

export default function HomePage() {
  return (
    <ProductShell currentPath="/" mainClassName="space-y-16 pt-0 md:space-y-20 md:pt-0">
      <section className="pt-8 md:pt-10">
        <ProductPanel className="overflow-hidden border-white/12 bg-[linear-gradient(135deg,#070811_0%,#0b1020_58%,#07111a_100%)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,77,255,0.26),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_42%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-[linear-gradient(180deg,rgba(122,77,255,0.08),rgba(34,211,238,0.02))] lg:block" />

          <div className="relative grid gap-10 px-6 py-8 md:px-8 md:py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:px-10 lg:py-12">
            <div className="max-w-3xl">
              <SectionLabel>AI recruitment intelligence</SectionLabel>
              <h1 className="mt-6 max-w-[13ch] text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-5xl md:text-6xl xl:text-7xl">
                Screen candidates, run AI interviews, and move forward with confidence.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/66 md:text-lg">
                GradVoice combines structured CV analysis with voice-driven screening so hiring teams can compare candidates faster without losing context.
              </p>

              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-full bg-[#7A4DFF] px-6 text-white shadow-[0_18px_44px_rgba(122,77,255,0.3)] hover:bg-[#6a3ff2] sm:w-auto"
                >
                  <Link href="/analyzer">
                    Analyze candidate CVs
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full rounded-full border-white/15 bg-white/[0.03] px-6 text-white hover:bg-white/[0.08] hover:text-white sm:w-auto"
                >
                  <Link href="/voice-agent">
                    Launch voice screening
                    <Mic className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  "Compare CVs against role criteria in one pass",
                  "Capture transcript-backed interview evidence",
                  "Review shortlist recommendations with clear reasoning",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/68"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[26px] border border-white/10 bg-black/24 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)] md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                      Hiring signal pipeline
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      Lightweight page, full workflow context
                    </div>
                  </div>
                  <div className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-200">
                    Home overview
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {heroWorkflowPreview.map(({ title, description, icon: Icon, accent }, index) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
                          <Icon className={`h-5 w-5 ${accent}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                              Step {index + 1}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-white/20" />
                            <span className="text-sm font-semibold text-white">{title}</span>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-white/60">{description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-black/24 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Review path</div>
                  <div className="mt-3 text-lg font-semibold text-white">CV to interview</div>
                  <div className="mt-2 text-sm leading-7 text-white/55">
                    One connected workflow instead of disconnected recruiter steps.
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/24 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Output style</div>
                  <div className="mt-3 text-lg font-semibold text-white">Structured</div>
                  <div className="mt-2 text-sm leading-7 text-white/55">
                    Recruiter-facing signals, summaries, and follow-up flags.
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/24 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Local performance</div>
                  <div className="mt-3 text-lg font-semibold text-white">No WebGL</div>
                  <div className="mt-2 text-sm leading-7 text-white/55">
                    Faster initial render without Spline, canvas, or remote scene downloads.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ProductPanel>
      </section>

      <section>
        <ProductPanel className="p-3 sm:p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {valuePillars.map(({ title, description, icon: Icon, accent }) => (
              <div
                key={title}
                className="flex gap-4 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4"
              >
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Icon className={`h-5 w-5 ${accent}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="mt-1 text-sm leading-6 text-white/55">{description}</div>
                </div>
              </div>
            ))}
          </div>
        </ProductPanel>
      </section>

      <section className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <SectionLabel>Core workflows</SectionLabel>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
            Select the workflow that fits your hiring stage
          </h2>
          <p className="text-base leading-8 text-white/60">
            Resume evaluation and conversational screening operate as connected systems, each designed for high-quality candidate assessment.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {workflows.map((workflow) => (
            <WorkflowCard key={workflow.title} {...workflow} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <SectionLabel>Operational depth</SectionLabel>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
            A system designed for real hiring decisions
          </h2>
          <p className="text-base leading-8 text-white/60">
            Explore how structured outputs from resume analysis and interview workflows support faster, more confident decisions.
          </p>
        </div>

        <ProductPanel className="p-6 md:p-7">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/35">Candidate evaluation</div>
                    <div className="mt-2 text-lg font-semibold text-white">Evidence-based resume review output</div>
                  </div>
                  <div className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-200">
                    Structured analysis
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">What the system surfaces</div>
                    <ul className="mt-3 space-y-3 text-sm text-white/68">
                      {[
                        "Extracted skills, tools, and requirements from the CV and job description",
                        "Role-fit signals across experience, technical alignment, and coverage",
                        "A structured summary recruiters can review without reading raw files first",
                      ].map((item) => (
                        <li key={item} className="flex gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">What it flags for follow-up</div>
                    <ul className="mt-3 space-y-3 text-sm text-white/68">
                      {[
                        "Missing or weakly evidenced requirements from the role brief",
                        "Gaps that should be validated in interview rather than assumed",
                        "Areas where recruiters need deeper context before making a decision",
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

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Evidence map</div>
                  <div className="mt-3 text-lg font-semibold text-white">Skills extracted</div>
                  <div className="mt-2 text-sm leading-7 text-white/55">
                    Python, FastAPI, AWS, Docker, CI/CD, system design
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Decision support</div>
                  <div className="mt-3 text-lg font-semibold text-white">Shortlist recommendation</div>
                  <div className="mt-2 text-sm leading-7 text-white/55">
                    Advance to technical interview with architecture follow-up.
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Review time</div>
                  <div className="mt-3 text-lg font-semibold text-white">Condensed</div>
                  <div className="mt-2 text-sm leading-7 text-white/55">
                    Recruiters review the signal, not raw document noise.
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/35">Conversation review</div>
                    <div className="mt-2 text-lg font-semibold text-white">Interview transcript and insights</div>
                  </div>
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                    Real-time
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    {
                      speaker: "AI interviewer",
                      text: "What backend systems have you fully owned?",
                      accent: "text-cyan-200",
                    },
                    {
                      speaker: "Candidate",
                      text: "I managed notification and billing services including deployment and monitoring.",
                      accent: "text-violet-200",
                    },
                    {
                      speaker: "AI interviewer",
                      text: "What improvements did you introduce in reliability or delivery speed?",
                      accent: "text-cyan-200",
                    },
                  ].map((item) => (
                    <div key={`${item.speaker}-${item.text}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className={`text-xs font-semibold uppercase tracking-[0.2em] ${item.accent}`}>
                        {item.speaker}
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/68">{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">AI interview summary</div>
                  <div className="mt-3 text-sm leading-7 text-white/60">
                    Strong ownership indicators, relevant production experience, and credible process improvements. Further validation needed in leadership depth.
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Recruiter recommendation</div>
                  <div className="mt-3 text-sm leading-7 text-white/60">
                    Proceed to technical interview with scenario-based architecture evaluation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ProductPanel>
      </section>

      <section className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <SectionLabel>Outcomes</SectionLabel>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
            Better structure leads to better hiring outcomes
          </h2>
          <p className="text-base leading-8 text-white/60">
            GradVoice helps teams move faster while preserving the depth and context required for confident hiring decisions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {outcomes.map(({ title, description, icon: Icon, accent }) => (
            <ProductPanel key={title} className="h-full p-5">
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 ${accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/58">{description}</p>
            </ProductPanel>
          ))}
        </div>
      </section>

      <section>
        <ProductPanel className="overflow-hidden p-7 md:p-10">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(122,77,255,0.22),transparent_62%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <SectionLabel>Get started</SectionLabel>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                Start the workflow that fits your next hiring step
              </h2>
              <p className="mt-4 text-base leading-8 text-white/60">
                Analyze candidate resumes or launch a structured voice screening session, all within one unified platform.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[#7A4DFF] px-6 text-white shadow-[0_16px_40px_rgba(122,77,255,0.32)] hover:bg-[#6a3ff2]"
              >
                <Link href="/analyzer">
                  Analyze candidate
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/15 bg-white/[0.03] px-6 text-white hover:bg-white/[0.08] hover:text-white"
              >
                <Link href="/voice-agent">
                  Start voice interview
                  <Mic className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </ProductPanel>
      </section>
    </ProductShell>
  )
}
