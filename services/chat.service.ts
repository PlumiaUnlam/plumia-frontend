import { api } from "@/services/api.service"
import type {
  ChatExchange,
  ChatMessage,
  ChatThread,
  ChatThreadPage,
} from "@/types/chat"

export function getChatThreads(
  projectId: string,
  options: Pick<RequestInit, "signal"> & {
    page?: number
    pageSize?: number
    search?: string
  } = {},
): Promise<ChatThreadPage> {
  const query = new URLSearchParams({
    page: String(options.page ?? 1),
    pageSize: String(options.pageSize ?? 20),
    ...(options.search ? { search: options.search } : {}),
  })
  return api.get<ChatThreadPage>(
    `/projects/${projectId}/chat/threads?${query.toString()}`,
    { signal: options.signal },
  )
}

export function createChatThread(
  projectId: string,
  options: Pick<RequestInit, "signal"> = {},
): Promise<ChatThread> {
  return api.post<ChatThread>(
    `/projects/${projectId}/chat/threads`,
    {},
    options,
  )
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
  options: Pick<RequestInit, "signal"> = {},
): Promise<ChatExchange> {
  return api.post<ChatExchange>(
    `/chat/threads/${threadId}/messages`,
    { content },
    options,
  )
}
