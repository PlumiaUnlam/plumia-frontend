import { api } from "@/services/api.service"

export type AiSettings = {
  configured: boolean
  keyPrefix: string | null
  updatedAt: string | null
}

export function getAiSettings(): Promise<AiSettings> {
  return api.get<AiSettings>("/users/me/ai-settings")
}

export function saveGeminiApiKey(apiKey: string): Promise<AiSettings> {
  return api.put<AiSettings>("/users/me/ai-settings/gemini", { apiKey })
}

export function removeGeminiApiKey(): Promise<void> {
  return api.delete<void>("/users/me/ai-settings/gemini")
}
