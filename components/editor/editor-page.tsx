"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Header } from "../header"
import { LeftSidebar, type SidebarBook } from "../left-sidebar"
import { getProject } from "@/services/project.service"
import { SidebarProvider } from "@/components/ui/sidebar"
import { EditorRightPanel } from "@/components/editor-right-panel"
import {
  getLivePrimaryContent,
  useEditorStore,
} from "@/stores/editor.store"
import { EditorContainer } from "./editor-container"
import { SaveStatusIndicator } from "./save-status-indicator"
import type { WritingMode } from "@/types/writing-mode"
import type { EditorSectionOption } from "./editor-types"
import type { EditorSearchMatch, SpellcheckLanguage } from "@/types/editor-search"
import type { ProseMirrorJSON } from "@/types/scene"

const SearchReplacePanel = dynamic(() =>
  import("./search-replace-panel").then((module) => module.SearchReplacePanel),
)
const SpellcheckSettingsDialog = dynamic(() =>
  import("./spellcheck-settings-dialog").then(
    (module) => module.SpellcheckSettingsDialog,
  ),
)
const ExportDialog = dynamic(() =>
  import("@/components/export/export-dialog").then(
    (module) => module.ExportDialog,
  ),
)
const ShareDialog = dynamic(() =>
  import("@/components/sharing/share-dialog").then(
    (module) => module.ShareDialog,
  ),
)

const blockTypes = new Set([
  "doc",
  "bulletList",
  "blockquote",
  "listItem",
  "orderedList",
  "tableCell",
  "tableHeader",
])

function getWordCount(content: ProseMirrorJSON | null) {
  if (!content) return 0

  const collectText = (node: ProseMirrorJSON): string => {
    if (node.type === "text") return node.text ?? ""
    if (node.type === "hardBreak") return "\n"

    const childText = (node.content ?? []).map(collectText)
    return childText.join(blockTypes.has(node.type ?? "") ? "\n" : "")
  }

  const text = collectText(content).trim()
  return text ? text.split(/\s+/).length : 0
}

function getActiveSceneDetails(books: SidebarBook[], activeSceneId: string | null) {
  if (!activeSceneId) return null

  for (const book of books) {
    for (const chapter of book.chapters) {
      const scene = chapter.scenes.find((item) => item.id === activeSceneId)
      if (!scene) continue

      return {
        bookTitle: book.title,
        chapterTitle: chapter.title,
        sceneTitle: scene.title,
        sceneWordCount: scene.wordCount ?? 0,
        chapterWordCount:
          chapter.wordCount ??
          chapter.scenes.reduce(
            (total, chapterScene) => total + (chapterScene.wordCount ?? 0),
            0,
          ),
      }
    }
  }

  return null
}

type EditorLayoutProps = {
  projectId: string
}

