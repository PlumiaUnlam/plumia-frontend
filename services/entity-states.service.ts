import { api } from "@/services/api.service"
import type {
  CreateEntityStateInput,
  EntityState,
  EntityStateHistoryEntry,
  EntityStateProposal,
  EntityStateProposalOverride,
  TemporalKnowledgeView,
  UpdateEntityStateInput,
} from "@/types/entity-state"

export function getEntityStates(entityId: string): Promise<EntityState[]> {
  return api.get(`/knowledge/entities/${encodeURIComponent(entityId)}/states`)
}

export function getProjectEntityStateHistory(
  projectId: string,
): Promise<EntityStateHistoryEntry[]> {
  return api.get(
    `/knowledge/projects/${encodeURIComponent(projectId)}/state-history`,
    { cache: "no-store" },
  )
}

export function createEntityState(
  entityId: string,
  input: CreateEntityStateInput,
): Promise<EntityState> {
  return api.post(`/knowledge/entities/${encodeURIComponent(entityId)}/states`, input)
}

export function updateEntityState(
  stateId: string,
  input: UpdateEntityStateInput,
): Promise<EntityState> {
  return api.patch(`/knowledge/entity-states/${encodeURIComponent(stateId)}`, input)
}

export function deleteEntityState(stateId: string): Promise<void> {
  return api.delete(`/knowledge/entity-states/${encodeURIComponent(stateId)}`)
}

export function getEntityStateProposals(
  projectId: string,
): Promise<EntityStateProposal[]> {
  return api.get(
    `/v1/projects/${encodeURIComponent(projectId)}/state-proposals`,
    { cache: "no-store" },
  )
}

export function acceptEntityStateProposal(
  proposalId: string,
  override?: EntityStateProposalOverride,
): Promise<EntityState> {
  return api.post(`/v1/state-proposals/${encodeURIComponent(proposalId)}/accept`, override ?? {})
}

export function acceptEntityStateProposalSequence(
  projectId: string,
  acceptedProposalIds: string[],
  rejectedProposalIds: string[],
): Promise<EntityState[]> {
  return api.post(
    `/v1/projects/${encodeURIComponent(projectId)}/state-proposals/accept-sequence`,
    { acceptedProposalIds, rejectedProposalIds },
  )
}

export function rejectEntityStateProposal(proposalId: string): Promise<void> {
  return api.delete(`/v1/state-proposals/${encodeURIComponent(proposalId)}`)
}

export function getTemporalKnowledgeView(
  projectId: string,
  sceneId: string,
): Promise<TemporalKnowledgeView> {
  return api.get(
    `/knowledge/projects/${encodeURIComponent(projectId)}/temporal-view?sceneId=${encodeURIComponent(sceneId)}`,
  )
}
