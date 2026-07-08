"use client"

import { useMemo, useRef, useState } from "react"
import {
  BookOpen,
  Grid3x3,
  Link2,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import useSWR from "swr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { getEntityTypeStyle } from "@/lib/entity-category-style"
import { cn } from "@/lib/utils"
import {
  createStoryboardArc,
  createStoryboardMatrixNote,
  deleteStoryboardArc,
  deleteStoryboardMatrixNote,
  getStoryboardArcs,
} from "@/services/storyboard-matrix.service"
import type { Entity } from "@/types/entity"
import { TYPE_TO_CATEGORY } from "@/types/entity"
import type { Relationship } from "@/types/relationship"
import type {
  CreateStoryboardArcInput,
  StoryboardArc,
  StoryboardArcSourceType,
  StoryboardMatrixNote,
} from "@/types/storyboard-matrix"

type StoryboardChapter = {
  id: string
  title: string
  sortKey: string
}

type StoryboardMatrixProps = {
  projectId: string
  chapters: StoryboardChapter[]
  entities: Entity[]
  relationships: Relationship[]
  loadingSources?: boolean
}

const SOURCE_LABELS: Record<StoryboardArcSourceType, string> = {
  custom: "Arco narrativo",
  entity: "Entidad",
  relationship: "Relación",
}

const RELATION_LABELS: Record<Relationship["relationType"], string> = {
  ALLY: "Aliado",
  ENEMY: "Enemigo",
  FAMILY: "Familia",
  ROMANTIC: "Romance",
  MENTOR: "Mentoría",
  RIVAL: "Rivalidad",
  MEMBER_OF: "Miembro de",
  LOCATED_IN: "Ubicado en",
  OWNS: "Posee",
  KNOWS: "Conoce",
}

function selectClassName(className?: string) {
  return cn(
    "h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
    className,
  )
}

function getRelationshipLabel(
  relationship: Relationship,
  entitiesById: Record<string, Entity>,
) {
  const source = entitiesById[relationship.sourceEntityId]?.canonicalName
  const target = entitiesById[relationship.targetEntityId]?.canonicalName
  const label = RELATION_LABELS[relationship.relationType]

  return `${source ?? "Entidad"} ${label.toLowerCase()} ${target ?? "Entidad"}`
}

function getArcSubtitle(
  arc: StoryboardArc,
  entitiesById: Record<string, Entity>,
) {
  if (arc.sourceType === "entity" && arc.entityId) {
    const entity = entitiesById[arc.entityId]
    return entity ? TYPE_TO_CATEGORY[entity.type] : "Entidad"
  }

  if (arc.sourceType === "custom") {
    return arc.customType || "Arco narrativo"
  }

  return SOURCE_LABELS[arc.sourceType]
}

function ArcIcon({
  arc,
  entitiesById,
}: {
  arc: StoryboardArc
  entitiesById: Record<string, Entity>
}) {
  if (arc.sourceType === "entity" && arc.entityId) {
    const entity = entitiesById[arc.entityId]

    if (entity) {
      const style = getEntityTypeStyle(entity.type)
      const Icon = style.icon

      return (
        <Icon
          className="size-4 shrink-0"
          style={{ color: style.color }}
          aria-hidden="true"
        />
      )
    }
  }

  if (arc.sourceType === "relationship") {
    return <Link2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
  }

  return <BookOpen className="size-4 shrink-0 text-muted-foreground" />
}

function ArcDialog({
  open,
  entities,
  relationships,
  entitiesById,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  entities: Entity[]
  relationships: Relationship[]
  entitiesById: Record<string, Entity>
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: CreateStoryboardArcInput) => Promise<void>
}) {
  const [sourceType, setSourceType] =
    useState<StoryboardArcSourceType>("custom")
  const [title, setTitle] = useState("")
  const [customType, setCustomType] = useState("")
  const [entityId, setEntityId] = useState("")
  const [relationshipId, setRelationshipId] = useState("")

  const canSubmit =
    (sourceType === "custom" && title.trim() && customType.trim()) ||
    (sourceType === "entity" && entityId) ||
    (sourceType === "relationship" && relationshipId)

  const reset = () => {
    setSourceType("custom")
    setTitle("")
    setCustomType("")
    setEntityId("")
    setRelationshipId("")
  }

  const handleSubmit = async () => {
    if (!canSubmit) return

    const selectedEntity = entities.find((entity) => entity.id === entityId)
    const selectedRelationship = relationships.find(
      (relationship) => relationship.id === relationshipId,
    )
    const input: CreateStoryboardArcInput =
      sourceType === "entity" && selectedEntity
        ? {
            title: selectedEntity.canonicalName,
            sourceType,
            entityId: selectedEntity.id,
          }
        : sourceType === "relationship" && selectedRelationship
          ? {
              title: getRelationshipLabel(selectedRelationship, entitiesById),
              sourceType,
              relationshipId: selectedRelationship.id,
            }
          : {
              title: title.trim(),
              sourceType: "custom",
              customType: customType.trim(),
            }

    await onSubmit(input)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo arco narrativo</DialogTitle>
          <DialogDescription>
            Usa una entidad, una relación existente o crea un arco nuevo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Tipo de arco</label>
            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as StoryboardArcSourceType)}
              className={selectClassName()}
            >
              {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {sourceType === "custom" ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej: Traición y confianza"
              />
              <label className="text-sm font-medium">Tipo</label>
              <Input
                value={customType}
                onChange={(event) => setCustomType(event.target.value)}
                placeholder="Ej: Arco emocional, Subtrama, Conflicto"
              />
            </div>
          ) : null}

          {sourceType === "entity" ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Entidad</label>
              <select
                value={entityId}
                onChange={(event) => setEntityId(event.target.value)}
                className={selectClassName()}
              >
                <option value="">Selecciona una entidad</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.canonicalName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {sourceType === "relationship" ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Relación</label>
              <select
                value={relationshipId}
                onChange={(event) => setRelationshipId(event.target.value)}
                className={selectClassName()}
              >
                <option value="">Selecciona una relación</option>
                {relationships.map((relationship) => (
                  <option key={relationship.id} value={relationship.id}>
                    {getRelationshipLabel(relationship, entitiesById)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={!canSubmit || submitting}
            onClick={() => {
              void handleSubmit()
            }}
          >
            Crear arco
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NoteDialog({
  open,
  arcs,
  chapters,
  entitiesById,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  arcs: StoryboardArc[]
  chapters: StoryboardChapter[]
  entitiesById: Record<string, Entity>
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (arcId: string, chapterId: string, content: string) => Promise<void>
}) {
  const portalContainerRef = useRef<HTMLDivElement | null>(null)
  const [arcId, setArcId] = useState("")
  const [chapterId, setChapterId] = useState("")
  const [content, setContent] = useState("")
  const selectedArc = arcs.find((arc) => arc.id === arcId) ?? null
  const selectedChapter =
    chapters.find((chapter) => chapter.id === chapterId) ?? null

  const canSubmit = arcId && chapterId && content.trim()

  const reset = () => {
    setArcId("")
    setChapterId("")
    setContent("")
  }

  const handleSubmit = async () => {
    if (!canSubmit) return

    await onSubmit(arcId, chapterId, content.trim())
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva nota</DialogTitle>
          <DialogDescription>
            Selecciona el arco narrativo y el capítulo donde irá la nota.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div ref={portalContainerRef} />
          <div className="grid gap-2">
            <label className="text-sm font-medium">Arco narrativo</label>
            <Combobox<StoryboardArc>
              items={arcs}
              value={selectedArc}
              onValueChange={(arc) => setArcId(arc?.id ?? "")}
              itemToStringValue={(arc) => arc.title}
              itemToStringLabel={(arc) =>
                `${arc.title} ${getArcSubtitle(arc, entitiesById)}`
              }
              isItemEqualToValue={(arc, value) => arc.id === value.id}
            >
              <ComboboxInput
                placeholder="Buscar arco..."
                showClear
                className="h-10 w-full rounded-lg border-border bg-background text-base md:text-sm dark:bg-input/30 [&_[data-slot=input-group-control]]:h-full [&_[data-slot=input-group-control]]:text-base md:[&_[data-slot=input-group-control]]:text-sm"
              />
              <ComboboxContent
                side="bottom"
                align="start"
                className="w-[var(--anchor-width)] min-w-[var(--anchor-width)]"
                portalContainer={portalContainerRef}
              >
                <ComboboxEmpty>No hay arcos para mostrar</ComboboxEmpty>
                <ComboboxList>
                  {(arc: StoryboardArc) => (
                    <ComboboxItem key={arc.id} value={arc}>
                      <ArcIcon arc={arc} entitiesById={entitiesById} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {arc.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {getArcSubtitle(arc, entitiesById)}
                        </span>
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Capítulo</label>
            <Combobox<StoryboardChapter>
              items={chapters}
              value={selectedChapter}
              onValueChange={(chapter) => setChapterId(chapter?.id ?? "")}
              itemToStringValue={(chapter) => chapter.title}
              itemToStringLabel={(chapter) => chapter.title}
              isItemEqualToValue={(chapter, value) => chapter.id === value.id}
            >
              <ComboboxInput
                placeholder="Buscar capítulo..."
                showClear
                className="h-10 w-full rounded-lg border-border bg-background text-base md:text-sm dark:bg-input/30 [&_[data-slot=input-group-control]]:h-full [&_[data-slot=input-group-control]]:text-base md:[&_[data-slot=input-group-control]]:text-sm"
              />
              <ComboboxContent
                side="bottom"
                align="start"
                className="w-[var(--anchor-width)] min-w-[var(--anchor-width)]"
                portalContainer={portalContainerRef}
              >
                <ComboboxEmpty>No hay capítulos para mostrar</ComboboxEmpty>
                <ComboboxList>
                  {(chapter: StoryboardChapter) => (
                    <ComboboxItem key={chapter.id} value={chapter}>
                      <BookOpen className="size-4 text-muted-foreground" />
                      <span className="truncate">{chapter.title}</span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Nota</label>
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  void handleSubmit()
                }
              }}
              placeholder="Escribe una nota breve"
              className="min-h-28 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={!canSubmit || submitting}
            onClick={() => {
              void handleSubmit()
            }}
          >
            Crear nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function StoryboardMatrix({
  projectId,
  chapters,
  entities,
  relationships,
  loadingSources,
}: StoryboardMatrixProps) {
  const [arcDialogOpen, setArcDialogOpen] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [arcToDelete, setArcToDelete] = useState<StoryboardArc | null>(null)
  const [noteToDelete, setNoteToDelete] = useState<StoryboardMatrixNote | null>(
    null,
  )
  const [submitting, setSubmitting] = useState(false)

  const {
    data: arcs,
    error,
    isLoading,
    mutate,
  } = useSWR(`/projects/${projectId}/storyboard-arcs`, () =>
    getStoryboardArcs(projectId),
  )

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
    [chapters],
  )
  const sortedArcs = useMemo(
    () => [...(arcs ?? [])].sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
    [arcs],
  )
  const entitiesById = useMemo(() => {
    return entities.reduce(
      (acc, entity) => {
        acc[entity.id] = entity
        return acc
      },
      {} as Record<string, Entity>,
    )
  }, [entities])

  const createArc = async (input: CreateStoryboardArcInput) => {
    if (submitting) return

    setSubmitting(true)
    try {
      await createStoryboardArc(projectId, input)
      await mutate()
      setArcDialogOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const removeArc = async () => {
    if (!arcToDelete || submitting) return

    setSubmitting(true)
    try {
      await deleteStoryboardArc(arcToDelete.id)
      await mutate()
      setArcToDelete(null)
    } finally {
      setSubmitting(false)
    }
  }

  const addNote = async (
    arcId: string,
    chapterId: string,
    content: string,
  ) => {
    if (!content.trim() || submitting) return

    setSubmitting(true)
    try {
      await createStoryboardMatrixNote(arcId, {
        chapterId,
        content: content.trim(),
      })
      await mutate()
      setNoteDialogOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const removeNote = async () => {
    if (!noteToDelete || submitting) return

    setSubmitting(true)
    try {
      await deleteStoryboardMatrixNote(noteToDelete.id)
      await mutate()
      setNoteToDelete(null)
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading || loadingSources) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Cargando matriz
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        No se pudo cargar la matriz.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Grid3x3 className="size-4" aria-hidden="true" />
          <span>
            {sortedArcs.length} arco{sortedArcs.length === 1 ? "" : "s"} ·{" "}
            {sortedChapters.length} capítulo
            {sortedChapters.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNoteDialogOpen(true)}
            disabled={
              submitting ||
              sortedArcs.length === 0 ||
              sortedChapters.length === 0
            }
          >
            <Plus className="size-4" />
            Nueva nota
          </Button>
          <Button
            size="sm"
            onClick={() => setArcDialogOpen(true)}
            disabled={submitting}
          >
            <Plus className="size-4" />
            Nuevo arco
          </Button>
        </div>
      </div>

      {sortedChapters.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Agrega capítulos para construir la matriz.
        </div>
      ) : sortedArcs.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="grid justify-items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Todavía no hay arcos narrativos en la matriz.
            </p>
            <Button size="sm" onClick={() => setArcDialogOpen(true)}>
              <Plus className="size-4" />
              Nuevo arco
            </Button>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <Table className="min-w-max border-separate border-spacing-0">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-20 min-w-64 border bg-card">
                  Arcos narrativos
                </TableHead>
                {sortedChapters.map((chapter) => (
                  <TableHead
                    key={chapter.id}
                    className="min-w-72 border border-l-0 bg-card text-center"
                  >
                    {chapter.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedArcs.map((arc) => (
                <TableRow key={arc.id} className="hover:bg-transparent">
                  <TableCell className="sticky left-0 z-10 min-w-64 border border-t-0 bg-card align-top whitespace-normal">
                    <div className="flex items-start gap-2">
                      <ArcIcon arc={arc} entitiesById={entitiesById} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium leading-snug">
                          {arc.title}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {getArcSubtitle(arc, entitiesById)}
                        </div>
                      </div>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        disabled={submitting}
                        onClick={() => setArcToDelete(arc)}
                        aria-label="Eliminar arco"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </TableCell>

                  {sortedChapters.map((chapter) => {
                    const notes = arc.notes.filter(
                      (note) => note.chapterId === chapter.id,
                    )
                    const hasNotes = notes.length > 0

                    return (
                      <TableCell
                        key={chapter.id}
                        className="min-w-72 border border-t-0 border-l-0 p-2 align-top whitespace-normal"
                      >
                        <div
                          className={cn(
                            "grid content-start gap-1.5",
                            hasNotes ? "min-h-16" : "min-h-8",
                          )}
                        >
                          {notes.map((note) => (
                            <Badge
                              key={note.id}
                              variant="outline"
                              className="h-auto max-w-64 justify-start gap-2 rounded-md border-border bg-card px-2 py-0.5 text-left whitespace-normal"
                            >
                              <span className="min-w-0 flex-1 leading-relaxed">
                                {note.content}
                              </span>
                              <button
                                type="button"
                                className="grid size-4 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                                disabled={submitting}
                                onClick={() => setNoteToDelete(note)}
                                aria-label="Eliminar nota"
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                          {!hasNotes ? (
                            <div className="text-xs text-muted-foreground">
                              Sin notas
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ArcDialog
        open={arcDialogOpen}
        entities={entities}
        relationships={relationships}
        entitiesById={entitiesById}
        submitting={submitting}
        onOpenChange={setArcDialogOpen}
        onSubmit={createArc}
      />

      <NoteDialog
        open={noteDialogOpen}
        arcs={sortedArcs}
        chapters={sortedChapters}
        entitiesById={entitiesById}
        submitting={submitting}
        onOpenChange={setNoteDialogOpen}
        onSubmit={addNote}
      />

      <Dialog
        open={!!arcToDelete}
        onOpenChange={(open) => {
          if (!open && !submitting) setArcToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar arco narrativo</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar &ldquo;{arcToDelete?.title}&rdquo;?
              También se eliminarán sus notas de la matriz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => setArcToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => {
                void removeArc()
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!noteToDelete}
        onOpenChange={(open) => {
          if (!open && !submitting) setNoteToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar nota</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar esta nota? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => setNoteToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => {
                void removeNote()
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
