import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const BACKEND_URL = process.env.API_URL ?? "http://localhost:3000"
const SESSION_COOKIE = "__session"

type Params = {
  params: Promise<{ userId: string }>
}

function tokenFromCookieHeader(cookieHeader: string | null): string | null {
  const entry = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))

  return entry ? entry.slice(SESSION_COOKIE.length + 1) || null : null
}

export async function GET(request: Request, { params }: Params) {
  const { userId } = await params

  const headers = new Headers(request.headers)
  headers.delete("host")
  headers.delete("content-length")

  if (!headers.get("authorization")) {
    const token =
      tokenFromCookieHeader(request.headers.get("cookie")) ??
      (await cookies()).get(SESSION_COOKIE)?.value ??
      null

    if (token) headers.set("authorization", `Bearer ${token}`)
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/storage/profile-image/${encodeURIComponent(userId)}`,
      { headers },
    )

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/octet-stream",
        "Cache-Control": "private, no-cache",
      },
    })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}
