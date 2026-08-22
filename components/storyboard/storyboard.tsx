"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { Columns3, Grid3x3, Loader2 } from "lucide-react"
import useSWR from "swr"

import { Header } from "@/components/header"
import { CardDialog } from "@/components/storyboard/card-dialog"
import { StoryboardCardPreview } from "@/components/storyboard/storyboard-card-preview"
import { StoryboardColumn } from "@/components/storyboard/storyboard-column"
import { STORYBOARD_COLUMNS } from "@/components/storyboard/storyboard-config"
import { StoryboardMatrix } from "@/components/storyboard/storyboard-matrix"
import type { CardDialogState } from "@/components/storyboard/storyboard-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import type { VoiceRecording } from "@/hooks/use-voice-transcriber"
import {
  createStoryboardCard,
  deleteStoryboardCard,
  getStoryboardCards,
  updateStoryboardCard,
} from "@/services/storyboard.service"
import { uploadStoryboardAudio } from "@/services/upload.service"
import { getEntities } from "@/services/entities.service"
import { getProject } from "@/services/project.service"
import { getRelationships } from "@/services/relationships.service"
import type { Entity } from "@/types/entity"
import type {
  CreateStoryboardCardInput,
  StoryboardCard,
  StoryboardCardStatus,
} from "@/types/storyboard"

type StoryboardProps = {
  projectId: string
}

type StoryboardViewMode = "kanban" | "matrix"

const COLUMN_IDS = STORYBOARD_COLUMNS.map((column) => column.id)

function sortKeyForIndex(index: number) {
  return String(index + 1).padStart(6, "0")
}

function applyColumnOrder(
  allCards: StoryboardCard[],
  columnCards: StoryboardCard[],
) {
  const updatedCards = columnCards.map((card, index) => ({
    ...card,
    sortKey: sortKeyForIndex(index),
  }))
  const updatedById = new Map(updatedCards.map((card) => [card.id, card]))

  return allCards.map((card) => updatedById.get(card.id) ?? card)
}

function getReorderedCards(
  cards: StoryboardCard[],
  activeCardId: string,
  overId: string,
) {
  const activeCard = cards.find((card) => card.id === activeCardId)
  const overCard = cards.find((card) => card.id === overId)
  const overColumn = COLUMN_IDS.find((columnId) => columnId === overId)
  const nextStatus = overCard?.status ?? overColumn

  if (!activeCard || !nextStatus) return cards

  const sourceCards = cards
    .filter(
      (card) => card.status === activeCard.status && card.id !== activeCard.id,
    )
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  const destinationCards = cards
    .filter((card) => card.status === nextStatus && card.id !== activeCard.id)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  const movingCard = { ...activeCard, status: nextStatus }

  const insertIndex = overCard
    ? Math.max(
        0,
        destinationCards.findIndex((card) => card.id === overCard.id),
      )
    : destinationCards.length

  if (activeCard.status === nextStatus) {
    const oldColumnCards = cards
      .filter((card) => card.status === activeCard.status)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    const oldIndex = oldColumnCards.findIndex((card) => card.id === activeCard.id)
    const nextIndex = overCard
      ? oldColumnCards.findIndex((card) => card.id === overCard.id)
      : oldColumnCards.length - 1
    const nextColumnCards = oldColumnCards.filter(
      (card) => card.id !== activeCard.id,
    )

    nextColumnCards.splice(nextIndex, 0, movingCard)

    if (oldIndex === nextIndex) return cards

    return applyColumnOrder(cards, nextColumnCards)
  }

  destinationCards.splice(insertIndex, 0, movingCard)

  return applyColumnOrder(
    applyColumnOrder(cards, sourceCards),
    destinationCards,
  )
}

function getChangedCards(
  previousCards: StoryboardCard[],
  nextCards: StoryboardCard[],
) {
  const previousById = new Map(previousCards.map((card) => [card.id, card]))

  return nextCards.filter((card) => {
    const previous = previousById.get(card.id)
    return (
      previous &&
      (previous.status !== card.status || previous.sortKey !== card.sortKey)
    )
  })
}

