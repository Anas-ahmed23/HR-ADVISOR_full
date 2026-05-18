import { NextResponse } from "next/server"
import http from "node:http"
import https from "node:https"
import { Buffer } from "node:buffer"

export const runtime = "nodejs"
export const maxDuration = 1800

const BACKEND_TIMEOUT_MS = Number(process.env.CV_ANALYZE_BACKEND_TIMEOUT_MS ?? 30 * 60 * 1000)

function sanitizeBackendError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes("401") || lower.includes("access denied") || lower.includes("invalid subscription key") || lower.includes("wrong api endpoint")) {
    return "The analysis service is temporarily unavailable. Please try again later."
  }
  if (lower.includes("error code") || lower.includes("'error'") || lower.includes('"error"')) {
    return "The analysis service returned an unexpected error. Please try again."
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Analysis timed out. Please try again."
  }
  return "Analysis failed. Please try again."
}

/**
 * CV analysis backend URL. Override with env CV_ANALYZE_BACKEND_URL if needed.
 * Backend must be running: cd Backend && python backend_server.py
 * Test directly: curl -X POST http://127.0.0.1:5001/analyze -F "cv_file=@cv.pdf" -F "jd_file=@jd.pdf"
 */
const BACKEND_ANALYZE_URL =
  process.env.CV_ANALYZE_BACKEND_URL || "http://127.0.0.1:5001/analyze"

interface BackendResponse {
  status: number
  statusText: string
  text: string
}

function safeHeaderFilename(name: string) {
  return name.replace(/["\r\n]/g, "_")
}

function safeContentType(type: string) {
  return type && !/[\r\n]/.test(type) ? type : "application/octet-stream"
}

async function createMultipartBody(cvFile: File, jdFile: File) {
  const boundary = `----gradvoice-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const chunks: Buffer[] = []

  const appendFile = async (fieldName: string, file: File) => {
    chunks.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${safeHeaderFilename(file.name)}"\r\n` +
      `Content-Type: ${safeContentType(file.type)}\r\n\r\n`
    ))
    chunks.push(Buffer.from(await file.arrayBuffer()))
    chunks.push(Buffer.from("\r\n"))
  }

  await appendFile("cv_file", cvFile)
  await appendFile("jd_file", jdFile)
  chunks.push(Buffer.from(`--${boundary}--\r\n`))

  return {
    body: Buffer.concat(chunks),
    boundary,
  }
}

async function postToAnalysisBackend(cvFile: File, jdFile: File): Promise<BackendResponse> {
  const target = new URL(BACKEND_ANALYZE_URL)
  const { body, boundary } = await createMultipartBody(cvFile, jdFile)
  const transport = target.protocol === "https:" ? https : http

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
      },
      res => {
        const responseChunks: Buffer[] = []

        res.on("data", chunk => {
          responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })

        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? "",
            text: Buffer.concat(responseChunks).toString("utf8"),
          })
        })
      }
    )

    req.on("error", reject)
    req.setTimeout(BACKEND_TIMEOUT_MS, () => {
      req.destroy(new Error(`Backend analysis request timed out after ${Math.round(BACKEND_TIMEOUT_MS / 60000)} minutes`))
    })
    req.write(body)
    req.end()
  })
}

function backendConnectionErrorMessage(err: unknown) {
  const error = err as Error & { code?: string; cause?: unknown }
  const cause = error?.cause as (Error & { code?: string }) | undefined
  const code = error?.code ?? cause?.code ?? ""
  const message = `${error?.message ?? ""} ${cause?.message ?? ""}`.toLowerCase()

  if (code.includes("TIMEOUT") || message.includes("timeout") || message.includes("timed out")) {
    return "Analysis is taking longer than expected. Please try a smaller batch or fewer CVs at once."
  }

  return "Analysis service unavailable. Is the CV analysis backend running on port 5001?"
}

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

  console.log("[analyze_cv] Fetching backend:", BACKEND_ANALYZE_URL)

  let response: BackendResponse
  try {
    response = await postToAnalysisBackend(cvFile, jdFile)
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
      { error: backendConnectionErrorMessage(err) },
      { status: 502 }
    )
  }

  const text = response.text
  if (response.status < 200 || response.status >= 300) {
    console.error("[analyze_cv] Backend returned non-OK:", response.status, "body (first 500 chars):", text.slice(0, 500))
    let rawMessage = ""
    try {
      const err = text ? JSON.parse(text) : null
      if (err?.error) rawMessage = String(err.error)
    } catch {
      // use default
    }
    if (response.status >= 400 && response.status < 500 && rawMessage) {
      return NextResponse.json({ error: rawMessage }, { status: response.status })
    }
    return NextResponse.json({ error: sanitizeBackendError(rawMessage) }, { status: 502 })
  }

  if (!text?.trim()) {
    console.error("[analyze_cv] Backend returned empty body")
    return NextResponse.json(
      { error: "Analysis service returned no data. Please try again." },
      { status: 502 }
    )
  }

  let raw: {
    batch?: boolean
    llm_analysis?: Record<string, unknown>
    results?: unknown[]
  }
  try {
    raw = JSON.parse(text)
  } catch (parseErr) {
    console.error("[analyze_cv] Invalid JSON from backend:", (parseErr as Error)?.message)
    return NextResponse.json(
      { error: "Invalid response from analysis service. Please try again." },
      { status: 502 }
    )
  }

  // Pass the full llm_analysis object — ATSDashboard reads nested fields
  // like evaluation_result.final_score, score_breakdown.skill_score, etc.
  if (raw.batch) {
    console.log("[analyze_cv] Success, returning batch analysis wrapper")
    return NextResponse.json(raw)
  }

  const llm = raw.llm_analysis ?? raw
  console.log("[analyze_cv] Success, returning full llm_analysis")

  return NextResponse.json(llm)
}
