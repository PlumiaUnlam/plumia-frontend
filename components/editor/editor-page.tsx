"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Header } from "../header"
import { LeftSidebar, type SidebarBook } from "../left-sidebar"
import { getProject } from "@/services/project.service"
import { SidebarProvider } from "@/components/ui/sidebar"
import { EditorRightPanel } from "@/components/editor-right-panel"
import { useEditorStore } from "@/stores/editor.store"
import { EditorContainer } from "./editor-container"
import { SearchReplacePanel } from "./search-replace-panel"
import type { WritingMode } from "@/types/writing-mode"
import type { EditorSectionOption } from "./editor-types"
import type { EditorSearchMatch } from "@/types/editor-search"
import { ExportDialog } from "@/components/export/export-dialog"

type EditorLayoutProps = {
  projectId: string
}

export function EditorLayout({ projectId }: EditorLayoutProps) {
  const [projectTitle, setProjectTitle] = useState("Proyecto")
  const [books, setBooks] = useState<SidebarBook[]>([])
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [writingMode, setWritingMode] = useState<WritingMode>("review")
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false)
  const beforeExportRef = useRef<(() => Promise<void>) | null>(null)
  const activeSceneId = useEditorStore((s) => s.activeSceneId)
  const currentContent = useEditorStore((s) => s.currentContent)
  const setActiveScene = useEditorStore((s) => s.setActiveScene)
  const focusSearch = useEditorStore((s) => s.focusSearch)
  const refreshEditorDocument = useEditorStore((s) => s.refreshEditorDocument)
  const selectedSceneVersionId = useEditorStore(
    (s) => s.selectedSceneVersionId,
  )

  const registerBeforeExport = useCallback(
    (handler: (() => Promise<void>) | null) => {
      beforeExportRef.current = handler
    },
    [],
  )

  const saveBeforeExport = useCallback(async () => {
    await beforeExportRef.current?.()
  }, [])

  const handleNavigateToMatch = useCallback(
    async (match: EditorSearchMatch) => {
      await beforeExportRef.current?.()
      if (useEditorStore.getState().activeSceneId !== match.sceneId) {
        setActiveScene(match.sceneId)
      }
      focusSearch({
        sceneId: match.sceneId,
        query: match.matchedText,
        occurrence: match.occurrence,
      })
    },
    [focusSearch, setActiveScene],
  )

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

  const handleScenesUpdated = useCallback(
    async (sceneIds: string[]) => {
      if (activeSceneId && sceneIds.includes(activeSceneId)) {
        refreshEditorDocument()
      }

      try {
        await loadProject()
      } catch (error) {
        console.error("Error refreshing project after replacement:", error)
      }
    },
    [activeSceneId, loadProject, refreshEditorDocument],
  )

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

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "f"
      ) {
        event.preventDefault()
        setIsSearchPanelOpen(true)
      }
    }

    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header
        mode={writingMode}
        onModeChange={setWritingMode}
        onExportClick={() => setIsExportDialogOpen(true)}
      />

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
                onToggleZenMode={() =>
                  setWritingMode((currentMode) =>
                    currentMode === "zen" ? "creation" : "zen",
                  )
                }
                sections={sections}
                onOpenSearch={() => setIsSearchPanelOpen(true)}
                onBeforeExportChange={registerBeforeExport}
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

      <SearchReplacePanel
        open={isSearchPanelOpen}
        onOpenChange={setIsSearchPanelOpen}
        sections={sections}
        activeSceneId={activeSceneId}
        currentContent={currentContent}
        selectedSceneVersionId={selectedSceneVersionId}
        onNavigateToMatch={handleNavigateToMatch}
        onPrepareWrite={saveBeforeExport}
        onScenesUpdated={handleScenesUpdated}
      />

      <footer className="flex h-8 shrink-0 items-center border-t border-border bg-muted/50 px-5 text-[10px] text-muted-foreground">
      </footer>

      <ExportDialog
        projectId={projectId}
        open={isExportDialogOpen}
        isHistoricalVersion={Boolean(selectedSceneVersionId)}
        onOpenChange={setIsExportDialogOpen}
        onBeforeExport={saveBeforeExport}
      />
    </div>
  )
}
