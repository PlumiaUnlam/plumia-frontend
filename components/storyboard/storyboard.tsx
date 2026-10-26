"use client"

import { useMemo, useState, type ComponentProps } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
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
import { toast } from "sonner"
import useSWR from "swr"

import { Header } from "@/components/header"
import { StoryboardCardPreview } from "@/components/storyboard/storyboard-card-preview"
import { StoryboardColumn } from "@/components/storyboard/storyboard-column"
import { STORYBOARD_COLUMNS } from "@/components/storyboard/storyboard-config"
import type { CardDialogState } from "@/components/storyboard/storyboard-types"
import { ConfirmDialog } from "@/components/modal/confirm-dialog"
import { StatusTabs } from "@/components/mobile/status-tabs"
import { VoiceNoteButton } from "@/components/mobile/voice-note-button"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useViewportKind } from "@/hooks/use-viewport-kind"
import type { VoiceRecording } from "@/hooks/use-voice-transcriber"
import { voiceTitle } from "@/lib/voice-title"
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

const CardDialog = dynamic(() =>
  import("@/components/storyboard/card-dialog").then(
    (module) => module.CardDialog,
  ),
)
const StoryboardMatrix = dynamic(() =>
  import("@/components/storyboard/storyboard-matrix").then(
    (module) => module.StoryboardMatrix,
  ),
)

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

function getStoryboardCountLabel(count: number) {
  if (count === 1) return "1 tarjeta"
  return `${count} tarjetas`
}

function getViewModeVariant(
  currentMode: StoryboardViewMode,
  buttonMode: StoryboardViewMode,
) {
  return currentMode === buttonMode ? "default" : "ghost"
}

async function tryUploadAudio(cardId: string, recording: VoiceRecording) {
  try {
    await uploadStoryboardAudio(
      cardId,
      recording.audio,
      recording.filename,
      recording.durationSeconds,
    )
    return null
  } catch (error: unknown) {
    return audioUploadErrorMessage(error)
  }
}

function canFetchStoryboardData(
  projectId: string,
  authLoading: boolean,
  hasUser: boolean,
) {
  return Boolean(projectId && !authLoading && hasUser)
}

type StoryboardColumnActions = Pick<
  ComponentProps<typeof StoryboardColumn>,
  "entitiesById" | "onAddCard" | "onEditCard" | "onDeleteCard"
>

function StoryboardKanbanContent({
  isLoading,
  hasError,
  isMobile,
  mobileStatus,
  onMobileStatusChange,
  cardsByStatus,
  columnProps,
}: Readonly<{
  isLoading: boolean
  hasError: boolean
  isMobile: boolean
  mobileStatus: StoryboardCardStatus
  onMobileStatusChange: (status: StoryboardCardStatus) => void
  cardsByStatus: Record<StoryboardCardStatus, StoryboardCard[]>
  columnProps: StoryboardColumnActions
}>) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Cargando tablero
      </div>
    )
  }
  if (hasError) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        No se pudo cargar el storyboard.
      </div>
    )
  }

  const mobileColumn = STORYBOARD_COLUMNS.find(
    (column) => column.id === mobileStatus,
  )
  if (isMobile && mobileColumn) {
    return (
      <div className="flex h-full flex-col gap-3">
        <StatusTabs
          label="Estado de las tarjetas"
          items={STORYBOARD_COLUMNS.map((column) => ({
            id: column.id,
            label: column.shortTitle ?? column.title,
            count: cardsByStatus[column.id].length,
          }))}
          value={mobileStatus}
          onChange={onMobileStatusChange}
        />
        <StoryboardColumn
          column={mobileColumn}
          cards={cardsByStatus[mobileColumn.id]}
          {...columnProps}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-[1040px] gap-4">
      {STORYBOARD_COLUMNS.map((column) => (
        <StoryboardColumn
          key={column.id}
          column={column}
          cards={cardsByStatus[column.id]}
          {...columnProps}
        />
      ))}
    </div>
  )
}

