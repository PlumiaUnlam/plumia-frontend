import { useCallback, useEffect, useRef } from "react"

import { saveScene, saveSceneVersion } from "@/services/scene.service"
import { useEditorStore } from "@/stores/editor.store"
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
  content: ProseMirrorJSON | null
  onSaveComplete?: (result: SavedSceneResult) => void
}

/**
 * Saves the full scene with debounce and exposes the same save path to the UI.
 * Only one request is active at a time; newer editor content is saved next.
 */
export function useAutosave({
  sceneId,
  versionId,
  content,
  onSaveComplete,
}: UseAutosaveArgs) {
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus)
  const markSaved = useEditorStore((state) => state.markSaved)
  const setError = useEditorStore((state) => state.setError)

  const latestRef = useRef<ProseMirrorJSON | null>(content)
  const lastSavedSerializedRef = useRef<string | null>(null)
  const savingRef = useRef(false)
  const retriesRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef<Promise<AutosaveResult> | null>(null)
  const runSaveRef = useRef<() => Promise<AutosaveResult>>(() =>
    Promise.resolve({ status: "unchanged" }),
  )

  // The loaded content is the saved baseline for this scene or version.
  useEffect(() => {
    lastSavedSerializedRef.current = content ? JSON.stringify(content) : null
    latestRef.current = content
    retriesRef.current = 0
    // Only reset the baseline when changing the document being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, versionId])

  const runSave = useCallback(async (): Promise<AutosaveResult> => {
    if (savingRef.current) {
      return inFlightRef.current ?? { status: "unchanged" }
    }

    const current = latestRef.current
    if (current == null) return { status: "unchanged" }

    const serialized = JSON.stringify(current)
    if (serialized === lastSavedSerializedRef.current) {
      return { status: "unchanged" }
    }

    savingRef.current = true
    setSaveStatus("saving")

    const operation = (async (): Promise<AutosaveResult> => {
      try {
        const result = versionId
          ? await saveSceneVersion(sceneId, versionId, current)
          : await saveScene(sceneId, current)

        lastSavedSerializedRef.current = serialized
        retriesRef.current = 0
        markSaved(result.updatedAt)
        savingRef.current = false
        onSaveComplete?.(result)

        if (JSON.stringify(latestRef.current) !== serialized) {
          return runSaveRef.current()
        }

        return { status: "saved", result }
      } catch (error) {
        savingRef.current = false
        setError(error instanceof Error ? error.message : "Error al guardar")
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
  }, [markSaved, onSaveComplete, sceneId, setError, setSaveStatus, versionId])

  useEffect(() => {
    runSaveRef.current = runSave
  }, [runSave])

  useEffect(() => {
    latestRef.current = content
    if (content == null) return

    const serialized = JSON.stringify(content)
    if (serialized === lastSavedSerializedRef.current) return

    setSaveStatus("dirty")
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void runSaveRef.current(), DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [content, setSaveStatus])

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
    window.addEventListener("beforeunload", flush)
    return () => {
      window.removeEventListener("beforeunload", flush)
      flush()
    }
  }, [flush])

  return { saveNow }
}
