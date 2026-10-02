import type { ProseMirrorJSON } from "@/types/scene"

export type ShareLink = {
  id: string
  projectId: string
  versionId: string | null
  slug: string
  allowComments: boolean
  isActive: boolean
  createdAt: string
  version: { id: string; label: string | null; type: string; createdAt: string } | null
}

export type SharedScene = {
  id: string
  chapterId: string
  title: string | null
  content: ProseMirrorJSON | null
}

export type SharedChapter = {
  id: string
  title: string
  scenes: SharedScene[]
}

export type SharedSnapshot = {
  title: string
  books: Array<{ id: string; title: string; chapters: SharedChapter[] }>
}

export type PublicReadingResponse = {
  slug: string
  allowComments: boolean
  version: {
    label: string | null
    createdAt: string
    snapshot: SharedSnapshot
  }
}

export type PublicReaderCommentReply = {
  id: string
  displayName: string
  body: string
  createdAt: string
}

export type PublicReaderComment = {
  id: string
  sceneId: string | null
  chapterId: string | null
  displayName: string
  body: string
  quote: string | null
  anchorFrom: number | null
  anchorTo: number | null
  status: "OPEN" | "RESOLVED"
  createdAt: string
  replies: PublicReaderCommentReply[]
}

export type ReaderCommentReply = {
  id: string
  authorId: string | null
  displayName: string
  body: string
  createdAt: string
  author?: { id: string; name: string; lastname: string; displayName: string | null; avatarUrl: string | null } | null
}

export type ReaderCommentStatusEvent = {
  id: string
  status: "OPEN" | "RESOLVED"
  changedById: string | null
  changedByName: string
  createdAt: string
}

export type ReaderComment = {
  id: string
  shareLinkId: string
  versionId: string | null
  sceneId: string | null
  chapterId: string | null
  displayName: string
  body: string
  quote: string | null
  anchorFrom: number | null
  anchorTo: number | null
  contextBefore: string | null
  contextAfter: string | null
  isVisible: boolean
  status: "OPEN" | "RESOLVED"
  resolvedAt: string | null
  resolvedById: string | null
  createdAt: string
  replies: ReaderCommentReply[]
  statusEvents?: ReaderCommentStatusEvent[]
}

export type CreateReaderCommentInput = {
  displayName: string
  body: string
  sceneId?: string
  chapterId?: string
  quote?: string
  anchorFrom?: number
  anchorTo?: number
  contextBefore?: string
  contextAfter?: string
}
