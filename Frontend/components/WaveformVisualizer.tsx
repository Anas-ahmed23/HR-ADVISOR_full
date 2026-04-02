"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const RESTING_WAVE = [26, 34, 42, 52, 64, 78, 64, 52, 42, 34, 26]

interface WaveformVisualizerProps {
  isActive: boolean
  className?: string
  variant?: "listening" | "speaking"
}

export function WaveformVisualizer({
  isActive,
  className,
  variant = "listening",
}: WaveformVisualizerProps) {
  const bars = 11
  const [heights, setHeights] = useState<number[]>(RESTING_WAVE)

  useEffect(() => {
    if (!isActive) {
      setHeights(RESTING_WAVE)
      return
    }

    const interval = setInterval(() => {
      setHeights(
        Array(bars)
          .fill(0)
          .map((_, i) => {
            const centerDistance = Math.abs(i - Math.floor(bars / 2))
            const baseHeight = 92 - centerDistance * 10
            const randomVariation = Math.random() * 34 + (variant === "speaking" ? 26 : 18)
            return Math.min(100, baseHeight + randomVariation)
          })
      )
    }, 150)

    return () => clearInterval(interval)
  }, [bars, isActive, variant])

  return (
    <div
      className={cn(
        "relative flex h-40 items-end justify-center gap-2 overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(122,77,255,0.18),rgba(255,255,255,0.02)_46%,transparent_72%)] px-6 py-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-8 bottom-0 h-20 rounded-full bg-[#7A4DFF]/10 blur-3xl" />
      {heights.map((height, i) => (
        <div
          key={i}
          className="relative w-2 rounded-full transition-[height,opacity,transform] duration-150 ease-out"
          style={{
            height: `${height}%`,
            opacity: isActive ? 1 : 0.75,
            transform: `translateY(${isActive ? 0 : (i % 2 === 0 ? 2 : -2)}px)`,
            background:
              variant === "speaking"
                ? "linear-gradient(180deg, rgba(103,232,249,0.95) 0%, rgba(122,77,255,0.9) 100%)"
                : "linear-gradient(180deg, rgba(193,167,255,0.95) 0%, rgba(122,77,255,0.82) 100%)",
            boxShadow:
              variant === "speaking"
                ? "0 0 18px rgba(103,232,249,0.2)"
                : "0 0 18px rgba(122,77,255,0.2)",
          }}
        />
      ))}
    </div>
  )
}
