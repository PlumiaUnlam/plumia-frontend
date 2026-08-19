import { api } from "./api.service"
import type { CreateEntityInput, Entity, UpdateEntityInput } from "@/types/entity"
import type { EntityProposal } from "@/types/entity-proposal"

export async function getEntityProposals(
  projectId: string,
): Promise<EntityProposal[]> {
  return api.get<EntityProposal[]>(
    `/v1/projects/${encodeURIComponent(projectId)}/proposals`,
  )
}

export async function acceptEntityProposal(
  proposalId: string,
  override?: CreateEntityInput | UpdateEntityInput,
): Promise<Entity> {
  return api.post<Entity>(`/v1/proposals/${encodeURIComponent(proposalId)}/accept`, override ?? {})
}

export async function rejectEntityProposal(
  proposalId: string,
): Promise<void> {
  return api.delete<void>(`/v1/proposals/${encodeURIComponent(proposalId)}`)
}
