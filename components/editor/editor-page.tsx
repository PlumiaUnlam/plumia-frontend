"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Header } from "../header"
import { LeftSidebar, type SidebarBook } from "../left-sidebar"
import { getProject } from "@/services/project.service"
import { SidebarProvider } from "@/components/ui/sidebar"
import { EditorRightPanel } from "@/components/editor-right-panel"
import { useEditorStore } from "@/stores/editor.store"
import { EditorContainer } from "./editor-container"
import type { WritingMode } from "@/types/writing-mode"
import type { EditorSectionOption } from "./editor-types"

type EditorLayoutProps = {
  projectId: string
}

export function EditorLayout({ projectId }: EditorLayoutProps) {
  const [projectTitle, setProjectTitle] = useState("Proyecto")
  const [books, setBooks] = useState<SidebarBook[]>([])
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [writingMode, setWritingMode] = useState<WritingMode>("review")
  const activeSceneId = useEditorStore((s) => s.activeSceneId)

  const sections = useMemo<EditorSectionOption[]>(
    () =>
      books.flatMap((book) =>
        book.chapters.flatMap((chapter) =>
          chapter.scenes.map((scene) => ({
            id: scene.id,
            title: scene.title,
            chapterTitle: chapter.title,
            bookTitle: book.title,
          })),
        ),
      ),
    [books],
  )

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
      <Header mode={writingMode} onModeChange={setWritingMode} />

      <SidebarProvider className="flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {writingMode !== "zen" && (
            <LeftSidebar
              projectTitle={projectTitle}
              books={books}
              projectId={projectId}
              onRefresh={loadProject}
            />
          )}

          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {projectsError && (
              <p className="mb-4 text-sm text-destructive">{projectsError}</p>
            )}
            {activeSceneId && (
              <EditorContainer
                sceneId={activeSceneId}
                projectId={projectId}
                isZenMode={writingMode === "zen"}
                sections={sections}
              />
            )}
          </main>

          {writingMode !== "zen" && (
            <EditorRightPanel
              projectId={projectId}
              mode={writingMode}
            />
          )}
        </div>
      </SidebarProvider>

      <footer className="flex h-8 shrink-0 items-center border-t border-border bg-muted/50 px-5 text-[10px] text-muted-foreground">
      </footer>
    </div>
  )
}
