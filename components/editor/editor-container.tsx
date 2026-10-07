
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"

import {
  getScene,
  resolveSceneContentImages,
  getSceneVersion,
  getSceneVersions,
} from "@/services/scene.service"
import {
  setLivePrimaryContent,
  setLivePrimaryContentReader,
  useEditorStore,
} from "@/stores/editor.store"
import type {
  SceneDocument,
  SceneVersionDocument,
  SceneVersionSummary,
} from "@/types/scene"
import {
  useAutosave,
  type SavedSceneResult,
} from "@/hooks/use-autosave"
import { requestKnowledgeRefresh } from "@/hooks/use-knowledge-refresh"
import { requireSuccessfulSave } from "@/lib/editor-save-protection"
import { registerEditorSaveShortcut } from "@/lib/editor-save-shortcut"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EditorMenuBar } from "./editor-menu-bar"
import { EditorToolbar } from "./toolbar"
import { EditorParagraphFormatDialog } from "./paragraph-format-dialog"
import { RichTextEditor } from "./RichTextEditor"
import { AnalysisToast } from "./analysis/analysis-toast"
import { EditorZoomProvider } from "./editor-zoom"
import type {
  EditorPaneId,
  EditorSectionOption,
  EditorToolbarActions,
} from "./editor-types"

type SceneEditorProps = {
  sceneId: string
  document: SceneDocument | SceneVersionDocument
  chapterTitle: string
  sceneTitle?: string
  selectedVersionId: string | null
  projectId: string
  isZenMode: boolean
  onToggleZenMode: () => void
  onOpenSearch?: () => void
  onOpenSpellcheckSettings?: () => void
  onExportClick?: () => void
  paneId: EditorPaneId
  showToolbar: boolean
  onEditorFocus?: () => void
  onToolbarActionsChange?: (
    actions: EditorToolbarActions | null,
  ) => void
  onToggleSplit?: () => void
  isSplit?: boolean
  canSplit?: boolean
}

function getEditorVersionLabel(
  document: SceneDocument | SceneVersionDocument,
  selectedVersionId: string | null,
) {
  if (selectedVersionId === null) return "Borrador principal"
  if ("label" in document && document.label) return document.label
  return "Version sin titulo"
}

