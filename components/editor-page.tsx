"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "./header"
import { RichTextEditor } from "@/components/RichTextEditor"
import { LeftSidebar, type SidebarBook } from "./left-sidebar"
import { getProject } from "@/services/project.service"
import { SidebarProvider } from "@/components/ui/sidebar"

export function EditorLayout() {
  const [projectTitle, setProjectTitle] = useState("Proyecto")
  const [books, setBooks] = useState<SidebarBook[]>([])
  const [projectId, setProjectId] = useState("0")
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const selectedProjectId = searchParams.get("projectId")

  const loadProject = useCallback(async () => {
    if (!selectedProjectId) {
      setProjectsError("No se selecciono un proyecto.")
      return
    }

    const data = await getProject(selectedProjectId)

    setProjectTitle(data.projectTitle)
    setBooks(data.books)
    setProjectId(data.projectId)
    setProjectsError(null)
  }, [selectedProjectId])

  useEffect(() => {
    let isMounted = true

    void Promise.resolve()
      .then(() => loadProject())
      .catch((error) => {
        console.error("Error loading projects:", error)
        if (isMounted) {
          setProjectsError("No se pudieron cargar los proyectos.")
        }
      })

    return () => {
      isMounted = false
    }
  }, [loadProject])

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header />

      <SidebarProvider className="flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <LeftSidebar
            projectTitle={projectTitle}
            books={books}
            projectId={projectId}
            onRefresh={loadProject}
          />

          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {projectsError && (
              <p className="mb-4 text-sm text-destructive">{projectsError}</p>
            )}
            <RichTextEditor
              initialContent="<p>Hola mundo</p>"
              onChange={(html) => console.log(html)}
            />
          </main>
        </div>
      </SidebarProvider>

      <footer className="flex h-8 shrink-0 items-center border-t border-border bg-muted/50 px-5 text-[10px] text-muted-foreground">
      </footer>
    </div>
  )
}
