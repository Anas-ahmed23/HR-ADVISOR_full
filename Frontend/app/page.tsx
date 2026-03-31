import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  FileSearch,
  Mic,
  Sparkles,
  ArrowRight,
  Target,
  MessageCircle,
  BarChart3,
  Zap,
  Upload,
  Brain,
  FileCheck,
  Phone,
  MessageSquare,
  ClipboardList,
  Users,
  Briefcase,
  TrendingUp,
  Clock,
  Shield,
} from "lucide-react"
import ShaderBackground from "@/components/ui/shader-background"

export const metadata = {
  title: "HR Advisor - AI-Powered HR Tools",
  description:
    "Evidence-based CV matching and AI voice agent. Semantic CV analysis and conversational HR assistance in one place.",
}

const useCases = [
  {
    id: "cv-analyzer",
    title: "CV Analyzer",
    subtitle: "Evidence-Based CV Matching",
    description:
      "Evaluate CVs against job descriptions using semantic AI — not keyword guessing. Get transparent, recruiter-grade insights and ATS-style scores.",
    href: "/analyzer",
    icon: FileSearch,
    cta: "Analyze Your CV",
    accent: "#7A4DFF",
  },
  {
    id: "voice-agent",
    title: "Voice Agent",
    subtitle: "AI Voice Conversation",
    description:
      "Talk naturally with an AI assistant. Real-time speech-to-text and text-to-speech with barge-in support. Perfect for HR Q&A and guidance.",
    href: "/voice-agent",
    icon: Mic,
    cta: "Start Conversation",
    accent: "#0EA5E9",
  },
]

const whyChooseFeatures = [
  {
    title: "AI-Powered CV Analysis",
    description:
      "Intelligent matching algorithm that evaluates candidates against job descriptions with precision scoring.",
    icon: Target,
    color: "#7A4DFF",
  },
  {
    title: "Real-time Voice Conversations",
    description:
      "Natural voice agent for conducting pre-screening interviews with instant transcription.",
    icon: MessageCircle,
    color: "#0EA5E9",
  },
  {
    title: "Comprehensive Insights",
    description:
      "Detailed breakdowns of skills match, experience alignment, and education validation.",
    icon: BarChart3,
    color: "#7A4DFF",
  },
  {
    title: "Time-Saving Automation",
    description:
      "Reduce screening time by 80% with automated analysis and intelligent recommendations.",
    icon: Zap,
    color: "#0EA5E9",
  },
]

const howItWorksCv = [
  { step: 1, title: "Upload candidate CV and job description", icon: Upload },
  { step: 2, title: "AI analyzes skills, experience, and education match", icon: Brain },
  { step: 3, title: "Get detailed compatibility scores and recommendations", icon: FileCheck },
]

const howItWorksVoice = [
  { step: 1, title: "Start a voice conversation session", icon: Phone },
  { step: 2, title: "Conduct natural pre-screening interviews", icon: MessageSquare },
  { step: 3, title: "Review transcripts and AI-generated insights", icon: ClipboardList },
]

const keyMetrics = [
  { value: "95%", label: "Accuracy in skill matching", icon: Target },
  { value: "10min", label: "Average analysis time", icon: Clock },
  { value: "80%", label: "Time saved in screening process", icon: Zap },
  { value: "24/7", label: "Voice agent availability", icon: Shield },
]

