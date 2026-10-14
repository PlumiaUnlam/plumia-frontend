import { api } from "@/services/api.service"

export const EXPORT_FORMATS = ["EPUB"] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]
export type ExportStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED"

export type ExportJob = {
  id: string
  projectId: string
  bookId: string
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
  bookId: string,
): Promise<ExportJob> {
  return api.post<ExportJob>(
    `/projects/${projectId}/books/${bookId}/exports`,
    { format: "EPUB" satisfies ExportFormat },
  )
}

export async function getExportStatus(
  projectId: string,
  bookId: string,
  exportId: string,
  signal?: AbortSignal,
): Promise<ExportJob> {
  return api.get<ExportJob>(
    `/projects/${projectId}/books/${bookId}/exports/${exportId}`,
    signal ? { signal } : {},
  )
}
