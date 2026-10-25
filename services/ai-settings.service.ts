import { api } from "@/services/api.service"

export type EntityRecognitionThresholds = {
  CHARACTER: number
  LOCATION: number
  OBJECT: number
  ORGANIZATION: number
  EVENT: number
  CONCEPT: number
}

export const DEFAULT_ENTITY_RECOGNITION_THRESHOLDS: EntityRecognitionThresholds = {
  CHARACTER: 0.55,
  LOCATION: 0.65,
  OBJECT: 0.85,
  ORGANIZATION: 0.7,
  EVENT: 0.75,
  CONCEPT: 0.8,
}

export type AiSettings = {
  configured: boolean
  keyPrefix: string | null
  updatedAt: string | null
  autoAnalyzeOnAutosave: boolean
  entityExtractionThresholds: EntityRecognitionThresholds
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

export function updateAutoAnalyzeOnAutosave(
  enabled: boolean,
): Promise<AiSettings> {
  return api.put<AiSettings>("/users/me/ai-settings/auto-analysis", { enabled })
}

export function updateEntityRecognitionThresholds(
  thresholds: EntityRecognitionThresholds,
): Promise<AiSettings> {
  return api.put<AiSettings>(
    "/users/me/ai-settings/entity-recognition",
    { thresholds },
  )
}
