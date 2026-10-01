import { api } from "@/services/api.service"

export const EXPORT_FORMATS = ["DOCX", "PDF", "EPUB"] as const
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

export type ExportAlignment = "left" | "center" | "right"

export type ExportBand = {
  text: string | null
  alignment: ExportAlignment
  pageNumber: { enabled: boolean; format: string }
}

export type ExportMargins = {
  topCm: number
  bottomCm: number
  leftCm: number
  rightCm: number
}

export type ExportSettings = {
  margins: ExportMargins
  header: ExportBand | null
  footer: ExportBand | null
}

export const EXPORT_MARGIN_MIN = 0
export const EXPORT_MARGIN_MAX = 10

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  margins: { topCm: 2.5, bottomCm: 2.5, leftCm: 2.5, rightCm: 2.5 },
  header: null,
  footer: null,
}

export async function createExport(
  projectId: string,
  bookId: string,
  format: ExportFormat,
): Promise<ExportJob> {
  return api.post<ExportJob>(
    `/projects/${projectId}/books/${bookId}/exports`,
    { format },
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

export async function getExportSettings(
  projectId: string,
  signal?: AbortSignal,
): Promise<ExportSettings> {
  return api.get<ExportSettings>(
    `/projects/${projectId}/export-settings`,
    signal ? { signal } : {},
  )
}

export async function updateExportSettings(
  projectId: string,
  settings: ExportSettings,
): Promise<ExportSettings> {
  return api.put<ExportSettings>(
    `/projects/${projectId}/export-settings`,
    settings,
  )
}
