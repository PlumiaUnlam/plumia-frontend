import { useCallback, useEffect, useRef } from "react"

import { saveScene, saveSceneVersion } from "@/services/scene.service"
import { useEditorStore } from "@/stores/editor.store"
import type { ProseMirrorJSON } from "@/types/scene"

const DEBOUNCE_MS = 2000
const MAX_RETRIES = 3

type UseAutosaveArgs = {
  sceneId: string
  versionId?: string | null
  /** Contenido vivo del editor (ProseMirror JSON). `null` mientras carga. */
  content: ProseMirrorJSON | null
}

/**
 * Autoguardado del documento completo del capítulo.
 *
 * - Debounce de 2s: acumula cambios antes de enviar.
 * - Dedupe: no guarda si el JSON serializado no cambió desde el último guardado.
 * - Single-flight "latest-wins": un solo save en vuelo por capítulo; si llegan
 *   ediciones mientras se guarda, se re-guarda al terminar con la última versión.
 * - Flush del pendiente al cambiar de capítulo (unmount) y en `beforeunload`.
 * - Reintentos con backoff lineal ante error.
 *
 * Nunca bloquea el input: todo ocurre de forma asíncrona fuera del buffer del editor.
 */
export function useAutosave({ sceneId, versionId, content }: UseAutosaveArgs) {
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus)
  const markSaved = useEditorStore((s) => s.markSaved)
  const setError = useEditorStore((s) => s.setError)

  const latestRef = useRef<ProseMirrorJSON | null>(content)
  const lastSavedSerializedRef = useRef<string | null>(null)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)
  const retriesRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Permite que `runSave` se re-invoque a sí mismo (latest-wins / retry) sin
  // referenciarse antes de declararse.
  const runSaveRef = useRef<() => void>(() => {})

  // El contenido cargado del backend se considera "ya guardado" (baseline).
  useEffect(() => {
    lastSavedSerializedRef.current = content ? JSON.stringify(content) : null
    latestRef.current = content
    retriesRef.current = 0
    // Solo al (re)montar el capítulo; `content` inicial es el cargado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, versionId])

  const runSave = useCallback(async () => {
    if (savingRef.current) {
      pendingRef.current = true
      return
    }

    const current = latestRef.current
    if (current == null) return

    const serialized = JSON.stringify(current)
    if (serialized === lastSavedSerializedRef.current) return // dedupe

    savingRef.current = true
    pendingRef.current = false
    setSaveStatus("saving")

    try {
      const res = versionId
        ? await saveSceneVersion(sceneId, versionId, current)
        : await saveScene(sceneId, current)
      lastSavedSerializedRef.current = serialized
      retriesRef.current = 0
      markSaved(res.updatedAt)
      savingRef.current = false

      // latest-wins: si cambió mientras guardábamos, re-guardar.
      if (pendingRef.current || JSON.stringify(latestRef.current) !== serialized) {
        runSaveRef.current()
      }
    } catch (e) {
      savingRef.current = false
      setError(e instanceof Error ? e.message : "Error al guardar")
      retriesRef.current += 1
      if (retriesRef.current <= MAX_RETRIES) {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(
          () => runSaveRef.current(),
          DEBOUNCE_MS * retriesRef.current,
        )
      }
    }
  }, [sceneId, versionId, setSaveStatus, markSaved, setError])

  useEffect(() => {
    runSaveRef.current = runSave
  }, [runSave])

  // Cada cambio de contenido reinicia el debounce.
  useEffect(() => {
    latestRef.current = content
    if (content == null) return

    const serialized = JSON.stringify(content)
    if (serialized === lastSavedSerializedRef.current) return

    setSaveStatus("dirty")
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(runSave, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [content, runSave, setSaveStatus])

  // Flush del pendiente al desmontar (cambio de capítulo) y antes de cerrar.
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    void runSave()
  }, [runSave])

  useEffect(() => {
    window.addEventListener("beforeunload", flush)
    return () => {
      window.removeEventListener("beforeunload", flush)
      flush()
    }
  }, [flush])
}
