import { api } from "@/services/api.service"

export type KnowledgeReviewMode = "MANUAL" | "AUTO_THRESHOLD"

export type KnowledgeReviewSettings = {
  stateReviewMode: KnowledgeReviewMode
  stateConfidenceThreshold: number
  relationshipReviewMode: KnowledgeReviewMode
  relationshipConfidenceThreshold: number
  updatedAt: string
}

export const DEFAULT_KNOWLEDGE_REVIEW_SETTINGS: KnowledgeReviewSettings = {
  stateReviewMode: "MANUAL",
  stateConfidenceThreshold: 0.9,
  relationshipReviewMode: "MANUAL",
  relationshipConfidenceThreshold: 0.9,
  updatedAt: "",
}

export function getKnowledgeReviewSettings(
  projectId: string,
): Promise<KnowledgeReviewSettings> {
  return api.get(
    `/projects/${encodeURIComponent(projectId)}/knowledge-review-settings`,
  )
}

export function updateKnowledgeReviewSettings(
  projectId: string,
  settings: Omit<KnowledgeReviewSettings, "updatedAt">,
): Promise<KnowledgeReviewSettings> {
  return api.put(
    `/projects/${encodeURIComponent(projectId)}/knowledge-review-settings`,
    settings,
  )
}
