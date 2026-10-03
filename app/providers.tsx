"use client"

import { type ReactNode } from "react"
import { ThemeProvider } from "next-themes"

import { AuthProvider } from "@/contexts/AuthContext"
import { ProjectProvider } from "@/contexts/ProjectContext"

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
        <ProjectProvider>
          {children}
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
