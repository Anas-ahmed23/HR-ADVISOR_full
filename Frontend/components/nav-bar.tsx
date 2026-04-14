"use client"

import Link from "next/link"
import { useAnalysis } from "@/context/analysis-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"

const NAV_ITEMS = [
  { href: "/",             label: "Overview"    },
  { href: "/analyzer",    label: "CV Analyzer" },
  { href: "/voice-agent", label: "Voice Agent" },
] as const

export function NavBar({ currentPath }: { currentPath: string }) {
  const { isComplete } = useAnalysis()

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1.5 md:flex">
        {NAV_ITEMS.map((item) => {
          const active  = currentPath === item.href
          const locked  = item.href === "/voice-agent" && !isComplete

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
