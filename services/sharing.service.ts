import { api } from "@/services/api.service"
import type {
  CreatedShare,
  ReaderComment,
  ReaderCommentStatus,
  SharePermission,
  ShareSummary,
  SharedManuscriptView,
  TextSelectionAnchor,
} from "@/types/sharing"

export function createFrozenShare(
  bookId: string,
  input: {
    email: string
    permission: SharePermission
    expiresAt?: string
  },
): Promise<CreatedShare> {
  return api.post(`/books/${bookId}/shares`, input)
}

export function getBookShares(bookId: string): Promise<ShareSummary[]> {
  return api.get(`/books/${bookId}/shares`)
}

export function updateBookShare(
  bookId: string,
  shareId: string,
  permission: SharePermission,
): Promise<ShareSummary> {
  return api.patch(`/books/${bookId}/shares/${shareId}`, { permission })
}

export function revokeBookShare(
  bookId: string,
  shareId: string,
): Promise<void> {
  return api.delete(`/books/${bookId}/shares/${shareId}`)
}

export function acceptShareInvitation(
  slug: string,
  token: string,
): Promise<SharedManuscriptView> {
  return api.post(`/reading/invitations/${slug}/accept`, { token })
}

export function getSharedManuscript(
  slug: string,
): Promise<SharedManuscriptView> {
  return api.get(`/reading/invitations/${slug}`)
}

export function getReaderComments(slug: string): Promise<ReaderComment[]> {
  return api.get(`/reading/invitations/${slug}/comments`)
}

export function createReaderComment(
  slug: string,
  input: TextSelectionAnchor & { body: string },
): Promise<ReaderComment> {
  return api.post(`/reading/invitations/${slug}/comments`, input)
}

export function updateReaderComment(
  slug: string,
  commentId: string,
  status: ReaderCommentStatus,
): Promise<ReaderComment> {
  return api.patch(`/reading/invitations/${slug}/comments/${commentId}`, {
    status,
  })
}

export async function getSharedStorageUrl(
  slug: string,
  storageKey: string,
): Promise<string> {
  const result = await api.post<{ url: string }>(
    `/reading/invitations/${slug}/storage-url`,
    { storageKey },
  )
  return result.url
}
