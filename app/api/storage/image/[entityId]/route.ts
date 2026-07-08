import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.API_URL ?? "http://localhost:3000";

type Params = {
  params: Promise<{
    entityId: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { entityId } = await params;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  if (!headers.get("authorization")) {
    const cookieStore = await cookies();
    const token = cookieStore.get("__session")?.value ?? null;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  try {
    const response = await fetch(`${BACKEND_URL}/storage/image/${entityId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") ?? "application/json",
        },
      });
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/octet-stream",
        "Cache-Control":
          response.headers.get("Cache-Control") ??
          "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
