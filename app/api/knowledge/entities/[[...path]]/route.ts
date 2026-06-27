import { NextResponse } from "next/server"

const BACKEND_URL = process.env.API_URL ?? "http://localhost:3000"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params
  return proxy(request, path)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params
  return proxy(request, path)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params
  return proxy(request, path)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params
  return proxy(request, path)
}

async function proxy(request: Request, path?: string[]) {
  const pathname = path?.length ? path.join("/") : ""
  const searchParams = new URL(request.url).searchParams.toString()
  const queryString = searchParams ? `?${searchParams}` : ""
  const url = `${BACKEND_URL}/knowledge/entities/${pathname}${queryString}`

  const headers = new Headers(request.headers)
  headers.delete("host")

  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.blob()

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body,
    })

    if (response.status === 204 || response.status === 205) {
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
      })
    }

    const data = await response.json()

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
