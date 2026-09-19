import { api } from "@/services/api.service"

export const EXPORT_FORMATS = ["DOCX", "PDF", "EPUB"] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]
export type ExportStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED"

export type ExportJob = {
  id: string
  projectId: string
  format: ExportFormat
  status: ExportStatus
  progress: number
  errorMessage: string | null
  downloadUrl: string | null
  createdAt: string
  completedAt: string | null
}

export async function createExport(
  projectId: string,
  format: ExportFormat,
): Promise<ExportJob> {
  return api.post<ExportJob>(`/projects/${projectId}/exports`, { format })
}

export async function getExportStatus(
  projectId: string,
  exportId: string,
  signal?: AbortSignal,
): Promise<ExportJob> {
  return api.get<ExportJob>(
    `/projects/${projectId}/exports/${exportId}`,
    signal ? { signal } : {},
  )
}
