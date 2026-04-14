"use client"

import Link from "next/link"
import { Lock, Mic } from "lucide-react"
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
      className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/8 bg-white/[0.02] px-7 py-2.5 text-base text-white/28 select-none sm:w-auto"
    >
      <Lock className="h-4 w-4" />
      Start voice screening
    </span>
  )
}