function SceneEditor({
  sceneId,
  document,
  chapterTitle,
  sceneTitle,
  selectedVersionId,
  projectId,
  isZenMode,
  onToggleZenMode,
  onOpenSearch,
  onOpenSpellcheckSettings,
  onExportClick,
  paneId,
  showToolbar,
  onEditorFocus,
  onToolbarActionsChange,
  onToggleSplit,
  isSplit,
  canSplit,
}: Readonly<SceneEditorProps>) {
  const setCurrentContent = useEditorStore((s) => s.setCurrentContent)
  const setEditorVersionLabel = useEditorStore((s) => s.setEditorVersionLabel)
  const saveStatus = useEditorStore(
    (s) => s.saveStatusByPane[paneId],
  )
  const versionLabel = getEditorVersionLabel(document, selectedVersionId)
  const contentPublishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const latestEditorRef = useRef<Editor | null>(null)
  const [analysisFeedback, setAnalysisFeedback] = useState<{
    message: string
    tone: "default" | "success"
  } | null>(null)

  const handleSaveComplete = useCallback(
    (result: SavedSceneResult) => {
      if (selectedVersionId === null && result.contentChanged) {
        requestKnowledgeRefresh(projectId)
      }
    },
    [projectId, selectedVersionId],
  )

  const { queueSave, saveNow } = useAutosave({
    sceneId,
    versionId: selectedVersionId,
    paneId,
    initialContent: document.content,
    onSaveComplete: handleSaveComplete,
  })

  const handleAnalyzeChanges = useCallback(() => {
    void saveNow().then((outcome) => {
      if (outcome.status === "failed") return

      if (outcome.status === "saved" && outcome.result.contentChanged) {
        setAnalysisFeedback({
          message:
            "Cambios guardados; el analisis se ejecutara en segundo plano",
          tone: "success",
        })
        return
      }

      setAnalysisFeedback({
        message: "No hay cambios nuevos para analizar",
        tone: "default",
      })
    })
  }, [saveNow])

  const handleContentChange = useCallback((nextEditor: Editor) => {
    latestEditorRef.current = nextEditor
    queueSave(() => nextEditor.getJSON())

    if (paneId !== "primary") return

    setLivePrimaryContentReader(() => nextEditor.getJSON())
    if (contentPublishTimerRef.current) return
    contentPublishTimerRef.current = setTimeout(() => {
      contentPublishTimerRef.current = null
      const nextContent = latestEditorRef.current?.getJSON()
      if (!nextContent) return
      setLivePrimaryContent(nextContent)
      setCurrentContent(nextContent)
    }, 250)
  }, [paneId, queueSave, setCurrentContent])

  const dismissAnalysisFeedback = useCallback(() => {
    setAnalysisFeedback(null)
  }, [])

  useEffect(() => {
    if (paneId === "primary") {
      latestEditorRef.current = null
      setLivePrimaryContent(document.content)
      setCurrentContent(document.content)
    }
    return () => {
      if (contentPublishTimerRef.current) {
        clearTimeout(contentPublishTimerRef.current)
      }
    }
  }, [document.content, paneId, setCurrentContent])

  useEffect(() => {
    if (paneId === "primary") {
      setEditorVersionLabel(versionLabel)
    }
  }, [paneId, setEditorVersionLabel, versionLabel])

  return (
    <>
      <AnalysisToast
        feedback={analysisFeedback}
        onDismiss={dismissAnalysisFeedback}
      />
      <RichTextEditor
        title={chapterTitle}
        subtitle={sceneTitle}
        sceneId={sceneId}
        projectId={projectId}
        content={document.content}
        onChange={handleContentChange}
        onSave={() => void saveNow()}
        onAnalyzeChanges={
          selectedVersionId === null ? handleAnalyzeChanges : undefined
        }
        isAnalysisSaving={saveStatus === "saving"}
        isZenMode={isZenMode}
        onToggleZenMode={onToggleZenMode}
        onOpenSearch={onOpenSearch}
        onOpenSpellcheckSettings={onOpenSpellcheckSettings}
        onExportClick={onExportClick}
        saveNow={saveNow}
        showToolbar={showToolbar}
        onEditorFocus={onEditorFocus}
        onToolbarActionsChange={onToolbarActionsChange}
        onToggleSplit={onToggleSplit}
        isSplit={isSplit}
        canSplit={canSplit}
        allowAnnotations={selectedVersionId === null && !isZenMode}
      />
    </>
  )
}

