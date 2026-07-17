export type TimelineImpact = "LOW" | "MEDIUM" | "HIGH"

export type TimelineArc = {
  id: string
  title: string
}

export type TimelineEvent = {
  id: string
  projectId: string
  title: string
  description: string | null
  date: string | null
  temporalLabel: string | null
  impact: TimelineImpact
  storyboardArcId: string | null
  arc: TimelineArc | null
  entityIds: string[]
  position: string
  source: string
  sourceSceneId: string | null
  confidenceScore: number
  createdAt: string
  updatedAt: string
}

export type TimelineEventInput = {
  title: string
  description?: string | null
  date?: string | null
  temporalLabel?: string | null
  impact?: TimelineImpact
  storyboardArcId?: string | null
  entityIds?: string[]
}

export type CreateTimelineEventInput = TimelineEventInput & {
  beforeEventId?: string
  afterEventId?: string
}

export type MoveTimelineEventInput = {
  beforeEventId?: string
  afterEventId?: string
}
