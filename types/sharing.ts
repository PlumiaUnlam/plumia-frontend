import type { ProseMirrorJSON } from "@/types/scene"

export type SharePermission = "READ_ONLY" | "COMMENT"
export type ShareStatus = "PENDING" | "ACCEPTED" | "REVOKED"
export type ReaderCommentStatus = "OPEN" | "RESOLVED"

export type SnapshotScene = {
  id: string
  title: string | null
  content: ProseMirrorJSON | null
  wordCount: number
}

export type SnapshotChapter = {
  id: string
  title: string
  scenes: SnapshotScene[]
}

export type SnapshotBook = {
  id: string
  title: string
  chapters: SnapshotChapter[]
}

export type ManuscriptSnapshot = {
  schemaVersion: 1
  projectId: string
  title: string
  frozenAt: string
  books: SnapshotBook[]
}

export type ShareSummary = {
  id: string
  slug: string
  invitedEmail: string
  permission: SharePermission
  status: ShareStatus
  expiresAt: string | null
  createdAt: string
  frozenAt: string
}

export type CreatedShare = ShareSummary & {
  token: string
}

export type SharedManuscriptView = {
  invitation: ShareSummary
  manuscript: ManuscriptSnapshot
  viewer: {
    isOwner: boolean
    canComment: boolean
  }
}

export type ReaderComment = {
  id: string
  snapshotSceneId: string
  anchorFrom: number
  anchorTo: number
  selectedText: string
  body: string
  prefix: string | null
  suffix: string | null
  status: ReaderCommentStatus
  author: {
    id: string | null
    displayName: string
  }
  createdAt: string
  updatedAt: string
}

export type TextSelectionAnchor = {
  snapshotSceneId: string
  anchorFrom: number
  anchorTo: number
  selectedText: string
}
