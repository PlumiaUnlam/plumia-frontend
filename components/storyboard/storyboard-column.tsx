"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus } from "lucide-react"

import { StoryboardCardItem } from "@/components/storyboard/storyboard-card-item"
import type { StoryboardColumnConfig } from "@/components/storyboard/storyboard-config"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Entity } from "@/types/entity"
import type { StoryboardCard, StoryboardCardStatus } from "@/types/storyboard"

type StoryboardColumnProps = {
  column: StoryboardColumnConfig
  cards: StoryboardCard[]
  entitiesById: Record<string, Entity>
  onAddCard: (status: StoryboardCardStatus) => void
  onEditCard: (card: StoryboardCard) => void
  onDeleteCard: (card: StoryboardCard) => void
}

export function StoryboardColumn({
  column,
  cards,
  entitiesById,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: StoryboardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id })
  const ColumnIcon = column.icon

  return (
    <section className="flex h-full min-w-[260px] flex-1 flex-col">
      <div className="mb-3 shrink-0">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <ColumnIcon className={cn("size-4", column.color)} />
          </div>
          <h2 className="text-sm font-semibold">{column.title}</h2>
          <span className="text-xs text-muted-foreground">({cards.length})</span>
        </div>
        <Button
          variant="outline"
          className="w-full border-dashed text-muted-foreground hover:text-primary"
          onClick={() => onAddCard(column.id)}
        >
          <Plus className="size-3.5" />
          Nueva tarjeta
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-transparent bg-muted/20 p-2 transition-colors",
          isOver && "border-dashed border-primary/40 bg-primary/5",
        )}
      >
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <StoryboardCardItem
              key={card.id}
              card={card}
              entitiesById={entitiesById}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
            />
          ))}
        </SortableContext>
        {cards.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center text-sm italic text-muted-foreground">
            Arrastra tarjetas aquí
          </div>
        ) : null}
      </div>
    </section>
  )
}
