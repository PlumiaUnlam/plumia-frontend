"use client"

import { useCallback, useEffect, useRef } from "react"
import { requestKnowledgeRefresh } from "@/hooks/use-knowledge-refresh"
import { getSceneAnalysisStatus } from "@/services/scene.service"
import type { SceneAnalysisExecution } from "@/types/scene"

const POLL_INTERVAL_MS = 2500
const MAX_POLL_ATTEMPTS = 180
const MAX_CONSECUTIVE_ERRORS = 4

export type SceneAnalysisWatchResult =
  | SceneAnalysisExecution
  | { status: "TIMEOUT" | "UNAVAILABLE" | "CANCELLED"; error: string | null }

export function useSceneAnalysis(projectId: string, sceneId: string) {
  const generationRef = useRef(0)

  useEffect(
    () => () => {
      generationRef.current += 1
    },
    [sceneId],
  )

  const cancel = useCallback(() => {
    generationRef.current += 1
  }, [])

  const watch = useCallback(async (): Promise<SceneAnalysisWatchResult> => {
    const generation = ++generationRef.current
    let consecutiveErrors = 0

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, POLL_INTERVAL_MS)
      })
      if (generationRef.current !== generation) {
        return { status: "CANCELLED", error: null }
      }

      try {
        const result = await getSceneAnalysisStatus(sceneId)
        consecutiveErrors = 0
        if (
          result.status === "SUCCEEDED" ||
          result.status === "FAILED" ||
          result.status === "NO_CHANGES"
        ) {
          requestKnowledgeRefresh(projectId)
          return result
        }
      } catch {
        consecutiveErrors += 1
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          return {
            status: "UNAVAILABLE",
            error: "No se pudo consultar el estado del análisis.",
          }
        }
      }
    }

    return {
      status: "TIMEOUT",
      error:
        "El análisis no avanzó a tiempo. Verificá que haya un worker activo, Redis accesible y ENTITY_EXTRACTION_MODEL configurado.",
    }
  }, [projectId, sceneId])

  return { watch, cancel }
}
