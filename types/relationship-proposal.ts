import type { RelationType } from "@/types/relationship"

export type RelationshipProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "OBSOLETE"

export interface RelationshipProposalEndpoint {
  id: string | null
  proposalId: string | null
  canonicalName: string
  isPending: boolean
}

export interface RelationshipProposal {
  id: string
  projectId: string
  sceneId: string
  relationshipId: string | null
  kind: "CREATE" | "UPDATE" | "END"
  source: RelationshipProposalEndpoint
  target: RelationshipProposalEndpoint
  current?: {
    relationType: RelationType
    description: string | null
    intensity: number
    validFromSceneId: string | null
    validToSceneId: string | null
  } | null
  relationType: RelationType
  description: string | null
  intensity: number
  evidence: string[]
  status: RelationshipProposalStatus
  canAccept: boolean
  createdAt: string
}
