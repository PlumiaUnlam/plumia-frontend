import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const BACKEND_URL = process.env.API_URL ?? "http://localhost:3000"

type Params = {
  params: Promise<{ userId: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const { userId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get("__session")?.value
  const headers = new Headers()
  if (token) headers.set("authorization", `Bearer ${token}`)

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