function SceneDocumentLoader({
  sceneId,
  selectedVersionId,
  projectId,
  paneId,
  chapterTitle,
  sceneTitle,
  isZenMode,
  onToggleZenMode,
  onOpenSearch,
  onOpenSpellcheckSettings,
  onExportClick,
  showToolbar,
  onEditorFocus,
  onToolbarActionsChange,
  onToggleSplit,
  isSplit,
  canSplit,
}: Readonly<{
  sceneId: string
  selectedVersionId: string | null
  projectId: string
  paneId: EditorPaneId
  chapterTitle: string
  sceneTitle?: string
  isZenMode: boolean
  onToggleZenMode: () => void
  onOpenSearch?: () => void
  onOpenSpellcheckSettings?: () => void
  onExportClick?: () => void
  showToolbar: boolean
  onEditorFocus?: () => void
  onToolbarActionsChange?: (
    actions: EditorToolbarActions | null,
  ) => void
  onToggleSplit?: () => void
  isSplit?: boolean
  canSplit?: boolean
}>) {
  const documentReloadToken = useEditorStore((s) => s.documentReloadToken)
  const [document, setDocument] = useState<
    SceneDocument | SceneVersionDocument | null
  >(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    void (async () => {
      setDocument(null)
      const request = selectedVersionId
        ? getSceneVersion(sceneId, selectedVersionId, {
            signal: controller.signal,
          })
        : getScene(sceneId, { signal: controller.signal })

      try {
        const loadedDocument = await request
        const resolvedContent = await resolveSceneContentImages(
          loadedDocument.content,
          { signal: controller.signal },
        )

        if (!cancelled && !controller.signal.aborted) {
          setDocument({
            ...loadedDocument,
            content: resolvedContent,
          })
        }
      } catch (error) {
        if (!cancelled && !isAbortError(error)) {
          console.error("Error loading scene:", error)
        }
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [sceneId, selectedVersionId, documentReloadToken])

  const loaded =
    document &&
    (selectedVersionId
      ? document.id === selectedVersionId
      : document.id === sceneId)

  if (!loaded) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground">
        Cargando escena…
      </div>
    )
  }

  return (
    <SceneEditor
      key={`${paneId}:${sceneId}:${selectedVersionId ?? "main"}`}
      sceneId={sceneId}
      document={document}
      chapterTitle={chapterTitle}
      sceneTitle={sceneTitle}
      selectedVersionId={selectedVersionId}
      projectId={projectId}
      isZenMode={isZenMode}
      onToggleZenMode={onToggleZenMode}
      onOpenSearch={onOpenSearch}
      onOpenSpellcheckSettings={onOpenSpellcheckSettings}
      onExportClick={onExportClick}
      paneId={paneId}
      showToolbar={showToolbar}
      onEditorFocus={onEditorFocus}
      onToolbarActionsChange={onToolbarActionsChange}
      onToggleSplit={onToggleSplit}
      isSplit={isSplit}
      canSplit={canSplit}
    />
  )
}

const DRAFT_VERSION_VALUE = "draft"

function getVersionOptionLabel(version: SceneVersionSummary) {
  return version.label || "Versión sin título"
}

function PanelSelectors({
  sceneId,
  selectedVersionId,
  sections,
  label,
  versions,
  versionsLoading,
  versionsError,
  onSceneChange,
  onVersionChange,
  disabled,
}: Readonly<{
  sceneId: string
  selectedVersionId: string | null
  sections: EditorSectionOption[]
  label: string
  versions: SceneVersionSummary[]
  versionsLoading: boolean
  versionsError: string | null
  onSceneChange: (sceneId: string) => void
  onVersionChange: (versionId: string | null) => void
  disabled: boolean
}>) {
  const groups = useMemo(() => {
    const grouped = new Map<
      string,
      { bookTitle: string; chapterTitle: string; sections: EditorSectionOption[] }
    >()

    for (const section of sections) {
      const key = `${section.bookTitle}\u0000${section.chapterTitle}`
      const group = grouped.get(key)
      if (group) {
        group.sections.push(section)
      } else {
        grouped.set(key, {
          bookTitle: section.bookTitle,
          chapterTitle: section.chapterTitle,
          sections: [section],
        })
      }
    }

    return [...grouped.values()]
  }, [sections])

  const selectorId = label.replaceAll(" ", "-").toLowerCase()

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2">
      <span className="shrink-0 text-xs font-semibold text-foreground">
        {label}
      </span>
      <div className="flex min-w-40 flex-1 items-center gap-2">
        <label
          htmlFor={`editor-section-${selectorId}`}
          className="sr-only"
        >
          Sección de {label.toLowerCase()}
        </label>
        <Select
          value={sceneId}
          disabled={disabled}
          onValueChange={onSceneChange}
        >
          <SelectTrigger
            id={`editor-section-${selectorId}`}
            aria-label={`Seleccionar sección de ${label.toLowerCase()}`}
            size="sm"
            className="min-w-0 flex-1 text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {groups.map((group) => (
              <SelectGroup
                key={`${group.bookTitle}\u0000${group.chapterTitle}`}
              >
                <SelectLabel>
                  {group.bookTitle} · {group.chapterTitle}
                </SelectLabel>
                {group.sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-40 flex-1 items-center gap-2">
        <label
          htmlFor={`editor-version-${selectorId}`}
          className="shrink-0 text-xs text-muted-foreground"
        >
          Versión
        </label>
        <Select
          value={selectedVersionId ?? DRAFT_VERSION_VALUE}
          disabled={disabled || versionsLoading}
          onValueChange={(value) =>
            onVersionChange(value === DRAFT_VERSION_VALUE ? null : value)
          }
        >
          <SelectTrigger
            id={`editor-version-${selectorId}`}
            aria-label={`Seleccionar versión de ${label.toLowerCase()}`}
            size="sm"
            className="min-w-0 flex-1 text-xs"
            title={versionsError ?? undefined}
          >
            <SelectValue
              placeholder={versionsLoading ? "Cargando versiones…" : undefined}
            />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value={DRAFT_VERSION_VALUE}>
              Borrador principal
            </SelectItem>
            {versions.map((version) => (
              <SelectItem key={version.id} value={version.id}>
                {getVersionOptionLabel(version)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function EditorPanel({
  sceneId,
  section,
  selectedVersionId,
  projectId,
  paneId,
  isZenMode,
  onToggleZenMode,
  onOpenSearch,
  onOpenSpellcheckSettings,
  onExportClick,
  showToolbar,
  onEditorFocus,
  onToolbarActionsChange,
  onToggleSplit,
  isSplit,
  canSplit,
}: Readonly<{
  sceneId: string
  section: EditorSectionOption
  selectedVersionId: string | null
  projectId: string
  paneId: EditorPaneId
  isZenMode: boolean
  onToggleZenMode: () => void
  onOpenSearch?: () => void
  onOpenSpellcheckSettings?: () => void
  onExportClick?: () => void
  showToolbar: boolean
  onEditorFocus?: () => void
  onToolbarActionsChange?: (
    actions: EditorToolbarActions | null,
  ) => void
  onToggleSplit?: () => void
  isSplit?: boolean
  canSplit?: boolean
}>) {
  return (
    <SceneDocumentLoader
      sceneId={sceneId}
      selectedVersionId={selectedVersionId}
      projectId={projectId}
      paneId={paneId}
      chapterTitle={section.chapterTitle}
      sceneTitle={section.title}
      isZenMode={isZenMode}
      onToggleZenMode={onToggleZenMode}
      onOpenSearch={onOpenSearch}
      onOpenSpellcheckSettings={onOpenSpellcheckSettings}
      onExportClick={onExportClick}
      showToolbar={showToolbar}
      onEditorFocus={onEditorFocus}
      onToolbarActionsChange={onToolbarActionsChange}
      onToggleSplit={onToggleSplit}
      isSplit={isSplit}
      canSplit={canSplit}
    />
  )
}

type SceneVersionList = {
  versions: SceneVersionSummary[]
  loading: boolean
  error: string | null
}

const EMPTY_SCENE_VERSION_LIST: SceneVersionList = {
  versions: [],
  loading: false,
  error: null,
}

function useSceneVersionList(
  sceneId: string | null,
  refreshKey: string | number,
): SceneVersionList {
  const [state, setState] = useState<SceneVersionList & {
    sceneId: string | null
  }>({
    sceneId: null,
    versions: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    if (!sceneId) {
      return () => {
        cancelled = true
      }
    }

    void getSceneVersions(sceneId)
      .then((versions) => {
        if (!cancelled) {
          setState({ sceneId, versions, loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        console.error("Error loading scene versions:", error)
        setState({
          sceneId,
          versions: [],
          loading: false,
          error: "No se pudieron cargar las versiones.",
        })
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey, sceneId])

  if (!sceneId) return EMPTY_SCENE_VERSION_LIST
  if (state.sceneId !== sceneId) {
    return { versions: [], loading: true, error: null }
  }
  return state
}

function getAlternativeVersionId(
  selectedVersionId: string | null,
  versions: SceneVersionSummary[],
) {
  return selectedVersionId === null ? (versions[0]?.id ?? null) : null
}

function getFallbackSecondarySceneId(
  sceneId: string,
  sections: EditorSectionOption[],
  versions: SceneVersionSummary[],
) {
  const otherScene = sections.find((section) => section.id !== sceneId)
  if (otherScene) return otherScene.id
  return versions.length > 0 ? sceneId : null
}

function getActiveSecondarySceneId(
  isSplit: boolean,
  canSplit: boolean,
  secondarySceneId: string | null,
  fallbackSceneId: string | null,
  sections: EditorSectionOption[],
) {
  if (!isSplit || !canSplit) return null

  const selectedSceneIsAvailable =
    secondarySceneId !== null &&
    sections.some((section) => section.id === secondarySceneId)
  return selectedSceneIsAvailable ? secondarySceneId : fallbackSceneId
}

function getActiveSecondaryVersionId(
  secondaryVersionId: string | null,
  versionList: SceneVersionList,
) {
  if (secondaryVersionId === null || versionList.loading) {
    return secondaryVersionId
  }
  return versionList.versions.some(
    (version) => version.id === secondaryVersionId,
  )
    ? secondaryVersionId
    : null
}

function getNextSplitSection(
  sections: EditorSectionOption[],
  sceneId: string,
  hasAlternativeVersions: boolean,
) {
  const currentIndex = sections.findIndex((section) => section.id === sceneId)
  if (hasAlternativeVersions && currentIndex >= 0) return sections[currentIndex]

  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % sections.length
  return sections[nextIndex]
}

function EditorWorkspace({
  sceneId,
  selectedVersionId,
  projectId,
  sections,
  isZenMode,
  onToggleZenMode,
  onOpenSearch,
  onOpenSpellcheckSettings,
  onExportClick,
  onBeforeExportChange,
}: Readonly<{
  sceneId: string
  selectedVersionId: string | null
  projectId: string
  sections: EditorSectionOption[]
  isZenMode: boolean
  onToggleZenMode: () => void
  onOpenSearch?: () => void
  onOpenSpellcheckSettings?: () => void
  onExportClick?: () => void
  onBeforeExportChange?: (handler: (() => Promise<void>) | null) => void
}>) {
  const setActiveScene = useEditorStore((s) => s.setActiveScene)
  const setSelectedSceneVersion = useEditorStore(
    (s) => s.setSelectedSceneVersion,
  )
  const documentReloadToken = useEditorStore((s) => s.documentReloadToken)
  const [isSplit, setIsSplit] = useState(false)
  const [secondarySceneId, setSecondarySceneId] = useState<string | null>(
    null,
  )
  const [secondaryVersionId, setSecondaryVersionId] = useState<string | null>(
    null,
  )
  const [focusedPane, setFocusedPane] = useState<EditorPaneId>("primary")
  const [paragraphDialogOpen, setParagraphDialogOpen] = useState(false)
  const [toolbarExpanded, setToolbarExpanded] = useState(false)
  const [primaryActions, setPrimaryActions] =
    useState<EditorToolbarActions | null>(null)
  const [secondaryActions, setSecondaryActions] =
    useState<EditorToolbarActions | null>(null)
  const [isSavingBeforeChange, setIsSavingBeforeChange] = useState(false)
  const [saveChangeError, setSaveChangeError] = useState<string | null>(null)

  const primaryVersionList = useSceneVersionList(
    sceneId,
    `${documentReloadToken}:${selectedVersionId ?? DRAFT_VERSION_VALUE}:${isSplit}`,
  )
  const canSplit = sections.length > 1 || primaryVersionList.versions.length > 0
  const fallbackSecondarySceneId = getFallbackSecondarySceneId(
    sceneId,
    sections,
    primaryVersionList.versions,
  )
  const activeSecondarySceneId = getActiveSecondarySceneId(
    isSplit,
    canSplit,
    secondarySceneId,
    fallbackSecondarySceneId,
    sections,
  )
  const effectiveIsSplit = Boolean(activeSecondarySceneId)
  const primarySection = sections.find((section) => section.id === sceneId)
  const secondarySection = sections.find(
    (section) => section.id === activeSecondarySceneId,
  )
  const loadedSecondaryVersionList = useSceneVersionList(
    activeSecondarySceneId === sceneId ? null : activeSecondarySceneId,
    `${documentReloadToken}:${isSplit}`,
  )
  const secondaryVersionList =
    activeSecondarySceneId === sceneId
      ? primaryVersionList
      : loadedSecondaryVersionList
  const activeSecondaryVersionId = getActiveSecondaryVersionId(
    secondaryVersionId,
    secondaryVersionList,
  )

  const registerPrimaryActions = useCallback(
    (actions: EditorToolbarActions | null) => {
      setPrimaryActions(actions)
    },
    [],
  )

  const registerSecondaryActions = useCallback(
    (actions: EditorToolbarActions | null) => {
      setSecondaryActions(actions)
    },
    [],
  )

  const saveBeforeChange = useCallback(
    async (actions: EditorToolbarActions | null) => {
      if (!actions) return
      await requireSuccessfulSave(actions.saveNow)
    },
    [],
  )

  const saveBeforeExport = useCallback(async () => {
    await Promise.all([
      primaryActions ? requireSuccessfulSave(primaryActions.saveNow) : undefined,
      ...(effectiveIsSplit && secondaryActions ? [requireSuccessfulSave(secondaryActions.saveNow)] : []),
    ])
  }, [effectiveIsSplit, primaryActions, secondaryActions])

  useEffect(() => {
    onBeforeExportChange?.(saveBeforeExport)
    return () => onBeforeExportChange?.(null)
  }, [onBeforeExportChange, saveBeforeExport])

  const handlePrimarySceneChange = useCallback(
    async (nextSceneId: string) => {
      if (nextSceneId === sceneId || isSavingBeforeChange) return

      setIsSavingBeforeChange(true)
      setSaveChangeError(null)
      try {
        await saveBeforeChange(primaryActions)
        setFocusedPane("primary")
        setActiveScene(nextSceneId)
      } catch (error) {
        setSaveChangeError(error instanceof Error ? error.message : "No se pudieron guardar los cambios.")
      } finally {
        setIsSavingBeforeChange(false)
      }
    },
    [
      isSavingBeforeChange,
      primaryActions,
      saveBeforeChange,
      sceneId,
      setActiveScene,
    ],
  )

  const handlePrimaryVersionChange = useCallback(
    async (nextVersionId: string | null) => {
      if (nextVersionId === selectedVersionId || isSavingBeforeChange) return

      setIsSavingBeforeChange(true)
      setSaveChangeError(null)
      try {
        await saveBeforeChange(primaryActions)
        setFocusedPane("primary")
        setSelectedSceneVersion(nextVersionId)
      } catch (error) {
        setSaveChangeError(
          error instanceof Error
            ? error.message
            : "No se pudieron guardar los cambios.",
        )
      } finally {
        setIsSavingBeforeChange(false)
      }
    },
    [
      isSavingBeforeChange,
      primaryActions,
      saveBeforeChange,
      selectedVersionId,
      setSelectedSceneVersion,
    ],
  )

  const handleSecondarySceneChange = useCallback(
    async (nextSceneId: string) => {
      if (nextSceneId === activeSecondarySceneId || isSavingBeforeChange) return

      setIsSavingBeforeChange(true)
      setSaveChangeError(null)
      try {
        await saveBeforeChange(secondaryActions)
        setFocusedPane("secondary")
        setSecondarySceneId(nextSceneId)
        setSecondaryVersionId(
          nextSceneId === sceneId
            ? getAlternativeVersionId(
                selectedVersionId,
                primaryVersionList.versions,
              )
            : null,
        )
      } catch (error) {
        setSaveChangeError(error instanceof Error ? error.message : "No se pudieron guardar los cambios.")
      } finally {
        setIsSavingBeforeChange(false)
      }
    },
    [
      isSavingBeforeChange,
      saveBeforeChange,
      secondaryActions,
      activeSecondarySceneId,
      sceneId,
      selectedVersionId,
      primaryVersionList.versions,
    ],
  )

  const handleSecondaryVersionChange = useCallback(
    async (nextVersionId: string | null) => {
      if (nextVersionId === activeSecondaryVersionId || isSavingBeforeChange) {
        return
      }

      setIsSavingBeforeChange(true)
      setSaveChangeError(null)
      try {
        await saveBeforeChange(secondaryActions)
        setFocusedPane("secondary")
        setSecondaryVersionId(nextVersionId)
      } catch (error) {
        setSaveChangeError(
          error instanceof Error
            ? error.message
            : "No se pudieron guardar los cambios.",
        )
      } finally {
        setIsSavingBeforeChange(false)
      }
    },
    [
      isSavingBeforeChange,
      saveBeforeChange,
      secondaryActions,
      activeSecondaryVersionId,
    ],
  )

  const openSplit = useCallback(() => {
    if (!canSplit) return

    const nextSection = getNextSplitSection(
      sections,
      sceneId,
      primaryVersionList.versions.length > 0,
    )
    if (!nextSection) return

    setSecondarySceneId(nextSection.id)
    setSecondaryVersionId(
      nextSection.id === sceneId
        ? getAlternativeVersionId(
            selectedVersionId,
            primaryVersionList.versions,
          )
        : null,
    )
    setFocusedPane("primary")
    setIsSplit(true)
  }, [
    canSplit,
    primaryVersionList.versions,
    sceneId,
    sections,
    selectedVersionId,
  ])

  const closeSplit = useCallback(async () => {
    setIsSavingBeforeChange(true)
    setSaveChangeError(null)
    try {
      await saveBeforeChange(secondaryActions)
      setIsSplit(false)
      setSecondarySceneId(null)
      setSecondaryVersionId(null)
      setSecondaryActions(null)
      setFocusedPane("primary")
    } catch (error) {
      setSaveChangeError(error instanceof Error ? error.message : "No se pudieron guardar los cambios.")
    } finally {
      setIsSavingBeforeChange(false)
    }
  }, [saveBeforeChange, secondaryActions])

  const handleToggleSplit = useCallback(async () => {
    if (isSavingBeforeChange) return
    if (effectiveIsSplit) {
      await closeSplit()
      return
    }
    openSplit()
  }, [closeSplit, effectiveIsSplit, isSavingBeforeChange, openSplit])

  const focusedActions =
    focusedPane === "secondary" && secondaryActions
      ? secondaryActions
      : primaryActions

  useEffect(() => {
    if (!focusedActions) return
    return registerEditorSaveShortcut(window, () => {
      setSaveChangeError(null)
      return requireSuccessfulSave(focusedActions.saveNow)
    }, (error) => {
      setSaveChangeError(error instanceof Error ? error.message : "No se pudieron guardar los cambios.")
    })
  }, [focusedActions])

  const primarySectionFallback: EditorSectionOption = {
    id: sceneId,
    title: "Sección actual",
    chapterTitle: "",
    bookTitle: "",
  }
  const selectedPrimarySection = primarySection ?? primarySectionFallback

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      data-editor-workspace
    >
      {saveChangeError && <p role="alert" className="mx-2 my-1 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">{saveChangeError}</p>}
      {effectiveIsSplit && focusedActions && !isZenMode && (
        <EditorMenuBar
          editor={focusedActions.editor}
          projectId={projectId}
          onSave={() => void focusedActions.saveNow()}
          onExportClick={onExportClick}
          onInsertImage={focusedActions.onInsertImage}
          onAnalyzeChanges={focusedActions.onAnalyzeChanges}
          isAnalysisSaving={focusedActions.isAnalysisSaving}
          onToggleZenMode={onToggleZenMode}
          onOpenSearch={onOpenSearch}
          onOpenSpellcheckSettings={onOpenSpellcheckSettings}
          onOpenParagraphFormat={() => setParagraphDialogOpen(true)}
          onToggleSplit={() => void handleToggleSplit()}
          isSplit={effectiveIsSplit}
          canSplit={canSplit}
          isZenMode={isZenMode}
          toolbarExpanded={toolbarExpanded}
          onToggleToolbar={() => setToolbarExpanded((expanded) => !expanded)}
          onInsertDivider={(variant) =>
            focusedActions.editor.chain().focus().setSceneDivider(variant).run()
          }
        />
      )}
      {effectiveIsSplit &&
        focusedActions &&
        (isZenMode || toolbarExpanded) && (
        <EditorToolbar
          editor={focusedActions.editor}
          onInsertImage={focusedActions.onInsertImage}
          isUploadingImage={focusedActions.isUploadingImage}
          onAnalyzeChanges={focusedActions.onAnalyzeChanges}
          isAnalysisSaving={focusedActions.isAnalysisSaving}
          isZenMode={isZenMode}
          onToggleSplit={() => void handleToggleSplit()}
          isSplit={effectiveIsSplit}
          canSplit={canSplit}
          onParagraphDialogOpenChange={setParagraphDialogOpen}
          onInsertDivider={
            focusedActions
              ? (variant) =>
                  focusedActions.editor
                    .chain()
                    .focus()
                    .setSceneDivider(variant)
                    .run()
              : undefined
          }
        />
        )}

      {effectiveIsSplit && focusedActions && (
        <EditorParagraphFormatDialog
          editor={focusedActions.editor}
          open={paragraphDialogOpen}
          onOpenChange={setParagraphDialogOpen}
        />
      )}

      <div
        className={
          effectiveIsSplit
            ? "grid min-h-0 flex-1 grid-cols-2 divide-x divide-border"
            : "flex min-h-0 flex-1 flex-col overflow-hidden"
        }
      >
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          onFocusCapture={() => setFocusedPane("primary")}
        >
          {effectiveIsSplit && (
            <PanelSelectors
              sceneId={sceneId}
              selectedVersionId={selectedVersionId}
              sections={sections}
              label="Pantalla 1"
              versions={primaryVersionList.versions}
              versionsLoading={primaryVersionList.loading}
              versionsError={primaryVersionList.error}
              disabled={isSavingBeforeChange}
              onSceneChange={(nextSceneId) => {
                void handlePrimarySceneChange(nextSceneId)
              }}
              onVersionChange={(nextVersionId) => {
                void handlePrimaryVersionChange(nextVersionId)
              }}
            />
          )}
          <div className="min-h-0 flex-1">
            <EditorPanel
              sceneId={sceneId}
              section={selectedPrimarySection}
              selectedVersionId={selectedVersionId}
              projectId={projectId}
              paneId="primary"
              isZenMode={isZenMode}
              onToggleZenMode={onToggleZenMode}
              onOpenSearch={onOpenSearch}
              onOpenSpellcheckSettings={onOpenSpellcheckSettings}
              onExportClick={onExportClick}
              showToolbar={!effectiveIsSplit}
              onEditorFocus={() => setFocusedPane("primary")}
              onToolbarActionsChange={registerPrimaryActions}
              onToggleSplit={() => void handleToggleSplit()}
              isSplit={effectiveIsSplit}
              canSplit={canSplit}
            />
          </div>
        </div>

        {effectiveIsSplit && activeSecondarySceneId && secondarySection && (
          <div
            className="flex min-h-0 min-w-0 flex-col overflow-hidden"
            onFocusCapture={() => setFocusedPane("secondary")}
          >
            <PanelSelectors
              sceneId={activeSecondarySceneId}
              selectedVersionId={activeSecondaryVersionId}
              sections={sections}
              label="Pantalla 2"
              versions={secondaryVersionList.versions}
              versionsLoading={secondaryVersionList.loading}
              versionsError={secondaryVersionList.error}
              disabled={isSavingBeforeChange}
              onSceneChange={(nextSceneId) => {
                void handleSecondarySceneChange(nextSceneId)
              }}
              onVersionChange={(nextVersionId) => {
                void handleSecondaryVersionChange(nextVersionId)
              }}
            />
            <div className="min-h-0 flex-1">
              <EditorPanel
                sceneId={activeSecondarySceneId}
                section={secondarySection}
                selectedVersionId={activeSecondaryVersionId}
                projectId={projectId}
                paneId="secondary"
                isZenMode={isZenMode}
                onToggleZenMode={onToggleZenMode}
                showToolbar={false}
                onEditorFocus={() => setFocusedPane("secondary")}
                onToolbarActionsChange={registerSecondaryActions}
                onToggleSplit={() => void handleToggleSplit()}
                isSplit={effectiveIsSplit}
                canSplit={canSplit}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function EditorContainer({
  sceneId,
  projectId,
  isZenMode,
  sections,
  onToggleZenMode,
  onOpenSearch,
  onOpenSpellcheckSettings,
  onExportClick,
  onBeforeExportChange,
}: Readonly<{
  sceneId: string
  projectId: string
  isZenMode: boolean
  sections: EditorSectionOption[]
  onToggleZenMode: () => void
  onOpenSearch?: () => void
  onOpenSpellcheckSettings?: () => void
  onExportClick?: () => void
  onBeforeExportChange?: (handler: (() => Promise<void>) | null) => void
}>) {
  const selectedVersionId = useEditorStore((s) => s.selectedSceneVersionId)

  return (
    <EditorZoomProvider>
      <EditorWorkspace
        sceneId={sceneId}
        selectedVersionId={selectedVersionId}
        projectId={projectId}
        sections={sections}
        isZenMode={isZenMode}
        onToggleZenMode={onToggleZenMode}
        onOpenSearch={onOpenSearch}
        onOpenSpellcheckSettings={onOpenSpellcheckSettings}
        onExportClick={onExportClick}
        onBeforeExportChange={onBeforeExportChange}
      />
    </EditorZoomProvider>
  )
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}
