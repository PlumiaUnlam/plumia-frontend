import { api } from "@/services/api.service"
import type { ChatExchange, ChatMessage, ChatThread } from "@/types/chat"

export function getChatThreads(
  projectId: string,
  options: Pick<RequestInit, "signal"> = {},
): Promise<ChatThread[]> {
  return api.get<ChatThread[]>(`/projects/${projectId}/chat/threads`, options)
}

export function createChatThread(
  projectId: string,
  currentChapterId?: string,
): Promise<ChatThread> {
  return api.post<ChatThread>(`/projects/${projectId}/chat/threads`, {
    currentChapterId,
  })
}

export function getChatMessages(
  threadId: string,
  options: Pick<RequestInit, "signal"> = {},
): Promise<ChatMessage[]> {
  return api.get<ChatMessage[]>(`/chat/threads/${threadId}/messages`, options)
}

export function updateChatThread(
  threadId: string,
  input: {
    title?: string
    isArchived?: boolean
    antiSpoilerEnabled?: boolean
  },
): Promise<ChatThread> {
  return api.patch<ChatThread>(`/chat/threads/${threadId}`, input)
}

export function deleteChatThread(threadId: string): Promise<void> {
  return api.delete<void>(`/chat/threads/${threadId}`)
}

export function sendChatMessage(
  threadId: string,
  content: string,
  currentChapterId?: string,
): Promise<ChatExchange> {
  return api.post<ChatExchange>(`/chat/threads/${threadId}/messages`, {
    content,
    currentChapterId,
  })
}
