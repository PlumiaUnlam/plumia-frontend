import { api } from "./api.service"
import type { Entity } from "@/types/entity"
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
): Promise<Entity> {
  return api.post<Entity>(`/v1/proposals/${encodeURIComponent(proposalId)}/accept`, {})
}
