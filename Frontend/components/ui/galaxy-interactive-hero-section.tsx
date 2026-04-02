"use client"

import { Suspense, lazy, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, FileSearch, Menu, Mic, Sparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const Spline = lazy(() => import("@splinetool/react-spline"))

const previewImage =
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80"

type GalaxyInteractiveHeroSectionProps = {
  className?: string
  showNavbar?: boolean
  showScreenshotSection?: boolean
  screenshotImageSrc?: string
}

function HeroSplineFallback() {
  return (
    <div className="h-screen w-full bg-[radial-gradient(circle_at_top,rgba(122,77,255,0.32),transparent_34%),linear-gradient(180deg,#05050b_0%,#0a0b12_52%,#040409_100%)]" />
  )
}

function canCreateWebGLContext() {
  if (typeof window === "undefined") return false

  try {
    const canvas = document.createElement("canvas")
    const contextAttributes: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "default",
    }

    const context =
      canvas.getContext("webgl2", contextAttributes) ||
      canvas.getContext("webgl", contextAttributes) ||
      canvas.getContext("experimental-webgl", contextAttributes)

    if (!context) return false

    const loseContext =
      "getExtension" in context ? context.getExtension("WEBGL_lose_context") : null
    loseContext?.loseContext()

    return true
  } catch {
    return false
  }
}

function HeroSplineBackground() {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    setWebglAvailable(canCreateWebGLContext())
  }, [])

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {webglAvailable ? (
        <Suspense fallback={<HeroSplineFallback />}>
          <Spline
            scene="https://prod.spline.design/us3ALejTXl6usHZ7/scene.splinecode"
            style={{
              width: "100%",
              height: "100vh",
              pointerEvents: "auto",
            }}
          />
        </Suspense>
      ) : (
        <HeroSplineFallback />
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.86)_0%,rgba(0,0,0,0.68)_24%,rgba(0,0,0,0.18)_52%,rgba(0,0,0,0.74)_100%),linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.22)_48%,rgba(0,0,0,0.9)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_26%,rgba(122,77,255,0.18),transparent_26%),radial-gradient(circle_at_76%_14%,rgba(103,232,249,0.08),transparent_24%)]" />
    </div>
  )
}

function ScreenshotSection({
  screenshotRef,
  screenshotImageSrc,
}: {
  screenshotRef: React.RefObject<HTMLDivElement | null>
  screenshotImageSrc: string
}) {
  return (
    <section className="relative z-10 container mx-auto mt-8 px-4 md:mt-10 md:px-6 lg:px-8">
      <div
        ref={screenshotRef}
        className="mx-auto w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0d16] shadow-[0_26px_90px_rgba(0,0,0,0.5)] md:w-[84%] lg:w-[72%]"
      >
        <div className="border-b border-white/8 px-5 py-4 text-xs uppercase tracking-[0.24em] text-white/35">
          Unified hiring workspace
        </div>
        <img
          src={screenshotImageSrc}
          alt="GradVoice workspace preview"
          className="block h-auto w-full"
        />
      </div>
    </section>
  )
}

function HeroContent() {
  return (
    <div className="max-w-3xl px-4 pt-20 text-left text-white sm:px-6 sm:pt-24 md:px-8 md:pt-32">
      <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-black/25 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200 backdrop-blur-sm">
        <Sparkles className="h-3.5 w-3.5" />
        AI recruitment intelligence
      </div>

      <h1 className="mt-6 max-w-[11ch] text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-5xl md:text-7xl">
        Screen candidates, run AI interviews, and move forward with confidence.
      </h1>

      <p className="mt-6 max-w-2xl text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
        GradVoice combines intelligent CV analysis with voice-driven screening to help hiring teams evaluate candidates, capture meaningful signals, and make decisions with clarity.
      </p>

      <div className="mt-8 flex pointer-events-auto flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button
          asChild
          size="lg"
          className="w-full rounded-full bg-[#7A4DFF] px-8 text-white shadow-[0_18px_44px_rgba(122,77,255,0.3)] hover:bg-[#6a3ff2] sm:w-auto"
        >
          <Link href="/analyzer">
            <FileSearch className="h-4 w-4" />
            Go to CV Analyzer
          </Link>
        </Button>

        <Button
          asChild
          size="lg"
          variant="outline"
          className="w-full rounded-full border-white/15 bg-black/35 px-8 text-white backdrop-blur-sm hover:bg-white/[0.08] hover:text-white sm:w-auto"
        >
          <Link href="/voice-agent">
            <Mic className="h-4 w-4" />
            Go to Voice Agent
          </Link>
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-white/46">
        <span className="font-medium tracking-[0.22em] uppercase text-white/35">GradVoice</span>
        <span className="h-1 w-1 rounded-full bg-white/25" />
        <span>CV Analyzer + Voice Agent</span>
      </div>
    </div>
  )
}

