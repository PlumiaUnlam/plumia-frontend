import { api } from "@/services/api.service"
import type { CreateReaderCommentInput, PublicReaderComment, ReaderComment, ShareLink } from "@/types/reading"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set("Accept", "application/json")
  if (options.body) headers.set("Content-Type", "application/json")
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })
  if (!response.ok) {
    let message = await response.text()
    try {
      const parsed = JSON.parse(message) as { message?: string }
      if (parsed.message) message = parsed.message
    } catch {}
    throw new Error(message || "No se pudo completar la operación")
  }
  return response.json() as Promise<T>
}

export function createShareLink(projectId: string, label?: string) {
  return api.post<ShareLink>(`/projects/${projectId}/shares`, { ...(label ? { label } : {}) })
}

export function getShareLinks(projectId: string) {
  return api.get<ShareLink[]>(`/projects/${projectId}/shares`)
}

export function deactivateShareLink(shareLinkId: string) {
  return api.delete<void>(`/shares/${shareLinkId}`)
}

export function updateShareLink(shareLinkId: string, input: { allowComments?: boolean; isActive?: boolean }) {
  return api.patch<Pick<ShareLink, "id" | "allowComments" | "isActive">>(`/shares/${shareLinkId}`, input)
}

export function getShareReaderComments(shareLinkId: string) {
  return api.get<ReaderComment[]>(`/shares/${shareLinkId}/comments`)
}

export function replyToReaderComment(shareLinkId: string, commentId: string, body: string) {
  return api.post<ReaderComment>(`/shares/${shareLinkId}/comments/${commentId}/replies`, { body })
}

export function setReaderCommentStatus(shareLinkId: string, commentId: string, status: "OPEN" | "RESOLVED") {
  return api.patch<ReaderComment>(`/shares/${shareLinkId}/comments/${commentId}/status`, { status })
}

export function setReaderCommentVisibility(shareLinkId: string, commentId: string, isVisible: boolean) {
  return api.patch<ReaderComment>(`/shares/${shareLinkId}/comments/${commentId}/visibility`, { isVisible })
}

export function getPublicReading(slug: string) {
  return publicRequest<import("@/types/reading").PublicReadingResponse>(`/read/${encodeURIComponent(slug)}`)
}

export function getPublicReaderComments(slug: string) {
  return publicRequest<PublicReaderComment[]>(`/read/${encodeURIComponent(slug)}/comments`)
}

export function createPublicReaderComment(slug: string, input: CreateReaderCommentInput) {
  return publicRequest<PublicReaderComment>(`/read/${encodeURIComponent(slug)}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}