export function Storyboard({ projectId }: StoryboardProps) {
  const { loading, firebaseUser } = useAuth()
  const shouldFetch = !!projectId && !loading && !!firebaseUser
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const [dialogState, setDialogState] = useState<CardDialogState>(null)
  const [cardToDelete, setCardToDelete] = useState<StoryboardCard | null>(null)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<StoryboardViewMode>("kanban")
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const {
    data: cards,
    error,
    isLoading,
    mutate,
  } = useSWR(
    shouldFetch ? `/projects/${projectId}/storyboard-cards` : null,
    () => getStoryboardCards(projectId),
  )
  const { data: entities } = useSWR(
    shouldFetch ? `/knowledge/entities?projectId=${projectId}` : null,
    () => getEntities(projectId),
  )
  const { data: relationships } = useSWR(
    shouldFetch ? `/knowledge/relationships?projectId=${projectId}` : null,
    () => getRelationships(projectId),
  )
  const { data: project, isLoading: isProjectLoading } = useSWR(
    shouldFetch ? `/projects/${projectId}` : null,
    () => getProject(projectId),
  )

  const entitiesById = useMemo(() => {
    return (entities ?? []).reduce(
      (acc, entity) => {
        acc[entity.id] = entity
        return acc
      },
      {} as Record<string, Entity>,
    )
  }, [entities])

  const cardsByStatus = useMemo(() => {
    return STORYBOARD_COLUMNS.reduce(
      (acc, column) => {
        acc[column.id] = (cards ?? [])
          .filter((card) => card.status === column.id)
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        return acc
      },
      {} as Record<StoryboardCardStatus, StoryboardCard[]>,
    )
  }, [cards])

  const activeCard = useMemo(
    () => cards?.find((card) => card.id === activeCardId) ?? null,
    [activeCardId, cards],
  )
  const chapters = useMemo(() => {
    return (
      project?.books.flatMap((book) =>
        book.chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          sortKey: `${book.sortKey}:${chapter.sortKey}`,
        })),
      ) ?? []
    )
  }, [project])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(String(event.active.id))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const cardId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null

    setActiveCardId(null)

    if (!cards || !overId) return

    const previousCards = cards
    const nextCards = getReorderedCards(cards, cardId, overId)
    const changedCards = getChangedCards(previousCards, nextCards)

    if (changedCards.length === 0) return

    await mutate(nextCards, { revalidate: false })

    try {
      await Promise.all(
        changedCards.map((card) =>
          updateStoryboardCard(card.id, {
            status: card.status,
            sortKey: card.sortKey,
          }),
        ),
      )
      await mutate()
    } catch (error) {
      await mutate(previousCards, { revalidate: false })
      throw error
    }
  }

  const handleSave = async (
    input: CreateStoryboardCardInput,
    recording?: VoiceRecording,
  ) => {
    if (!dialogState || submitting) return

    setSubmitting(true)
    setSaveError(null)
    try {
      let savedCard: StoryboardCard
      if (dialogState.card) {
        savedCard = await updateStoryboardCard(dialogState.card.id, input)
      } else {
        savedCard = await createStoryboardCard(projectId, {
          ...input,
          status: dialogState.status,
        })
      }
      if (recording) {
        try {
          await uploadStoryboardAudio(
            savedCard.id,
            recording.audio,
            recording.filename,
            recording.durationSeconds,
          )
        } catch (error: unknown) {
          setSaveError(audioUploadErrorMessage(error))
        }
      }
      await mutate()
      setDialogState(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!cardToDelete || submitting) return

    setSubmitting(true)
    try {
      await deleteStoryboardCard(cardToDelete.id)
      await mutate()
      setCardToDelete(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-card">
        <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Storyboarding Visual
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Organiza visualmente ideas, escenas y eventos narrativos
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {viewMode === "kanban" ? (
              <span>
                {(cards ?? []).length} tarjeta
                {(cards ?? []).length === 1 ? "" : "s"}
              </span>
            ) : null}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <Button
                size="xs"
                variant={viewMode === "kanban" ? "default" : "ghost"}
                onClick={() => setViewMode("kanban")}
              >
                <Columns3 className="size-3.5" />
                Kanban
              </Button>
              <Button
                size="xs"
                variant={viewMode === "matrix" ? "default" : "ghost"}
                onClick={() => setViewMode("matrix")}
              >
                <Grid3x3 className="size-3.5" />
                Matriz
              </Button>
            </div>
          </div>
        </div>

        {saveError ? (
          <div
            className="mx-4 mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {saveError}
          </div>
        ) : null}

        {viewMode === "kanban" ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragCancel={() => setActiveCardId(null)}
            onDragEnd={handleDragEnd}
          >
            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-4">
              {isLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Cargando tablero
                </div>
              ) : error ? (
                <div className="flex h-full items-center justify-center text-sm text-destructive">
                  No se pudo cargar el storyboard.
                </div>
              ) : (
                <div className="flex h-full min-w-[1040px] gap-4">
                  {STORYBOARD_COLUMNS.map((column) => (
                    <StoryboardColumn
                      key={column.id}
                      column={column}
                      cards={cardsByStatus[column.id]}
                      entitiesById={entitiesById}
                      onAddCard={(status) =>
                        setDialogState({ card: null, status })
                      }
                      onEditCard={(card) =>
                        setDialogState({ card, status: card.status })
                      }
                      onDeleteCard={setCardToDelete}
                    />
                  ))}
                </div>
              )}
            </div>
            <DragOverlay>
              {activeCard ? (
                <StoryboardCardPreview
                  card={activeCard}
                  entitiesById={entitiesById}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <StoryboardMatrix
            projectId={projectId}
            chapters={chapters}
            entities={entities ?? []}
            relationships={relationships ?? []}
            loadingSources={isProjectLoading}
          />
        )}
      </div>

      <CardDialog
        state={dialogState}
        entities={entities ?? []}
        submitting={submitting}
        onClose={() => setDialogState(null)}
        onSave={handleSave}
      />

      <Dialog
        open={!!cardToDelete}
        onOpenChange={(open) => {
          if (!open && !submitting) setCardToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar tarjeta</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar &ldquo;{cardToDelete?.title}&rdquo;?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => setCardToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => {
                void handleDelete()
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function audioUploadErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message.trim() : ""
  return detail
    ? `La tarjeta se guardó, pero no se pudo guardar la nota de voz: ${detail}`
    : "La tarjeta se guardó, pero no se pudo guardar la nota de voz."
}
