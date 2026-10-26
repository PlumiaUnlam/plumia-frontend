"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"

import { ProjectHub } from "@/components/mobile/project-hub"
import { Spinner } from "@/components/ui/spinner"
import { useViewportKind } from "@/hooks/use-viewport-kind"
import { getProjectSectionHref } from "@/lib/mobile-project"

/** `/projects/:id`: hub en mobile; en escritorio abre el editor como siempre. */
export function ProjectEntry({ projectId }: Readonly<{ projectId: string }>) {
  const router = useRouter()
  const viewport = useViewportKind()

  useEffect(() => {
    if (viewport === "desktop") {
      router.replace(getProjectSectionHref(projectId, "editor"))
    }
  }, [viewport, router, projectId])

  if (viewport === "mobile") {
    return (
      <Suspense>
        <ProjectHub projectId={projectId} />
      </Suspense>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  )
}
