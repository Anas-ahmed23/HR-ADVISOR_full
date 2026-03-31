import { NextResponse } from "next/server"

/**
 * CV analysis backend URL. Override with env CV_ANALYZE_BACKEND_URL if needed.
 * Backend must be running: cd Backend && python backend_server.py
 * Test directly: curl -X POST http://127.0.0.1:5001/analyze -F "cv_file=@cv.pdf" -F "jd_file=@jd.pdf"
 */
const BACKEND_ANALYZE_URL =
  process.env.CV_ANALYZE_BACKEND_URL || "http://127.0.0.1:5001/analyze"

export async function POST(request: Request) {
  const formData = await request.formData()
  const cvFile = formData.get("cv_file") as File
  const jdFile = formData.get("jd_file") as File

  if (!cvFile || !jdFile) {
    return NextResponse.json(
      { error: "Both CV and JD are required" },
      { status: 400 }
    )
  }

  const backendForm = new FormData()
  backendForm.append("cv_file", cvFile)
  backendForm.append("jd_file", jdFile)

  console.log("[analyze_cv] Fetching backend:", BACKEND_ANALYZE_URL)

  let response: Response
  try {
    response = await fetch(BACKEND_ANALYZE_URL, {
      method: "POST",
      body: backendForm
    })
    console.log("[analyze_cv] Backend response status:", response.status, response.statusText)
  } catch (err) {
    const error = err as Error & { code?: string; cause?: unknown }
    console.error("[analyze_cv] Fetch failed:", {
      message: error?.message,
      code: error?.code,
      cause: error?.cause,
      name: error?.name
    })
    return NextResponse.json(
      {
        error:
          "Analysis service unavailable. Is the CV analysis backend running on port 5001?",
      },
      { status: 502 }
    )
  }

  const text = await response.text()
  if (!response.ok) {
    console.error("[analyze_cv] Backend returned non-OK:", response.status, "body (first 500 chars):", text.slice(0, 500))
    let message = "Analysis failed. Please try again."
    try {
      const err = text ? JSON.parse(text) : null
      if (err?.error) message = err.error
    } catch {
      // use default message
    }
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (!text?.trim()) {
    console.error("[analyze_cv] Backend returned empty body")
    return NextResponse.json(
      { error: "Analysis service returned no data. Please try again." },
      { status: 502 }
    )
  }

  let raw: { llm_analysis?: Record<string, unknown> }
  try {
    raw = JSON.parse(text)
  } catch (parseErr) {
    console.error("[analyze_cv] Invalid JSON from backend:", (parseErr as Error)?.message)
    return NextResponse.json(
      { error: "Invalid response from analysis service. Please try again." },
      { status: 502 }
    )
  }

  const llm = raw.llm_analysis || (raw as Record<string, unknown>) || {}
  console.log("[analyze_cv] Success, returning flattened analysis")

  //  FLATTEN — frontend now receives EXACTLY what it renders
  return NextResponse.json({
    final_score: (llm.final_score as number) ?? 0,
    classification: (llm.classification as string) ?? "N/A",
    matched_skills: (llm.matched_skills as unknown[]) ?? [],
    missing_skills: (llm.missing_skills as string[]) ?? [],
    skill_score: (llm.skill_score as number) ?? 0,
    experience_score: (llm.experience_score as number) ?? 0,
    education_score: (llm.education_score as number) ?? 0
  })
}
