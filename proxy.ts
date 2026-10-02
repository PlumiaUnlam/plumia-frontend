import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedRoutes = ["/dashboard", "/editor", "/worldbuilding", "/projects"]
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
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/editor/:path*",
    "/worldbuilding/:path*",
    "/projects/:path*",
    "/login",
    "/register",
  ],
}
