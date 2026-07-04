"use client"

import { Header } from "../header"
import { EditorContainer } from "@/components/editor/editor-container"
import { LeftSidebar, SidebarBook } from "../left-sidebar"
import { getProjects } from "@/services/project.service";
import { SidebarProvider } from "@/components/ui/sidebar"
import { useEditorStore } from "@/stores/editor.store"
import { useState } from "react";

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

const activeChapterId = useEditorStore((s) => s.activeChapterId)

return (
  <div className="flex h-screen flex-col bg-background text-foreground">
    <Header />

    <SidebarProvider>
      <div className="flex flex-1 min-h-0">
        <LeftSidebar projectTitle={projectTitle} books={books} />

        <main className="flex flex-1 min-h-0 flex-col">
          <EditorContainer chapterId={activeChapterId ?? "ch1"} />
        </main>
      </div>
    </SidebarProvider>

    <footer className="h-8 shrink-0 border-t border-border bg-muted/50 px-5 text-[10px] text-muted-foreground flex items-center">
    </footer>
  </div>
)
}
