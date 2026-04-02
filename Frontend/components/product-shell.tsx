import type { ComponentProps, ReactNode } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigationItems = [
  { href: "/", label: "Overview" },
  { href: "/analyzer", label: "CV Analyzer" },
  { href: "/voice-agent", label: "Voice Agent" },
]

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(122,77,255,0.9),rgba(72,208,255,0.45))] shadow-[0_0_32px_rgba(122,77,255,0.28)]">
        <svg viewBox="0 0 100 100" className="h-6 w-6 text-white" aria-hidden="true">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="3" />
          <rect x="38" y="30" width="6" height="40" rx="3" fill="currentColor" />
          <rect x="48" y="20" width="6" height="50" rx="3" fill="currentColor" />
          <rect x="58" y="35" width="6" height="35" rx="3" fill="currentColor" />
        </svg>
      </div>
      {!compact && (
        <div>
          <div className="text-sm font-semibold tracking-[0.02em] text-white">HR Advisor</div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            AI Recruitment Platform
          </div>
        </div>
      )}
    </div>
  )
}

export function ProductPanel({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

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

          <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1.5 md:flex">
            {navigationItems.map((item) => {
              const active = currentPath === item.href
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

          <div className="flex items-center gap-2 md:hidden">
            <Button
              asChild
              variant="ghost"
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Link href={currentPath === "/voice-agent" ? "/analyzer" : "/voice-agent"}>
                {currentPath === "/voice-agent" ? "CV Analyzer" : "Voice Agent"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-10 md:px-8 md:pt-12", mainClassName)}>
        {children}
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black/20">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-6 text-sm text-white/45 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <BrandMark compact />
            <span>Structured screening and conversational interviews in one product.</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/analyzer" className="transition-colors hover:text-white/75">
              Analyze resumes
            </Link>
            <Link href="/voice-agent" className="transition-colors hover:text-white/75">
              Run voice screening
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
