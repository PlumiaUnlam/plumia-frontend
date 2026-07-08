"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Edit3, GripVertical, Trash2 } from "lucide-react"

import { StoryboardCardBody } from "@/components/storyboard/storyboard-card-body"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Entity } from "@/types/entity"
import type { StoryboardCard } from "@/types/storyboard"

type StoryboardCardItemProps = {
  card: StoryboardCard
  entitiesById: Record<string, Entity>
  onEdit: (card: StoryboardCard) => void
  onDelete: (card: StoryboardCard) => void
}

export function StoryboardCardItem({
  card,
  entitiesById,
  onEdit,
  onDelete,
}: StoryboardCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
  })

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40",
        isDragging && "opacity-50",
      )}
    >
      <StoryboardCardBody
        card={card}
        entitiesById={entitiesById}
        dragHandle={
          <button
            className="mt-0.5 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={`Arrastrar ${card.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        }
        actions={
          <div className="flex gap-1">
            <Button
              size="xs"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => onEdit(card)}
            >
              <Edit3 className="size-3" />
              Editar
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(card)}
            >
              <Trash2 className="size-3" />
              Eliminar
            </Button>
          </div>
        }
      />
    </article>
  )
}
