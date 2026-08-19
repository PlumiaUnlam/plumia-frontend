import { api } from "./api.service"
import type { Relationship } from "@/types/relationship"
import type { UpdateRelationshipInput } from "@/types/relationship"
import type { RelationshipProposal } from "@/types/relationship-proposal"

export function getRelationshipProposals(projectId: string): Promise<RelationshipProposal[]> {
  return api.get<RelationshipProposal[]>(
    `/v1/projects/${encodeURIComponent(projectId)}/relationship-proposals`,
  )
}

export function acceptRelationshipProposal(
  proposalId: string,
  override?: UpdateRelationshipInput,
): Promise<Relationship> {
  return api.post<Relationship>(
    `/v1/relationship-proposals/${encodeURIComponent(proposalId)}/accept`,
    override ?? {},
  )
}

export function rejectRelationshipProposal(proposalId: string): Promise<void> {
  return api.delete<void>(
    `/v1/relationship-proposals/${encodeURIComponent(proposalId)}`,
  )
}
