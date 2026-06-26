"use client"

import { type ReactNode } from "react"
import { AuthProvider } from "@/contexts/AuthContext"
import { ProjectProvider } from "@/contexts/ProjectContext"

export function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <AuthProvider>
      <ProjectProvider>
        {children}
      </ProjectProvider>
    </AuthProvider>
  )
}
