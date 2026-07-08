"use client"

import type { ReactNode } from "react"
import { Tag } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { getEntityTypeStyle } from "@/lib/entity-category-style"
import type { Entity } from "@/types/entity"
import type { StoryboardCard } from "@/types/storyboard"

type StoryboardCardBodyProps = {
  card: StoryboardCard
  entitiesById: Record<string, Entity>
  dragHandle: ReactNode
  actions?: ReactNode
}

export function StoryboardCardBody({
  card,
  entitiesById,
  dragHandle,
  actions,
}: StoryboardCardBodyProps) {
  const selectedEntities = card.entityIds
    .map((entityId) => entitiesById[entityId])
    .filter((entity): entity is Entity => !!entity)

  return (
    <div className="flex items-start gap-2">
      {dragHandle}
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold">
          {card.title}
        </h3>
        <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {card.description || "Sin descripción"}
        </p>

        {card.tags.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1">
            {card.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-primary/10 text-primary"
              >
                <Tag className="size-2.5" />
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        {selectedEntities.length > 0 ? (
          <div className="mb-3 space-y-1.5 text-xs text-muted-foreground">
            {selectedEntities.slice(0, 2).map((entity) => (
              <div key={entity.id} className="flex min-w-0 items-center gap-1.5">
                {(() => {
                  const style = getEntityTypeStyle(entity.type)
                  const Icon = style.icon

                  return (
                    <Icon
                      className="size-3 shrink-0"
                      style={{ color: style.color }}
                      aria-hidden="true"
                    />
                  )
                })()}
                <span className="min-w-0 flex-1 truncate">
                  {entity.canonicalName}
                </span>
              </div>
            ))}
            {selectedEntities.length > 2 ? (
              <div>+{selectedEntities.length - 2} más</div>
            ) : null}
          </div>
        ) : null}

        {actions}
      </div>
    </div>
  )
}
