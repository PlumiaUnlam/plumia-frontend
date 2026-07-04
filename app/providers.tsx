"use client"

import { type ReactNode } from "react"
import { AuthProvider } from "@/contexts/AuthContext"

export function Providers({ children }: { readonly children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
