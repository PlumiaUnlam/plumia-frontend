import { api } from "@/services/api.service"

export type ProjectAnalysisStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "PARTIAL"
  | "FAILED"
  | "NO_CHANGES"

export type ProjectAnalysisScene = {
  id: string
  title: string
  chapterTitle: string
  bookTitle: string
  pendingChunks: number
}

export type ProjectAnalysisCrossChunkMode =
  | "ADJACENT_CHUNKS"
  | "SCENE_GROUPED"
  | "PROJECT_SUMMARY"
  | "DISABLED"

export type ProjectAnalysisPreview = {
  projectId: string
  sceneCount: number
  chunkCount: number
  crossChunkAuditMode: ProjectAnalysisCrossChunkMode
  affectedAdjacentPairs: number
  continuityGroupsToAnalyze: number
  continuityScenesToRecalculate: number
  continuityCheckpointsToRecalculate: number
  scenes: ProjectAnalysisScene[]
}

export type ProjectAnalysisRun = {
  id: string
  projectId: string
  status: ProjectAnalysisStatus
  totalScenes: number
  processedScenes: number
  failedScenes: number
  totalChunks: number
  createdAt: string
  completedAt: string | null
  scenes: Array<Omit<ProjectAnalysisScene, "pendingChunks"> & {
    status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "NO_CHANGES"
    totalChunks: number
    processedChunks: number
    error: string | null
  }>
}

export type StartProjectAnalysisResult = {
  status: "QUEUED" | "ALREADY_QUEUED" | "NO_CHANGES"
  run: ProjectAnalysisRun | null
}

export function getProjectAnalysisPreview(
  projectId: string,
): Promise<ProjectAnalysisPreview> {
  return api.get(`/projects/${encodeURIComponent(projectId)}/analysis-preview`)
}

export function startProjectAnalysis(
  projectId: string,
): Promise<StartProjectAnalysisResult> {
  return api.post(`/projects/${encodeURIComponent(projectId)}/analyze-changes`, {})
}

export function getProjectAnalysisRun(
  projectId: string,
  runId: string,
): Promise<ProjectAnalysisRun> {
  return api.get(
    `/projects/${encodeURIComponent(projectId)}/analysis-runs/${encodeURIComponent(runId)}`,
  )
}

export function retryProjectAnalysisFailures(
  projectId: string,
  runId: string,
): Promise<StartProjectAnalysisResult> {
  return api.post(
    `/projects/${encodeURIComponent(projectId)}/analysis-runs/${encodeURIComponent(runId)}/retry-failed`,
    {},
  )
}