export function EditorLayout({ projectId }: Readonly<EditorLayoutProps>) {
  const [projectTitle, setProjectTitle] = useState("Proyecto")
  const [books, setBooks] = useState<SidebarBook[]>([])
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [writingMode, setWritingMode] = useState<WritingMode>("review")
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false)
  const [isSpellcheckSettingsOpen, setIsSpellcheckSettingsOpen] = useState(false)
  const [draftSpellcheckLanguage, setDraftSpellcheckLanguage] =
    useState<SpellcheckLanguage>("es-AR")
  const beforeExportRef = useRef<(() => Promise<void>) | null>(null)
  const activeSceneId = useEditorStore((s) => s.activeSceneId)
  const currentContent = useEditorStore((s) => s.currentContent)
  const setActiveScene = useEditorStore((s) => s.setActiveScene)
  const focusSearch = useEditorStore((s) => s.focusSearch)
  const clearSearchFocus = useEditorStore((s) => s.clearSearchFocus)
  const setSearchQuery = useEditorStore((s) => s.setSearchQuery)
  const setSpellcheckLanguage = useEditorStore((s) => s.setSpellcheckLanguage)
  const refreshEditorDocument = useEditorStore((s) => s.refreshEditorDocument)
  const selectedSceneVersionId = useEditorStore(
    (s) => s.selectedSceneVersionId,
  )
  const editorVersionLabel = useEditorStore((s) => s.editorVersionLabel)

  const activeSceneDetails = getActiveSceneDetails(books, activeSceneId)
  const currentSceneWordCount = currentContent
    ? getWordCount(currentContent)
    : (activeSceneDetails?.sceneWordCount ?? 0)
  const statusWordCount = activeSceneDetails
    ? Math.max(
        0,
        activeSceneDetails.chapterWordCount -
          activeSceneDetails.sceneWordCount +
          currentSceneWordCount,
      )
    : currentSceneWordCount

  const registerBeforeExport = useCallback(
    (handler: (() => Promise<void>) | null) => {
      beforeExportRef.current = handler
    },
    [],
  )

  const saveBeforeExport = useCallback(async () => {
    await beforeExportRef.current?.()
  }, [])

  const handleOpenSpellcheckSettings = useCallback(() => {
    setDraftSpellcheckLanguage(useEditorStore.getState().spellcheckLanguage)
    setIsSpellcheckSettingsOpen(true)
  }, [])

  const handleSaveSpellcheckSettings = useCallback(() => {
    setSpellcheckLanguage(draftSpellcheckLanguage)
    window.localStorage.setItem(
      "plumia:spellcheck-language",
      draftSpellcheckLanguage,
    )
    setIsSpellcheckSettingsOpen(false)
  }, [draftSpellcheckLanguage, setSpellcheckLanguage])

  const handleSearchPanelChange = useCallback(
    (open: boolean) => {
      setIsSearchPanelOpen(open)
      if (!open) {
        setSearchQuery("")
        clearSearchFocus()
      }
    },
    [clearSearchFocus, setSearchQuery],
  )

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

  const exportBooks = useMemo(
    () => books.map(({ id, title }) => ({ id, title })),
    [books],
  )

  const activeBookId = useMemo(
    () =>
      books.find((book) =>
        book.chapters.some((chapter) =>
          chapter.scenes.some((scene) => scene.id === activeSceneId),
        ),
      )?.id ?? null,
    [activeSceneId, books],
  )

  const defaultExportBookId = activeBookId ?? books[0]?.id ?? null

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

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(
      "plumia:spellcheck-language",
    )

    if (storedLanguage === "es-AR" || storedLanguage === "en-US") {
      setSpellcheckLanguage(storedLanguage)
    }
  }, [setSpellcheckLanguage])

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header
        mode={writingMode}
        onModeChange={setWritingMode}
        onShareClick={() => setIsShareDialogOpen(true)}
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
              onBeforeDocumentChange={saveBeforeExport}
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
                onOpenSpellcheckSettings={handleOpenSpellcheckSettings}
                onExportClick={() => setIsExportDialogOpen(true)}
                onBeforeExportChange={registerBeforeExport}
              />
            )}
          </main>

          {isSearchPanelOpen ? (
            <SearchReplacePanel
              open
              onOpenChange={handleSearchPanelChange}
              sections={sections}
              activeSceneId={activeSceneId}
              currentContent={getLivePrimaryContent() ?? currentContent}
              selectedSceneVersionId={selectedSceneVersionId}
              onNavigateToMatch={handleNavigateToMatch}
              onPrepareWrite={saveBeforeExport}
              onScenesUpdated={handleScenesUpdated}
            />
          ) : null}

          {writingMode !== "zen" && (
            <EditorRightPanel
              projectId={projectId}
              mode={writingMode}
            />
          )}
        </div>
      </SidebarProvider>

      <footer className="flex h-8 shrink-0 items-center justify-between gap-3 border-t border-[#e8dff0] bg-[#f6f0fa] px-3 text-[11px] text-[#725b85] dark:border-border dark:bg-background dark:text-muted-foreground sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span
            className="min-w-0 truncate"
            title={
              activeSceneDetails
                ? `${activeSceneDetails.bookTitle} · ${activeSceneDetails.chapterTitle} · ${activeSceneDetails.sceneTitle}`
                : undefined
            }
          >
            {activeSceneDetails?.chapterTitle ?? "Seleccioná una escena"}
          </span>
          {activeSceneId && (
            <span className="shrink-0">
              · {new Intl.NumberFormat("es-AR").format(statusWordCount)} palabras
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <span
            className="max-w-[24vw] truncate text-[#76558e] dark:text-muted-foreground"
            title={editorVersionLabel}
          >
            {editorVersionLabel}
          </span>
          <SaveStatusIndicator
            paneId="primary"
            className="min-h-0 text-[11px]"
          />
        </div>
      </footer>

      {isExportDialogOpen ? (
        <ExportDialog
          projectId={projectId}
          books={exportBooks}
          defaultBookId={defaultExportBookId}
          open
          isHistoricalVersion={Boolean(selectedSceneVersionId)}
          onOpenChange={setIsExportDialogOpen}
          onBeforeExport={saveBeforeExport}
        />
      ) : null}

      {isShareDialogOpen ? (
        <ShareDialog
          books={books}
          activeBookId={activeBookId}
          open
          onOpenChange={setIsShareDialogOpen}
          onBeforeShare={saveBeforeExport}
        />
      ) : null}

      {isSpellcheckSettingsOpen ? (
        <SpellcheckSettingsDialog
          open
          language={draftSpellcheckLanguage}
          onLanguageChange={setDraftSpellcheckLanguage}
          onOpenChange={setIsSpellcheckSettingsOpen}
          onSave={handleSaveSpellcheckSettings}
        />
      ) : null}

    </div>
  )
}
