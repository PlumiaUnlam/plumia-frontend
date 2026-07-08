"use client"

import { GripVertical } from "lucide-react"

import { StoryboardCardBody } from "@/components/storyboard/storyboard-card-body"
import type { Entity } from "@/types/entity"
import type { StoryboardCard } from "@/types/storyboard"

type StoryboardCardPreviewProps = {
  card: StoryboardCard
  entitiesById: Record<string, Entity>
}

export function StoryboardCardPreview({
  card,
  entitiesById,
}: StoryboardCardPreviewProps) {
  return (
    <article className="w-[284px] cursor-grabbing rounded-lg border border-primary/40 bg-card p-4 shadow-xl ring-2 ring-primary/15">
      <StoryboardCardBody
        card={card}
        entitiesById={entitiesById}
        dragHandle={
          <GripVertical className="mt-0.5 size-4 text-muted-foreground" />
        }
      />
    </article>
  )
}
