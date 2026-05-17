import { NextResponse } from "next/server"

export const runtime = "nodejs"

const VOICE_BACKEND_URL =
  process.env.VOICE_BACKEND_URL || "http://127.0.0.1:5000"

type RouteContext = {
  params: Promise<{ path?: string[] }>
}

async function proxyVoiceRequest(request: Request, context: RouteContext) {
  const { path = [] } = await context.params
  const sourceUrl = new URL(request.url)
  const targetUrl = new URL(path.join("/"), `${VOICE_BACKEND_URL.replace(/\/+$/, "")}/`)
  targetUrl.search = sourceUrl.search

  const headers = new Headers()
  const contentType = request.headers.get("content-type")
  if (contentType) headers.set("content-type", contentType)

  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.arrayBuffer()

  let response: Response
  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    })
  } catch (error) {
    console.error("[voice-proxy] Backend request failed:", error)
    return NextResponse.json(
      { error: "Cannot reach the voice backend on port 5000." },
      { status: 502 }
    )
  }

  const responseText = await response.text()
  const responseHeaders = new Headers()
  const responseContentType = response.headers.get("content-type")
  if (responseContentType) responseHeaders.set("content-type", responseContentType)

  return new NextResponse(responseText, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxyVoiceRequest
export const POST = proxyVoiceRequest
