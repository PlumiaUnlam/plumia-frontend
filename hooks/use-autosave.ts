import { useCallback, useEffect, useRef } from "react"

import { saveScene, saveSceneVersion } from "@/services/scene.service"
import { useEditorStore } from "@/stores/editor.store"
import { protectPendingEditorChanges } from "@/lib/editor-save-protection"
import type { EditorPaneId } from "@/components/editor/editor-types"
import type {
  ProseMirrorJSON,
  SaveSceneResult,
  SaveSceneVersionResult,
} from "@/types/scene"

const DEBOUNCE_MS = 30000
const MAX_RETRIES = 3

export type SavedSceneResult = SaveSceneResult | SaveSceneVersionResult

export type AutosaveResult =
  | { status: "saved"; result: SavedSceneResult }
  | { status: "unchanged" }
  | { status: "failed" }

type UseAutosaveArgs = {
  sceneId: string
  versionId?: string | null
  paneId?: EditorPaneId
  initialContent: ProseMirrorJSON | null
  onSaveComplete?: (result: SavedSceneResult) => void
}

/**
 * Saves the full scene with debounce and exposes the same save path to the UI.
 * Only one request is active at a time; newer editor content is saved next.
 */
export function useAutosave({
  sceneId,
  versionId,
  paneId = "primary",
  initialContent,
  onSaveComplete,
}: UseAutosaveArgs) {
  const setPaneSaveStatus = useEditorStore((state) => state.setPaneSaveStatus)
  const markPaneSaved = useEditorStore((state) => state.markPaneSaved)
  const setPaneError = useEditorStore((state) => state.setPaneError)
  const saveStatus = useEditorStore((state) => state.saveStatusByPane[paneId])

  const latestRef = useRef<ProseMirrorJSON | null>(initialContent)
  const latestContentReaderRef = useRef<(() => ProseMirrorJSON) | null>(null)
  const lastSavedSerializedRef = useRef<string | null>(null)
  const savingRef = useRef(false)
  const dirtyRef = useRef(false)
  const changeVersionRef = useRef(0)
  const retriesRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef<Promise<AutosaveResult> | null>(null)
  const runSaveRef = useRef<() => Promise<AutosaveResult>>(() =>
    Promise.resolve({ status: "unchanged" }),
  )

  // The loaded content is the saved baseline for this scene or version.
  useEffect(() => {
    lastSavedSerializedRef.current = initialContent
      ? JSON.stringify(initialContent)
      : null
    latestRef.current = initialContent
    latestContentReaderRef.current = null
    dirtyRef.current = false
    changeVersionRef.current = 0
    retriesRef.current = 0
    setPaneSaveStatus(paneId, "idle")
    // Only reset the baseline when changing the document being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId, sceneId, versionId])

  const runSave = useCallback(async (): Promise<AutosaveResult> => {
    if (savingRef.current) {
      return inFlightRef.current ?? { status: "unchanged" }
    }

    const current = latestContentReaderRef.current?.() ?? latestRef.current
    if (current == null) return { status: "unchanged" }
    latestRef.current = current

    const serialized = JSON.stringify(current)
    if (serialized === lastSavedSerializedRef.current) {
      dirtyRef.current = false
      setPaneSaveStatus(paneId, "idle")
      return { status: "unchanged" }
    }

    const savedChangeVersion = changeVersionRef.current
    savingRef.current = true
    setPaneSaveStatus(paneId, "saving")

    const operation = (async (): Promise<AutosaveResult> => {
      try {
        const result = versionId
          ? await saveSceneVersion(sceneId, versionId, current)
          : await saveScene(sceneId, current)

        lastSavedSerializedRef.current = serialized
        retriesRef.current = 0
        markPaneSaved(paneId, result.updatedAt)
        savingRef.current = false
        onSaveComplete?.(result)

        if (changeVersionRef.current !== savedChangeVersion) {
          return runSaveRef.current()
        }

        dirtyRef.current = false
        return { status: "saved", result }
      } catch (error) {
        savingRef.current = false
        setPaneError(
          paneId,
          error instanceof Error ? error.message : "Error al guardar",
        )
        retriesRef.current += 1

        if (retriesRef.current <= MAX_RETRIES) {
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(
            () => void runSaveRef.current(),
            DEBOUNCE_MS * retriesRef.current,
          )
        }

        return { status: "failed" }
      }
    })()

    inFlightRef.current = operation
    try {
      return await operation
    } finally {
      if (inFlightRef.current === operation) {
        inFlightRef.current = null
      }
    }
  }, [markPaneSaved, onSaveComplete, paneId, sceneId, setPaneError, setPaneSaveStatus, versionId])

  useEffect(() => {
    runSaveRef.current = runSave
  }, [runSave])

  const queueSave = useCallback((readContent: () => ProseMirrorJSON) => {
    latestContentReaderRef.current = readContent
    changeVersionRef.current += 1
    if (!dirtyRef.current) {
      dirtyRef.current = true
      setPaneSaveStatus(paneId, "dirty")
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void runSaveRef.current(), DEBOUNCE_MS)
  }, [paneId, setPaneSaveStatus])

  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    return runSaveRef.current()
  }, [])

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    void runSaveRef.current()
  }, [])

  useEffect(() => {
    if (saveStatus !== "dirty" && saveStatus !== "saving" && saveStatus !== "error") return
    return protectPendingEditorChanges(window, document, () => (
      dirtyRef.current
    ), flush)
  }, [flush, saveStatus])

  useEffect(() => () => flush(), [flush])

  useEffect(() => {
    const retryWhenOnline = () => {
      retriesRef.current = 0
      void runSaveRef.current()
    }
    window.addEventListener("online", retryWhenOnline)
    return () => window.removeEventListener("online", retryWhenOnline)
  }, [])

  return { queueSave, saveNow }
}
