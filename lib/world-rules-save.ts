import type { useSWRConfig } from "swr"

import {
  updateKnowledgeReviewSettings,
  type KnowledgeReviewSettings,
} from "@/services/knowledge-review-settings.service"
import { updateProject, type ProjectResponse } from "@/services/project.service"

type Mutate = ReturnType<typeof useSWRConfig>["mutate"]

function currentGenreRules(project: ProjectResponse | undefined) {
  const genreRules = project?.genreRules
  return genreRules && !Array.isArray(genreRules) ? genreRules : {}
}

/** Guarda a la vez las reglas del mundo del proyecto y su modo de revisión automática. */
export async function saveWorldRulesAndReview(input: {
  projectId: string
  project: ProjectResponse | undefined
  worldRules: string[]
  reviewSettings: KnowledgeReviewSettings
}) {
  const { reviewSettings } = input
  const [savedProject, savedReviewSettings] = await Promise.all([
    updateProject(input.projectId, {
      genreRules: { ...currentGenreRules(input.project), rules: input.worldRules },
    }),
    updateKnowledgeReviewSettings(input.projectId, {
      stateTrackingEnabled: reviewSettings.stateTrackingEnabled,
      stateReviewMode: reviewSettings.stateReviewMode,
      stateConfidenceThreshold: reviewSettings.stateConfidenceThreshold,
      relationshipReviewMode: reviewSettings.relationshipReviewMode,
      relationshipConfidenceThreshold: reviewSettings.relationshipConfidenceThreshold,
      crossChunkAuditMode: reviewSettings.crossChunkAuditMode,
    }),
  ])
  return { savedProject, savedReviewSettings }
}

/** Deja al día lo que el resto de la app tiene en caché sobre la revisión del proyecto. */
export function refreshReviewCaches(
  mutate: Mutate,
  projectId: string,
  savedReviewSettings: KnowledgeReviewSettings,
) {
  const encoded = encodeURIComponent(projectId)
  void mutate(`/projects/${encoded}/knowledge-review-settings`, savedReviewSettings, {
    revalidate: false,
  })
  const stateProposalsKey = `/v1/projects/${encoded}/state-proposals`
  if (savedReviewSettings.stateTrackingEnabled) {
    void mutate(stateProposalsKey)
  } else {
    void mutate(stateProposalsKey, [], { revalidate: false })
  }
}
