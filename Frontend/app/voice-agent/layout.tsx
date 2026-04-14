import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Voice Agent - HR Advisor",
  description: "AI voice conversation with real-time speech and barge-in support.",
}

export default function VoiceAgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
