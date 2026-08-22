export type StoryboardCardStatus =
  | "ideas"
  | "planned"
  | "in-progress"
  | "completed"

export type StoryboardCard = {
  id: string
  projectId: string
  chapterId: string | null
  title: string
  description: string
  status: StoryboardCardStatus
  tags: string[]
  characters: string[]
  entityIds: string[]
  hasAudio: boolean
  audioDurationSecs: number | null
  sortKey: string
  createdAt: string
  updatedAt: string
}

export type CreateStoryboardCardInput = {
  title: string
  description?: string
  status?: StoryboardCardStatus
  tags?: string[]
  characters?: string[]
  entityIds?: string[]
  sortKey?: string
}

export type UpdateStoryboardCardInput = Partial<CreateStoryboardCardInput>
