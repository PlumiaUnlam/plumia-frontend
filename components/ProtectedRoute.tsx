"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Spinner } from "@/components/ui/spinner"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPlan?: "FREE" | "PRO"
}

export function ProtectedRoute({ children, requiredPlan }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requiredPlan === "PRO" && user.plan !== "PRO") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="text-2xl font-bold">Funcionalidad exclusiva</h2>
        <p className="text-muted-foreground max-w-md">
          Necesitás el plan PRO para acceder a esta sección.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
