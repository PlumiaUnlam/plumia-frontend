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

export type AiProvider = "gemini" | "anthropic"
export type AiCredentialSource = "USER" | "SERVER"

export type AiProviderOption = {
  provider: AiProvider
  label: string
  suggestedModels: Array<{ id: string; label: string }>
  customModelsAllowed: true
  serverCredentialAvailable: boolean
  userKeyConfigured: boolean
  keyPrefix: string | null
  updatedAt: string | null
}

export type AiSettings = {
  configured: boolean
  keyPrefix: string | null
  updatedAt: string | null
  autoAnalyzeOnAutosave: boolean
  entityExtractionThresholds: EntityRecognitionThresholds
  provider: AiProvider
  model: string
  credentialSource: AiCredentialSource
  providers: AiProviderOption[]
}

export function getAiSettings(): Promise<AiSettings> {
  return api.get<AiSettings>("/users/me/ai-settings")
}

export function saveGeminiApiKey(apiKey: string): Promise<AiSettings> {
  return api.put<AiSettings>("/users/me/ai-settings/gemini", { apiKey })
}

export function saveAiProviderSettings(input: {
  provider: AiProvider
  model: string
  credentialSource: AiCredentialSource
}): Promise<AiSettings> {
  return api.put<AiSettings>("/users/me/ai-settings/provider", input)
}

export function saveProviderApiKey(
  provider: AiProvider,
  apiKey: string,
): Promise<AiSettings> {
  return api.put<AiSettings>(
    `/users/me/ai-settings/providers/${provider}/api-key`,
    { apiKey },
  )
}

export function removeProviderApiKey(provider: AiProvider): Promise<void> {
  return api.delete<void>(
    `/users/me/ai-settings/providers/${provider}/api-key`,
  )
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
