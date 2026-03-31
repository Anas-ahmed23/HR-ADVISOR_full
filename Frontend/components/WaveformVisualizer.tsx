"use client"

import { useEffect, useState } from "react"

interface WaveformVisualizerProps {
  isActive: boolean
}

export function WaveformVisualizer({ isActive }: WaveformVisualizerProps) {
  const bars = 7
  const [heights, setHeights] = useState<number[]>(Array(bars).fill(20))

  useEffect(() => {
    if (!isActive) {
      setHeights(Array(bars).fill(20))
      return
    }
    const interval = setInterval(() => {
      setHeights(
        Array(bars)
          .fill(0)
          .map((_, i) => {
            const centerDistance = Math.abs(i - Math.floor(bars / 2))
            const baseHeight = 100 - centerDistance * 15
            const randomVariation = Math.random() * 60 + 40
            return Math.min(200, baseHeight + randomVariation)
          })
      )
    }, 150)
    return () => clearInterval(interval)
  }, [isActive])

  return (
    <div className="flex items-center justify-center gap-3 h-64 bg-[rgba(122,77,255,0)]">
      {heights.map((height, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-150 ease-out"
          style={{
            width: "20px",
            height: `${height}px`,
            backgroundColor: "#7A4DFF",
          }}
        />
      ))}
    </div>
  )
}
