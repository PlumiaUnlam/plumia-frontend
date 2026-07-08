export type StoryboardArcSourceType = "custom" | "entity" | "relationship"

export type StoryboardMatrixNote = {
  id: string
  arcId: string
  chapterId: string
  content: string
  sortKey: string
  createdAt: string
  updatedAt: string
}

export type StoryboardArc = {
  id: string
  projectId: string
  title: string
  sourceType: StoryboardArcSourceType
  customType: string | null
  entityId: string | null
  relationshipId: string | null
  sortKey: string
  createdAt: string
  updatedAt: string
  notes: StoryboardMatrixNote[]
}

export type CreateStoryboardArcInput = {
  title: string
  sourceType: StoryboardArcSourceType
  customType?: string
  entityId?: string
  relationshipId?: string
}

export type CreateMatrixNoteInput = {
  chapterId: string
  content: string
}

export type UpdateMatrixNoteInput = {
  content: string
}
