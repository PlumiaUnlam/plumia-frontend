"use client"

import { useCallback, useEffect, useState } from "react"
import { requestKnowledgeRefresh } from "@/hooks/use-knowledge-refresh"
import {
  getProjectAnalysisPreview,
  getProjectAnalysisRun,
  retryProjectAnalysisFailures,
  startProjectAnalysis,
  type ProjectAnalysisPreview,
  type ProjectAnalysisRun,
} from "@/services/project-analysis.service"

const ACTIVE_STATUSES = new Set(["QUEUED", "RUNNING"])

export function useProjectAnalysis(projectId: string) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<ProjectAnalysisPreview | null>(null)
  const [run, setRun] = useState<ProjectAnalysisRun | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [starting, setStarting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const openDialog = useCallback(async () => {
    setOpen(true)
    setError(null)
    setNotice(null)
    setRun((current) =>
      current && ACTIVE_STATUSES.has(current.status) ? current : null,
    )
    setLoadingPreview(true)
    try {
      setPreview(await getProjectAnalysisPreview(projectId))
    } catch {
      setError("No se pudo calcular qué escenas tienen cambios pendientes.")
    } finally {
      setLoadingPreview(false)
    }
  }, [projectId])

  const start = useCallback(async () => {
    setStarting(true)
    setError(null)
    setNotice(null)
    try {
      const result = await startProjectAnalysis(projectId)
      if (result.status === "NO_CHANGES") {
        setRun(null)
        setNotice("No hay escenas ni fragmentos nuevos para analizar.")
        setPreview(await getProjectAnalysisPreview(projectId))
        return
      }
      if (!result.run) {
        setError("No se recibió el estado de la ejecución del proyecto.")
        return
      }
      setRun(result.run)
      setNotice(
        result.status === "ALREADY_QUEUED"
          ? "Ya hay un análisis del proyecto en curso; mostramos su progreso."
          : "Análisis del proyecto iniciado en segundo plano.",
      )
    } catch {
      setError("No se pudo iniciar el análisis del proyecto.")
    } finally {
      setStarting(false)
    }
  }, [projectId])

  const retryFailed = useCallback(async () => {
    if (!run) return
    setRetrying(true)
    setError(null)
    try {
      const result = await retryProjectAnalysisFailures(projectId, run.id)
      if (result.run) setRun(result.run)
    } catch {
      setError("No se pudieron volver a intentar las escenas fallidas.")
    } finally {
      setRetrying(false)
    }
  }, [projectId, run])

  const runId = run?.id
  const runStatus = run?.status

  useEffect(() => {
    if (!runId || !runStatus || !ACTIVE_STATUSES.has(runStatus)) return
    let active = true
    const timer = window.setInterval(() => {
      void getProjectAnalysisRun(projectId, runId)
        .then((nextRun) => {
          if (!active) return
          setRun(nextRun)
          if (!ACTIVE_STATUSES.has(nextRun.status)) {
            requestKnowledgeRefresh(projectId)
          }
        })
        .catch(() => undefined)
    }, 2500)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [projectId, runId, runStatus])

  return {
    open,
    setOpen,
    preview,
    run,
    loadingPreview,
    starting,
    retrying,
    error,
    notice,
    openDialog,
    start,
    retryFailed,
  }
}
