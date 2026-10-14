"use client"

import { type ReactNode } from "react"
import { ThemeProvider } from "next-themes"

import { Toaster } from "@/components/ui/sonner"
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
      <Toaster position="bottom-right" />

    </ThemeProvider>
  )
}
