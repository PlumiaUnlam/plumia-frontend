"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "../header"
import { LeftSidebar, type SidebarBook } from "../left-sidebar"
import { getProject } from "@/services/project.service"
import { SidebarProvider } from "@/components/ui/sidebar"
import { EditorRightPanel } from "@/components/editor-right-panel"
import { useEditorStore } from "@/stores/editor.store"
import { EditorContainer } from "./editor-container"

type EditorLayoutProps = {
  projectId: string
}

export function EditorLayout({ projectId }: EditorLayoutProps) {
  const [projectTitle, setProjectTitle] = useState("Proyecto")
  const [books, setBooks] = useState<SidebarBook[]>([])
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const activeSceneId = useEditorStore((s) => s.activeSceneId)

  const activeChapter = books
    .flatMap((book) => book.chapters)
    .find((chapter) => chapter.scenes.some((s) => s.id === activeSceneId))
  const activeScene = activeChapter?.scenes.find((s) => s.id === activeSceneId)
  const chapterTitle = activeChapter?.title ?? ""
  const sceneTitle = activeScene?.title

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setProjectsError("No se selecciono un proyecto.")
      return
    }

    const data = await getProject(projectId)

    setProjectTitle(data.projectTitle)
    setBooks(data.books)
    setProjectsError(null)
  }, [projectId])

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
            {activeSceneId && (
              <EditorContainer
                sceneId={activeSceneId}
                chapterTitle={chapterTitle}
                sceneTitle={sceneTitle}
              />
            )}
          </main>

          <EditorRightPanel projectId={projectId} />
        </div>
      </SidebarProvider>

      <footer className="flex h-8 shrink-0 items-center border-t border-border bg-muted/50 px-5 text-[10px] text-muted-foreground">
      </footer>
    </div>
  )
}
