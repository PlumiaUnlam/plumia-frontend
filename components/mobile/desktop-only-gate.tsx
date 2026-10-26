"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { Spinner } from "@/components/ui/spinner"
import { useViewportKind } from "@/hooks/use-viewport-kind"
import { getDesktopOnlyHref } from "@/lib/mobile-project"

type DesktopOnlyGateProps = {
  projectId: string
  featureId: string
  children: ReactNode
}

/**
 * Renderiza `children` solo en escritorio. En mobile redirige al hub del
 * proyecto con el aviso abierto, sin montar la pantalla pesada.
 */
export function DesktopOnlyGate({
  projectId,
  featureId,
  children,
}: Readonly<DesktopOnlyGateProps>) {
  const router = useRouter()
  const viewport = useViewportKind()

  useEffect(() => {
    if (viewport === "mobile") {
      router.replace(getDesktopOnlyHref(projectId, featureId))
    }
  }, [viewport, router, projectId, featureId])

  if (viewport === "desktop") return children

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  )
}