export function Storyboard({ projectId }: Readonly<StoryboardProps>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedView = searchParams.get("view")
  const { loading, firebaseUser } = useAuth()
  const shouldFetch = canFetchStoryboardData(
    projectId,
    loading,
    Boolean(firebaseUser),
  )
  const isMobile = useViewportKind() === "mobile"
  const desktopSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )
  // En mobile no se arrastra: se scrollea y se toca.
  const noSensors = useSensors()
  const sensors = isMobile ? noSensors : desktopSensors

  const [dialogState, setDialogState] = useState<CardDialogState>(null)
  const [cardToDelete, setCardToDelete] = useState<StoryboardCard | null>(null)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [mobileStatus, setMobileStatus] =
    useState<StoryboardCardStatus>("ideas")
  // La matriz solo existe en escritorio.
  const viewMode: StoryboardViewMode =
    requestedView === "matrix" && !isMobile ? "matrix" : "kanban"

  const handleViewModeChange = (nextView: StoryboardViewMode) => {
    router.replace(
      `/projects/${encodeURIComponent(projectId)}/storyboard?view=${nextView}`,
    )
  }
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
  const cardCount = cards?.length ?? 0

  const columnProps = {
    entitiesById,
    onAddCard: (status: StoryboardCardStatus) =>
      setDialogState({ card: null, status }),
    onEditCard: (card: StoryboardCard) =>
      setDialogState({ card, status: card.status }),
    onDeleteCard: setCardToDelete,
  }
  const kanbanContent = (
    <StoryboardKanbanContent
      isLoading={isLoading}
      hasError={Boolean(error)}
      isMobile={isMobile}
      mobileStatus={mobileStatus}
      onMobileStatusChange={setMobileStatus}
      cardsByStatus={cardsByStatus}
      columnProps={columnProps}
    />
  )

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
        const audioError = await tryUploadAudio(savedCard.id, recording)
        if (audioError) setSaveError(audioError)
      }
      await mutate()
      setDialogState(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleVoiceNote = async (text: string, recording: VoiceRecording) => {
    try {
      const card = await createStoryboardCard(projectId, {
        title: voiceTitle(text),
        description: text,
        tags: [],
        entityIds: [],
        status: "ideas",
      })
      const audioError = await tryUploadAudio(card.id, recording)
      await mutate()
      setMobileStatus("ideas")
      if (audioError) toast.warning(audioError)
      else {
        toast.success("Nota guardada en Ideas", {
          action: {
            label: "Editar",
            onClick: () => setDialogState({ card, status: card.status }),
          },
        })
      }
    } catch {
      toast.error("No se pudo guardar la nota. Intentá de nuevo.")
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
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-background text-foreground max-md:h-[calc(100dvh-3.5rem)]">
      <Header />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-card">
        <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-4 max-md:py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="truncate text-xl font-semibold text-foreground">
              <span className="md:hidden">Notas e ideas</span>
              <span className="max-md:hidden">Storyboarding Visual</span>
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground max-md:hidden">
              Organiza visualmente ideas, escenas y eventos narrativos
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground max-md:hidden">
            {viewMode === "kanban" ? (
              <span>
                {getStoryboardCountLabel(cardCount)}
              </span>
            ) : null}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1 max-md:hidden">
              <Button
                size="xs"
                variant={getViewModeVariant(viewMode, "kanban")}
                onClick={() => handleViewModeChange("kanban")}
              >
                <Columns3 className="size-3.5" />
                Kanban
              </Button>
              <Button
                size="xs"
                variant={getViewModeVariant(viewMode, "matrix")}
                onClick={() => handleViewModeChange("matrix")}
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
              {kanbanContent}
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

      {isMobile ? <VoiceNoteButton onNote={handleVoiceNote} /> : null}

      {dialogState ? (
        <CardDialog
          state={dialogState}
          entities={entities ?? []}
          submitting={submitting}
          onClose={() => setDialogState(null)}
          onSave={handleSave}
        />
      ) : null}

      <ConfirmDialog
        open={!!cardToDelete}
        onOpenChange={(open) => {
          if (!open) setCardToDelete(null)
        }}
        title="Eliminar tarjeta"
        description={`¿Querés eliminar “${cardToDelete?.title ?? ""}”? Esta acción no se puede deshacer.`}
        loading={submitting}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function audioUploadErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message.trim() : ""
  return detail
    ? `La tarjeta se guardó, pero no se pudo guardar la nota de voz: ${detail}`
    : "La tarjeta se guardó, pero no se pudo guardar la nota de voz."
}
