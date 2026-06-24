"use client"

import { useEffect, useState } from "react"
import { Header } from "./header"
import { RichTextEditor } from "@/components/RichTextEditor"
import { LeftSidebar, type SidebarBook } from "./left-sidebar"
import { getProjects } from "@/services/project.service";
import { SidebarProvider } from "@/components/ui/sidebar"

export function EditorLayout() {
const [projectTitle, setProjectTitle] = useState("Proyecto")
const [books, setBooks] = useState<SidebarBook[]>([])
const [projectsError, setProjectsError] = useState<string | null>(null)

useEffect(() => {
  let isMounted = true

  getProjects()
    .then((data) => {
      if (isMounted) {
        setProjectTitle(data.projectTitle)
        setBooks(data.books)
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

return (
  <div className="flex h-screen flex-col bg-background text-foreground">
    <Header />

    <SidebarProvider>
      <div className="flex flex-1 min-h-0">
        <LeftSidebar projectTitle={projectTitle} books={books} />

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
