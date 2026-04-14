"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { LLMAnalysis } from "@/types/analysis"

const LS_KEY = "gradvoice_analysis_v1"

function isValidResult(data: unknown): data is LLMAnalysis {
  if (!data || typeof data !== "object") return false
  const d = data as Record<string, unknown>
  const hasNewScore =
    d.evaluation_result != null &&
    typeof (d.evaluation_result as Record<string, unknown>).final_score === "number"
  const hasLegacyScore = typeof d.final_score === "number"
  return hasNewScore || hasLegacyScore
}

interface AnalysisContextValue {
  result: LLMAnalysis | null
  isComplete: boolean
  setResult: (data: unknown) => void
  clearResult: () => void
}

const AnalysisContext = createContext<AnalysisContextValue>({
  result: null,
  isComplete: false,
  setResult: () => {},
  clearResult: () => {},
})

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<LLMAnalysis | null>(null)

  /* Restore from localStorage on mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (isValidResult(parsed)) {
        setResultState(parsed)
      }
    } catch {
      /* ignore corrupt data */
    }
  }, [])

  const setResult = (data: unknown) => {
    if (!isValidResult(data)) return
    setResultState(data)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {
      /* storage full or unavailable — state still works in-memory */
    }
  }

  const clearResult = () => {
    setResultState(null)
    try {
      localStorage.removeItem(LS_KEY)
    } catch {}
  }

  return (
    <AnalysisContext.Provider
      value={{ result, isComplete: result !== null, setResult, clearResult }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  return useContext(AnalysisContext)
}