const useCasesList = [
  {
    title: "Recruitment Teams",
    description: "Streamline candidate screening with AI-powered shortlisting and scoring.",
    icon: Users,
  },
  {
    title: "HR Departments",
    description: "Automate initial interviews and focus on high-value conversations.",
    icon: Briefcase,
  },
  {
    title: "Hiring Managers",
    description: "Get data-driven hiring insights and evidence-based recommendations.",
    icon: BarChart3,
  },
  {
    title: "Talent Acquisition",
    description: "Scale your hiring process without compromising quality or speed.",
    icon: TrendingUp,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen relative">
      <ShaderBackground />
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#7A4DFF" }}
            >
              <svg viewBox="0 0 100 100" className="w-6 h-6 text-white">
                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="3" />
                <rect x="38" y="30" width="6" height="40" rx="3" fill="currentColor" />
                <rect x="48" y="20" width="6" height="50" rx="3" fill="currentColor" />
                <rect x="58" y="35" width="6" height="35" rx="3" fill="currentColor" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">HR Advisor</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/analyzer">
              <Button
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                CV Analyzer
              </Button>
            </Link>
            <Link href="/voice-agent">
              <Button
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                Voice Agent
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-20 space-y-20">
        {/* HERO */}
        <section className="text-center space-y-6 max-w-3xl mx-auto pt-8 opacity-0 animate-fade-in-up">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm text-sm font-medium border border-white/10"
            style={{ color: "#7A4DFF" }}
          >
            <Sparkles className="w-4 h-4" />
            AI-Powered HR Tools
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight text-balance text-white">
            One place for
            <br />
            <span style={{ color: "#7A4DFF" }}>CV analysis</span> &{" "}
            <span style={{ color: "#0EA5E9" }}>voice agent</span>
          </h1>
          <p className="text-xl text-white/70 leading-relaxed">
            Evidence-based CV matching and conversational AI. Choose a use case below to get started.
          </p>
        </section>

        {/* USE CASE CARDS */}
        <section className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {useCases.map((item, i) => (
            <Link
              key={item.id}
              href={item.href}
              className="group block animate-fade-in-up"
              style={{ animationDelay: `${100 + i * 80}ms`, opacity: 0 }}
            >
              <Card
                className="p-8 h-full border border-white/10 bg-white/5 backdrop-blur-md rounded-xl shadow-2xl hover:bg-white/10 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_0_40px_rgba(122,77,255,0.15)]"
                style={{
                  borderColor: item.id === "voice-agent" ? "rgba(14, 165, 233, 0.2)" : "rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${item.accent}20` }}
                >
                  <item.icon className="w-7 h-7" style={{ color: item.accent }} />
                </div>
                <p className="text-sm font-medium mb-2" style={{ color: item.accent }}>
                  {item.subtitle}
                </p>
                <h2 className="font-bold text-2xl text-white mb-3">{item.title}</h2>
                <p className="text-white/60 leading-relaxed mb-6">{item.description}</p>
                <span
                  className="inline-flex items-center gap-2 font-semibold text-white group-hover:gap-3 transition-all"
                  style={{ color: item.accent }}
                >
                  {item.cta}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Card>
            </Link>
          ))}
        </section>

        {/* WHY CHOOSE HR ADVISOR */}
        <section className="py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4 animate-fade-in-up opacity-0" style={{ animationDelay: "0ms" }}>
            Why Choose HR Advisor?
          </h2>
          <p className="text-white/60 text-center max-w-2xl mx-auto mb-12 animate-fade-in-up opacity-0" style={{ animationDelay: "80ms" }}>
            AI-powered intelligence and automation built for modern hiring teams.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseFeatures.map((feature, i) => (
              <Card
                key={feature.title}
                className="p-6 border border-white/10 bg-white/5 backdrop-blur-md rounded-xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_40px_rgba(122,77,255,0.15)] opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${120 + i * 80}ms` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${feature.color}20` }}
                >
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="font-bold text-lg text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4 animate-fade-in-up opacity-0" style={{ animationDelay: "0ms" }}>
            How It Works
          </h2>
          <p className="text-white/60 text-center max-w-2xl mx-auto mb-12 animate-fade-in-up opacity-0" style={{ animationDelay: "80ms" }}>
            Two powerful workflows: CV analysis and voice-led screening.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* CV Analysis flow */}
            <Card
              className="p-8 border border-white/10 bg-white/5 backdrop-blur-md rounded-xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_40px_rgba(122,77,255,0.15)] opacity-0 animate-fade-in-up"
              style={{ animationDelay: "120ms" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(122,77,255,0.2)" }}>
                  <FileSearch className="w-5 h-5" style={{ color: "#7A4DFF" }} />
                </div>
                <h3 className="font-bold text-xl text-white">CV Analysis</h3>
              </div>
              <ul className="space-y-5">
                {howItWorksCv.map((item, i) => (
                  <li key={item.step} className="flex gap-4 items-start">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-sm font-bold text-white">
                      {item.step}
                    </span>
                    <div className="flex-1">
                      <p className="text-white/90 font-medium">{item.title}</p>
                    </div>
                    <item.icon className="w-5 h-5 text-white/40 flex-shrink-0" />
                  </li>
                ))}
              </ul>
            </Card>
            {/* Voice Agent flow */}
            <Card
              className="p-8 border border-white/10 bg-white/5 backdrop-blur-md rounded-xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_40px_rgba(14,165,233,0.15)] opacity-0 animate-fade-in-up"
              style={{ animationDelay: "200ms" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(14,165,233,0.2)" }}>
                  <Mic className="w-5 h-5" style={{ color: "#0EA5E9" }} />
                </div>
                <h3 className="font-bold text-xl text-white">Voice Agent</h3>
              </div>
              <ul className="space-y-5">
                {howItWorksVoice.map((item, i) => (
                  <li key={item.step} className="flex gap-4 items-start">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-sm font-bold text-white">
                      {item.step}
                    </span>
                    <div className="flex-1">
                      <p className="text-white/90 font-medium">{item.title}</p>
                    </div>
                    <item.icon className="w-5 h-5 text-white/40 flex-shrink-0" />
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* KEY METRICS */}
        <section className="py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4 animate-fade-in-up opacity-0" style={{ animationDelay: "0ms" }}>
            Key Metrics
          </h2>
          <p className="text-white/60 text-center max-w-2xl mx-auto mb-12 animate-fade-in-up opacity-0" style={{ animationDelay: "80ms" }}>
            Trusted by teams who value accuracy and speed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {keyMetrics.map((metric, i) => (
              <Card
                key={metric.label}
                className="p-6 border border-white/10 bg-white/5 backdrop-blur-md rounded-xl text-center transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_40px_rgba(122,77,255,0.15)] opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${100 + i * 100}ms` }}
              >
                <metric.icon className="w-8 h-8 mx-auto mb-3" style={{ color: "#7A4DFF" }} />
                <div className="text-3xl md:text-4xl font-black text-white mb-1 tabular-nums">
                  {metric.value}
                </div>
                <div className="text-sm text-white/60 font-medium">{metric.label}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* USE CASES */}
        <section className="py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4 animate-fade-in-up opacity-0" style={{ animationDelay: "0ms" }}>
            Use Cases
          </h2>
          <p className="text-white/60 text-center max-w-2xl mx-auto mb-12 animate-fade-in-up opacity-0" style={{ animationDelay: "80ms" }}>
            Built for recruitment teams, HR, and hiring managers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCasesList.map((uc, i) => (
              <Card
                key={uc.title}
                className="p-6 border border-white/10 bg-white/5 backdrop-blur-md rounded-xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_40px_rgba(122,77,255,0.15)] opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${100 + i * 80}ms` }}
              >
                <uc.icon className="w-10 h-10 mb-4" style={{ color: "#7A4DFF" }} />
                <h3 className="font-bold text-lg text-white mb-2">{uc.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{uc.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* QUICK LINKS */}
        <section className="text-center py-8 animate-fade-in-up opacity-0" style={{ animationDelay: "100ms" }}>
          <p className="text-white/50 text-sm mb-4">Quick access</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/analyzer">
              <Button
                size="lg"
                className="font-semibold transition-all duration-300 hover:shadow-[0_0_24px_rgba(122,77,255,0.3)]"
                style={{ backgroundColor: "#7A4DFF", color: "white" }}
              >
                <FileSearch className="w-4 h-4 mr-2" />
                CV Analyzer
              </Button>
            </Link>
            <Link href="/voice-agent">
              <Button
                size="lg"
                variant="outline"
                className="font-semibold bg-white/5 border-white/20 text-white hover:bg-white/10 transition-all duration-300"
              >
                <Mic className="w-4 h-4 mr-2" />
                Voice Agent
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-white/5 backdrop-blur-md mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#7A4DFF" }}
              >
                <svg viewBox="0 0 100 100" className="w-5 h-5 text-white">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="3" />
                  <rect x="38" y="30" width="6" height="40" rx="3" fill="currentColor" />
                  <rect x="48" y="20" width="6" height="50" rx="3" fill="currentColor" />
                  <rect x="58" y="35" width="6" height="35" rx="3" fill="currentColor" />
                </svg>
              </div>
              <span className="font-semibold text-white">HR Advisor</span>
            </div>
            <p className="text-sm text-white/60">
              CV analysis (GradVoice) & Voice Agent. One app, one folder.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
