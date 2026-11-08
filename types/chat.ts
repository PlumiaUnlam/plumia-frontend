export type ChatSourceKind =
  | "manuscript"
  | "wiki"
  | "timeline"
  | "application_help"

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
  cited?: boolean
  primary?: boolean
  chunkIndex?: number
  contentHash?: string | null
  textQuote?: string
  route?: string
}

/** Parte concreta del editor a la que lleva un acceso directo (la define el backend). */
export type ChatSection =
  | "editor-toolbar"
  | "editor-right-wiki"
  | "editor-right-chat"
  | "editor-right-stats"
  | "editor-right-review"
  | "editor-history"

export type ChatAction = {
  id: string
  kind: "navigation"
  label: string
  description: string
  route: string
  section?: ChatSection
}

export type ChatThread = {
  id: string
  projectId: string
  title: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export type ChatThreadPage = {
  items: ChatThread[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export type ChatMessage = {
  id: string
  threadId: string
  role: "user" | "assistant" | "system"
  content: string
  sources: ChatSource[]
  actions: ChatAction[]
  inputTokens: number | null
  outputTokens: number | null
  createdAt: string
}

export type ChatExchange = {
  userMessage: ChatMessage
  assistantMessage: ChatMessage
}
