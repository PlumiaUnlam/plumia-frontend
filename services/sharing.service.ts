import { auth } from "@/lib/firebase"
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api"

async function sharedRequest<T>(
  path: string,
  shareToken: string | undefined,
  options: RequestInit = {},
): Promise<T> {
  await auth.authStateReady()
  const firebaseToken = await auth.currentUser?.getIdToken()
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(firebaseToken ? { Authorization: `Bearer ${firebaseToken}` } : {}),
    ...(shareToken ? { "X-Share-Token": shareToken } : {}),
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorText = await response.text()
    try {
      const parsed = JSON.parse(errorText) as { message?: string }
      if (parsed.message) errorText = parsed.message
    } catch {}
    throw new Error(errorText)
  }

  return (await response.json()) as T
}

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
  return sharedRequest(`/reading/invitations/${slug}/accept`, token, {
    method: "POST",
    body: JSON.stringify({ token }),
  })
}

export function getSharedManuscript(
  slug: string,
  token?: string,
): Promise<SharedManuscriptView> {
  return sharedRequest(`/reading/invitations/${slug}`, token)
}

export function getReaderComments(
  slug: string,
  token?: string,
): Promise<ReaderComment[]> {
  return sharedRequest(`/reading/invitations/${slug}/comments`, token)
}

export function createReaderComment(
  slug: string,
  token: string | undefined,
  input: TextSelectionAnchor & { body: string },
): Promise<ReaderComment> {
  return sharedRequest(`/reading/invitations/${slug}/comments`, token, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function createReaderCommentReply(
  slug: string,
  token: string | undefined,
  commentId: string,
  body: string,
): Promise<ReaderComment> {
  return sharedRequest(
    `/reading/invitations/${slug}/comments/${commentId}/replies`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    },
  )
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
  token?: string,
): Promise<string> {
  const result = await sharedRequest<{ url: string }>(
    `/reading/invitations/${slug}/storage-url`,
    token,
    { method: "POST", body: JSON.stringify({ storageKey }) },
  )
  return result.url
}
