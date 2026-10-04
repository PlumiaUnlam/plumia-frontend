"use client"

import { type ReactNode } from "react"
import { ThemeProvider } from "next-themes"

import { AuthProvider } from "@/contexts/AuthContext"

export function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="plumia-theme"
    >
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}
