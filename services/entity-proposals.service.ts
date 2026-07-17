import { api } from "./api.service"
import type { CreateEntityInput, Entity } from "@/types/entity"
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
  input?: Partial<CreateEntityInput>,
): Promise<Entity> {
  return api.post<Entity>(
    `/v1/proposals/${encodeURIComponent(proposalId)}/accept`,
    input ?? {},
  )
}

export async function rejectEntityProposal(
  proposalId: string,
): Promise<EntityProposal> {
  return api.post<EntityProposal>(
    `/v1/proposals/${encodeURIComponent(proposalId)}/reject`,
    {},
  )
}
