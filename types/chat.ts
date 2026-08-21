export type ChatSourceKind =
  | "manuscript"
  | "wiki"
  | "timeline"
  | "storyboard"
  | "summary"
  | "audit"
  | "application"

export type ChatSource = {
  id: string
  kind: ChatSourceKind
  label: string
  excerpt: string
  bookId?: string
  bookTitle?: string
  chapterId?: string
  chapterTitle?: string
  sceneId?: string
  sceneTitle?: string | null
  entityId?: string
  imageUrl?: string | null
  occurrenceCount?: number
  textQuote?: string
  route?: string
}

export type ChatThread = {
  id: string
  projectId: string
  title: string
  isArchived: boolean
  antiSpoilerEnabled: boolean
  currentChapterId: string | null
  createdAt: string
  updatedAt: string
}

export type ChatMessage = {
  id: string
  threadId: string
  role: "user" | "assistant" | "system"
  content: string
  sources: ChatSource[]
  inputTokens: number | null
  outputTokens: number | null
  createdAt: string
}

export type ChatExchange = {
  userMessage: ChatMessage
  assistantMessage: ChatMessage
}
