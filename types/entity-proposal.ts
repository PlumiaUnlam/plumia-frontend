import type { EntityType } from "@/types/entity"
export type EntityProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "OBSOLETE"
export type EntityProposalKind = "NEW_ENTITY" | "ENTITY_UPDATE"

export interface EntityProposalPayload {
  canonicalName: string
  aliases: string[]
  type: EntityType
  description: string | null
  attributes: Record<string, unknown>
  imageUrl: string | null
  proposalKind?: EntityProposalKind
  confidenceScore?: number
  sourceSceneId?: string
  sourceSceneTitle?: string | null
  evidence?: string[]
  normalizedName?: string
  sourceChunkId?: string | null
  sourceChunkHash?: string | null
  chunkEvidence?: Array<{
    chunkId: string
    chunkHash: string
    chunkIndex: number
  }>
}

export interface EntityProposal {
  id: string
  projectId: string
  sceneId: string
  sceneTitle: string | null
  chapterTitle: string | null
  entityId: string | null
  status: EntityProposalStatus
  confidenceScore: number
  resolutionReason: string | null
  reviewedById: string | null
  reviewedAt: string | null
  createdAt: string
  proposedData: EntityProposalPayload
  targetEntity: {
    id: string
    canonicalName: string
    aliases: string[]
    type: EntityType
    description: string | null
    attributes: Record<string, unknown>
  } | null
}
