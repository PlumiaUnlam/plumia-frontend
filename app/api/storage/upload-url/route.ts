import { NextResponse } from "next/server"

const BACKEND_URL = process.env.API_URL ?? "http://localhost:3000"

export async function POST(request: Request) {
  const headers = new Headers(request.headers)
  headers.delete("host")
  headers.set("Content-Type", "application/json")

  const body = await request.json()

  try {
    const response = await fetch(`${BACKEND_URL}/storage/presigned-upload`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    const data = response.status === 204 ? null : await response.json()

    return NextResponse.json(data, {
      status: response.status,
      statusText: response.statusText,
    })
  } catch {
    return NextResponse.json(
      { error: "Backend unavailable" },
      { status: 503 },
    )
  }
}
