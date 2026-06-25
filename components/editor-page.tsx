"use client"

<<<<<<< Updated upstream
import { useEffect, useState } from "react"
import { Header } from "./header"
import { RichTextEditor } from "@/components/RichTextEditor"
import { LeftSidebar, type SidebarBook } from "./left-sidebar"
import { getProjects } from "@/services/project.service";
import { SidebarProvider } from "@/components/ui/sidebar"

export function EditorLayout() {
const [projectTitle, setProjectTitle] = useState("Proyecto")
const [books, setBooks] = useState<SidebarBook[]>([])
const [projectId, setProjectId] = useState("0")
const [projectsError, setProjectsError] = useState<string | null>(null)

useEffect(() => {
  let isMounted = true

  getProjects()
    .then((data) => {
      if (isMounted) {
        setProjectTitle(data.projectTitle)
        setBooks(data.books)
        setProjectId(data.projectId)
      }
    })
    .catch((error) => {
      console.error("Error loading projects:", error)
      if (isMounted) {
        setProjectsError("No se pudieron cargar los proyectos.")
      }
    })

  return () => {
    isMounted = false
  }
}, [])
=======
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
>>>>>>> Stashed changes

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
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />

      <SidebarProvider>
        <div className="flex flex-1 min-h-0">
          <LeftSidebar
            projectTitle={projectTitle}
            books={books}
            projectId={projectId}
            onRefresh={loadProject}
          />

          <main className="flex-1 min-h-0 overflow-y-auto p-4">
            <div className="mx-auto max-w-4xl">
              {projectsError && (
                <p className="mb-4 text-sm text-destructive">{projectsError}</p>
              )}
              <RichTextEditor
                initialContent="<p>Hola mundo</p>"
                onChange={(html) => console.log(html)}
              />
            </div>
          </main>
        </div>
      </SidebarProvider>

      <footer className="h-8 shrink-0 border-t border-border bg-muted/50 px-5 text-[10px] text-muted-foreground flex items-center">
      </footer>
    </div>
  )
}
