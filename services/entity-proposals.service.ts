import { api } from "./api.service"
import type { CreateEntityInput, Entity, UpdateEntityInput } from "@/types/entity"
import type { EntityProposal } from "@/types/entity-proposal"

export type EntityProposalAcceptanceInput =
  | CreateEntityInput
  | UpdateEntityInput

export function buildEntityProposalAcceptanceInput(
  proposal: EntityProposal,
): EntityProposalAcceptanceInput {
  const { proposedData } = proposal
  const description = proposedData.description?.trim()
  const aliases = [
    ...new Set(
      proposedData.aliases.map((alias) => alias.trim()).filter(Boolean),
    ),
  ]

  return {
    canonicalName: proposedData.canonicalName.trim(),
    type: proposedData.type,
    ...(description ? { description } : {}),
    aliases,
    attributes: proposedData.attributes,
    ...(proposedData.proposalKind !== "ENTITY_UPDATE" && proposedData.imageUrl
      ? { imageUrl: proposedData.imageUrl }
      : {}),
  }
}

export async function getEntityProposals(
  projectId: string,
): Promise<EntityProposal[]> {
  return api.get<EntityProposal[]>(
    `/v1/projects/${encodeURIComponent(projectId)}/proposals`,
  )
}

export async function acceptEntityProposal(
  proposalId: string,
  override?: EntityProposalAcceptanceInput,
): Promise<Entity> {
  return api.post<Entity>(`/v1/proposals/${encodeURIComponent(proposalId)}/accept`, override ?? {})
}

export async function rejectEntityProposal(
  proposalId: string,
): Promise<void> {
  return api.delete<void>(`/v1/proposals/${encodeURIComponent(proposalId)}`)
}
