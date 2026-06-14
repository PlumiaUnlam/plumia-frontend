import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedRoutes = ["/editor", "/worldbuilding"]
const authRoutes = ["/login", "/register"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get("__session")?.value

  if (protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`)) && !session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`)) && session) {
    return NextResponse.redirect(new URL("/editor", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/editor/:path*", "/worldbuilding/:path*", "/login", "/register"],
}