function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <nav className="fixed left-0 right-0 top-0 z-20 border-b border-white/10 bg-[#0a0b13]/38 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(122,77,255,0.92),rgba(72,208,255,0.42))] shadow-[0_0_28px_rgba(122,77,255,0.24)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[0.02em]">GradVoice</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
              AI Recruitment Platform
            </div>
          </div>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          <Link href="/" className="text-sm text-white/70 transition-colors hover:text-white">
            Overview
          </Link>
          <Link href="/analyzer" className="text-sm text-white/70 transition-colors hover:text-white">
            CV Analyzer
          </Link>
          <Link href="/voice-agent" className="text-sm text-white/70 transition-colors hover:text-white">
            Voice Agent
          </Link>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button
            asChild
            variant="outline"
            className="rounded-full border-white/15 bg-black/25 text-white hover:bg-white/[0.08] hover:text-white"
          >
            <Link href="/voice-agent">Book a live screening</Link>
          </Button>
          <Button
            asChild
            className="rounded-full bg-[#7A4DFF] text-white hover:bg-[#6a3ff2]"
          >
            <Link href="/analyzer">
              Open workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <button
          className="rounded-full border border-white/10 bg-black/20 p-2 text-white lg:hidden"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-white/10 bg-[#06070d]/92 transition-all duration-300 lg:hidden",
          isMobileMenuOpen ? "max-h-72 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="flex flex-col gap-4 px-4 py-5 md:px-6">
          <Link href="/" className="text-sm text-white/72" onClick={() => setIsMobileMenuOpen(false)}>
            Overview
          </Link>
          <Link href="/analyzer" className="text-sm text-white/72" onClick={() => setIsMobileMenuOpen(false)}>
            CV Analyzer
          </Link>
          <Link href="/voice-agent" className="text-sm text-white/72" onClick={() => setIsMobileMenuOpen(false)}>
            Voice Agent
          </Link>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/15 bg-black/25 text-white hover:bg-white/[0.08] hover:text-white"
            >
              <Link href="/voice-agent" onClick={() => setIsMobileMenuOpen(false)}>
                Book a live screening
              </Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-[#7A4DFF] text-white hover:bg-[#6a3ff2]"
            >
              <Link href="/analyzer" onClick={() => setIsMobileMenuOpen(false)}>
                Open workspace
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export function GalaxyInteractiveHeroSection({
  className,
  showNavbar = true,
  showScreenshotSection = true,
  screenshotImageSrc = previewImage,
}: GalaxyInteractiveHeroSectionProps) {
  const screenshotRef = useRef<HTMLDivElement>(null)
  const heroContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!screenshotRef.current || !heroContentRef.current) return

      requestAnimationFrame(() => {
        const scrollPosition = window.pageYOffset

        if (screenshotRef.current) {
          screenshotRef.current.style.transform = `translateY(-${scrollPosition * 0.16}px)`
        }

        const maxScroll = 420
        const opacity = 1 - Math.min(scrollPosition / maxScroll, 1)

        if (heroContentRef.current) {
          heroContentRef.current.style.opacity = opacity.toString()
        }
      })
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className={cn("relative bg-black text-white", className)}>
      {showNavbar && <Navbar />}

      <div className="relative min-h-screen">
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <HeroSplineBackground />
        </div>

        <div
          ref={heroContentRef}
          className="absolute inset-0 z-10 flex items-center justify-start pointer-events-none"
        >
          <div className="container mx-auto">
            <HeroContent />
          </div>
        </div>
      </div>

      {showScreenshotSection && (
        <div className="relative z-10 -mt-[10vh] bg-black pb-16">
          <ScreenshotSection
            screenshotRef={screenshotRef}
            screenshotImageSrc={screenshotImageSrc}
          />
          <div className="container mx-auto px-4 py-16 text-white md:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-200/70">
                Ready for decision-making
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                One system for resume evaluation and interview workflows
              </h2>
              <p className="mt-4 text-base leading-8 text-white/62">
                Review resumes, capture interviews, and surface recruiter-ready outputs inside one connected workflow.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GalaxyInteractiveHeroSection
