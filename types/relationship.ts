export type RelationType =
  | "ALLY"
  | "ENEMY"
  | "FAMILY"
  | "ROMANTIC"
  | "MENTOR"
  | "RIVAL"
  | "MEMBER_OF"
  | "LOCATED_IN"
  | "OWNS"
  | "KNOWS"

export interface Relationship {
  id: string
  projectId: string
  sourceEntityId: string
  targetEntityId: string
  relationType: RelationType
  intensity: number
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRelationshipInput {
  sourceEntityId: string
  targetEntityId: string
  relationType: RelationType
  intensity: number
  description?: string
}
