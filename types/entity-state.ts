export type EntityState = {
  id: string
  entityId: string
  attributeKey: string
  fromValue: string | null
  toValue: string | null
  validFromSceneId: string
  validToSceneId: string | null
  narrativeOrder: number | null
  source: string
  createdAt: string
}

export type EntityStateHistoryScene = {
  id: string
  title: string | null
  chapterTitle: string
  bookTitle: string
}

export type EntityStateHistoryEntry = EntityState & {
  entityName: string
  validFromScene: EntityStateHistoryScene
  validToScene: EntityStateHistoryScene | null
}

export type EntityStateProposal = {
  id: string
  projectId: string
  sceneId: string
  sceneTitle: string | null
  chapterTitle: string | null
  bookTitle: string | null
  sourceChunkId: string | null
  sourceChunkHash: string | null
  entityId: string
  entityName: string
  attributeKey: string
  fromValue: string | null
  toValue: string | null
  evidence: string[]
  confidenceScore: number
  conflictsWithLocked: boolean
  narrativeOrder: number | null
  sequenceKind: "TRANSITION" | "CONTRADICTION" | "UNCERTAIN" | null
  status: "PENDING" | "APPROVED" | "REJECTED" | "OBSOLETE"
  createdAt: string
}

export type CreateEntityStateInput = {
  attributeKey: string
  toValue: string
  validFromSceneId: string
  validToSceneId?: string | null
}

export type UpdateEntityStateInput = {
  toValue?: string
  validToSceneId?: string | null
}

export type EntityStateProposalOverride = {
  attributeKey?: string
  toValue?: string
  validFromSceneId?: string
  validToSceneId?: string | null
}

export type TemporalKnowledgeView = {
  sceneId: string
  scenes: Array<{ id: string; title: string | null }>
  entities: Array<{
    id: string
    canonicalName: string
    aliases: string[]
    type: string
    attributes: Record<string, unknown>
    dynamicStates: Array<{ key: string; value: string | null }>
  }>
  relationships: Array<{
    id: string
    sourceEntityId: string
    targetEntityId: string
    relationType: string
    description: string | null
    intensity: number
    validFromSceneId: string | null
    validToSceneId: string | null
  }>
}
