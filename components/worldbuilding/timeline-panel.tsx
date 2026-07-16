"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import useSWR from "swr"
import {
  CalendarDays,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  Trash2,
  Users,
  Zap,
} from "lucide-react"

import { EntitySelector } from "@/components/storyboard/entity-selector"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  createTimelineEvent,
  deleteTimelineEvent,
  getTimelineEvents,
  updateTimelineEvent,
} from "@/services/timeline.service"
import { getStoryboardArcs } from "@/services/storyboard-matrix.service"
import type { Entity } from "@/types/entity"
import type { StoryboardArc } from "@/types/storyboard-matrix"
import type {
  CreateTimelineEventInput,
  TimelineEvent,
  TimelineEventInput,
  TimelineImpact,
} from "@/types/timeline"

type TimelinePanelProps = {
  projectId: string
  enabled: boolean
  entities: Entity[]
  newEventRequest: number
  createdEntity: { id: string; revision: number } | null
  onRequestCreateEntity: (canonicalName: string) => void
}

type TimelineDraft = {
  title: string
  description: string
  date: string
  temporalLabel: string
  impact: TimelineImpact
  storyboardArcId: string | null
  entityIds: string[]
}

const generalArcFilter = "__general_events__"

const impactLabels: Record<TimelineImpact, string> = {
  HIGH: "Alto",
  MEDIUM: "Medio",
  LOW: "Bajo",
}

const impactStyles: Record<TimelineImpact, string> = {
  HIGH: "border-red-500 bg-red-50/70 dark:bg-red-950/20",
  MEDIUM: "border-amber-500 bg-amber-50/70 dark:bg-amber-950/20",
  LOW: "border-primary/45 bg-card",
}

function createEmptyDraft(): TimelineDraft {
  return {
    title: "",
    description: "",
    date: "",
    temporalLabel: "",
    impact: "MEDIUM",
    storyboardArcId: null,
    entityIds: [],
  }
}

function toDraft(event: TimelineEvent): TimelineDraft {
  return {
    title: event.title,
    description: event.description ?? "",
    date: event.date ?? "",
    temporalLabel: event.temporalLabel ?? "",
    impact: event.impact,
    storyboardArcId: event.storyboardArcId,
    entityIds: event.entityIds,
  }
}

function toInput(draft: TimelineDraft): TimelineEventInput {
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    date: draft.date.trim() || null,
    temporalLabel: draft.temporalLabel.trim() || null,
    impact: draft.impact,
    storyboardArcId: draft.storyboardArcId,
    entityIds: draft.entityIds,
  }
}

export function TimelinePanel({
  projectId,
  enabled,
  entities,
  newEventRequest,
  createdEntity,
  onRequestCreateEntity,
}: TimelinePanelProps) {
  const [isParticipantFilterOpen, setIsParticipantFilterOpen] =
    useState(false)
  const [isArcFilterOpen, setIsArcFilterOpen] = useState(false)
  const [selectedImpacts, setSelectedImpacts] = useState<TimelineImpact[]>([
    "HIGH",
    "MEDIUM",
    "LOW",
  ])
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [selectedArcId, setSelectedArcId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    new Set(),
  )

  const {
    data: events,
    error: eventsError,
    isLoading: isLoadingEvents,
    mutate: mutateEvents,
  } = useSWR(
    enabled ? `/knowledge/timeline?projectId=${projectId}` : null,
    () => getTimelineEvents(projectId),
  )
  const {
    data: arcs,
    error: arcsError,
    isLoading: isLoadingArcs,
    mutate: mutateArcs,
  } = useSWR(
    enabled ? `/projects/${projectId}/storyboard-arcs` : null,
    () => getStoryboardArcs(projectId),
  )

  const entityById = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity])),
    [entities],
  )
  const participantEntities = useMemo(
    () => entities.filter((entity) => entity.type === "CHARACTER"),
    [entities],
  )
  const visibleEvents = useMemo(
    () =>
      (events ?? []).filter(
        (event) =>
          selectedImpacts.includes(event.impact) &&
          (!selectedEntityId || event.entityIds.includes(selectedEntityId)) &&
          (!selectedArcId ||
            (selectedArcId === generalArcFilter
              ? event.storyboardArcId === null
              : event.storyboardArcId === selectedArcId)),
      ),
    [events, selectedArcId, selectedEntityId, selectedImpacts],
  )

  useEffect(() => {
    if (newEventRequest === 0) return

    let isCurrent = true
    queueMicrotask(() => {
      if (!isCurrent) return
      setEditingEvent(null)
      setIsDialogOpen(true)
    })

    return () => {
      isCurrent = false
    }
  }, [newEventRequest])

  const toggleImpact = (impact: TimelineImpact) => {
    setSelectedImpacts((current) =>
      current.includes(impact)
        ? current.filter((currentImpact) => currentImpact !== impact)
        : [...current, impact],
    )
  }

  const resetFilters = () => {
    setSelectedEntityId(null)
    setSelectedArcId(null)
    setSelectedImpacts(["HIGH", "MEDIUM", "LOW"])
  }

  const saveEvent = async (input: TimelineEventInput) => {
    setActionError(null)
    if (editingEvent) {
      await updateTimelineEvent(editingEvent.id, input)
    } else {
      await createTimelineEvent(projectId, input as CreateTimelineEventInput)
    }
    await mutateEvents()
  }

  const removeEvent = async (event: TimelineEvent) => {
    try {
      setActionError(null)
      await deleteTimelineEvent(event.id)
      await mutateEvents()
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar el evento",
      )
    }
  }

  const toggleGlobalView = () => {
    setIsCompact((current) => {
      if (!current) setExpandedEventIds(new Set())
      return !current
    })
  }

  const toggleEventDetail = (eventId: string) => {
    setExpandedEventIds((current) => {
      const next = new Set(current)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  const loading = isLoadingEvents || isLoadingArcs
  const error = eventsError ?? arcsError

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-primary">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm font-medium">Cargando línea temporal...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <h2 className="font-semibold">No se pudo cargar la línea temporal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Intentá nuevamente."}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => { void mutateEvents(); void mutateArcs() }}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-muted/30">
      <aside className="flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-border bg-muted/35 p-4 sm:w-80">
        <p className="mb-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Filtrar por
        </p>

        <div className="space-y-3">
          <button
            type="button"
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:border-primary/35 hover:bg-primary/5"
            onClick={resetFilters}
          >
            Todos los eventos
          </button>
          <FilterButton
            active={isParticipantFilterOpen}
            onClick={() => setIsParticipantFilterOpen((current) => !current)}
          >
            Por personaje
          </FilterButton>
          {isParticipantFilterOpen && (
            <select
              aria-label="Filtrar por personaje"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              value={selectedEntityId ?? ""}
              onChange={(event) => setSelectedEntityId(event.target.value || null)}
            >
              <option value="">Todos los personajes</option>
              {participantEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.canonicalName}
                </option>
              ))}
            </select>
          )}
          <FilterButton
            active={isArcFilterOpen}
            onClick={() => setIsArcFilterOpen((current) => !current)}
          >
            Por arco narrativo
          </FilterButton>
          {isArcFilterOpen && (
            <select
              aria-label="Filtrar por arco narrativo"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              value={selectedArcId ?? ""}
              onChange={(event) => setSelectedArcId(event.target.value || null)}
            >
              <option value="">Todos los arcos</option>
              <option value={generalArcFilter}>Hechos generales (sin arco)</option>
              {(arcs ?? []).map((arc) => (
                <option key={arc.id} value={arc.id}>
                  {arc.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-7 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Impacto
          </p>
          {(Object.keys(impactLabels) as TimelineImpact[]).map((impact) => (
            <label key={impact} className="flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
              <Checkbox checked={selectedImpacts.includes(impact)} onCheckedChange={() => toggleImpact(impact)} />
              {impactLabels[impact]}
            </label>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-scroll [scrollbar-gutter:stable] px-5 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-44"
              onClick={toggleGlobalView}
            >
              {isCompact ? <Maximize2 /> : <Minimize2 />}
              {isCompact ? "Mostrar detalle" : "Vista global"}
            </Button>
          </div>
          {actionError && <p className="mb-5 text-sm text-destructive">{actionError}</p>}
          {visibleEvents.length > 0 ? (
            <ol className="relative ml-3 space-y-10 border-l-2 border-primary/20 pl-9 sm:ml-8 sm:pl-16">
              {visibleEvents.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[2.85rem] top-3 size-5 rounded-full border-4 border-muted bg-primary sm:-left-[4.6rem]" />
                  <TimelineEventCard
                    compact={isCompact}
                    expanded={expandedEventIds.has(event.id)}
                    entities={event.entityIds.map((id) => entityById.get(id)).filter((entity): entity is Entity => !!entity)}
                    event={event}
                    onToggleDetail={() => toggleEventDetail(event.id)}
                    onEdit={() => {
                      setEditingEvent(event)
                      setIsDialogOpen(true)
                    }}
                    onDelete={() => void removeEvent(event)}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/70 text-center">
              <CalendarDays className="size-10 text-primary/60" />
              <h2 className="font-semibold">No hay eventos con estos filtros</h2>
              <p className="text-sm text-muted-foreground">Modificá los filtros o agregá un nuevo evento narrativo.</p>
            </div>
          )}
        </div>
      </main>

      <TimelineEventDialog
        arcs={arcs ?? []}
        entities={entities}
        createdEntity={createdEntity}
        event={editingEvent}
        open={isDialogOpen}
        onRequestCreateEntity={onRequestCreateEntity}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingEvent(null)
        }}
        onSave={saveEvent}
      />
    </div>
  )
}

function FilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors ${active ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/35 hover:bg-primary/5"}`} onClick={onClick}>
      {children}
    </button>
  )
}

function TimelineEventCard({ compact, expanded, entities, event, onToggleDetail, onEdit, onDelete }: { compact: boolean; expanded: boolean; entities: Entity[]; event: TimelineEvent; onToggleDetail: () => void; onEdit: () => void; onDelete: () => void }) {
  const characters = entities.filter((entity) => entity.type !== "LOCATION")
  const locations = entities.filter((entity) => entity.type === "LOCATION")
  const showDetails = !compact || expanded

  return (
    <article className={`w-full rounded-2xl border-2 shadow-sm ${impactStyles[event.impact]} ${showDetails ? "p-6" : "p-4"} ${compact ? "cursor-pointer" : ""}`} onClick={compact ? onToggleDetail : undefined} onKeyDown={(eventKey) => { if (compact && (eventKey.key === "Enter" || eventKey.key === " ")) { eventKey.preventDefault(); onToggleDetail() } }} role={compact ? "button" : undefined} tabIndex={compact ? 0 : undefined}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-primary/75">{event.temporalLabel || event.date || "Sin fecha"}</p>
          <h2 className={`${showDetails ? "text-xl sm:text-2xl" : "text-lg"} font-bold tracking-tight`}>{event.title}</h2>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={`Editar ${event.title}`} onClick={(clickEvent) => { clickEvent.stopPropagation(); onEdit() }}><Pencil /></Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${event.title}`} onClick={(clickEvent) => { clickEvent.stopPropagation(); onDelete() }}><Trash2 /></Button>
        </div>
      </header>
      {showDetails && (
        <>
          {event.description && <p className="mt-4 text-base leading-relaxed text-foreground/90">{event.description}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {characters.map((entity) => <Badge key={entity.id} variant="secondary" className="h-7 gap-1.5 bg-primary/10 px-3 text-sm text-primary"><Users /> {entity.canonicalName}</Badge>)}
            {locations.map((entity) => <Badge key={entity.id} variant="secondary" className="h-7 gap-1.5 bg-emerald-100 px-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{entity.canonicalName}</Badge>)}
          </div>
          {event.arc ? <p className="mt-4 flex items-center gap-2 text-sm font-medium text-primary/75"><Zap className="size-4" /> Arco: {event.arc.title}</p> : <p className="mt-4 text-sm text-muted-foreground">Hecho general de la obra</p>}
        </>
      )}
    </article>
  )
}

function TimelineEventDialog({ arcs, entities, createdEntity, event, open, onRequestCreateEntity, onOpenChange, onSave }: { arcs: StoryboardArc[]; entities: Entity[]; createdEntity: TimelinePanelProps["createdEntity"]; event: TimelineEvent | null; open: boolean; onRequestCreateEntity: TimelinePanelProps["onRequestCreateEntity"]; onOpenChange: (open: boolean) => void; onSave: (input: TimelineEventInput) => Promise<void> }) {
  const [draft, setDraft] = useState<TimelineDraft | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const displayedDraft = draft ?? (event ? toDraft(event) : null)

  useEffect(() => {
    if (!open) return

    let isCurrent = true
    queueMicrotask(() => {
      if (!isCurrent) return
      setDraft(event ? toDraft(event) : createEmptyDraft())
      setError(null)
    })

    return () => {
      isCurrent = false
    }
  }, [event, open])

  useEffect(() => {
    if (!open || !createdEntity) return

    let isCurrent = true
    queueMicrotask(() => {
      if (!isCurrent) return
      setDraft((current) => {
        if (!current || current.entityIds.includes(createdEntity.id)) return current
        return { ...current, entityIds: [...current.entityIds, createdEntity.id] }
      })
    })

    return () => {
      isCurrent = false
    }
  }, [createdEntity, open])

  if (!displayedDraft) return null

  const updateDraft = (changes: Partial<TimelineDraft>) => setDraft((current) => ({ ...(current ?? createEmptyDraft()), ...changes }))
  const isEditing = event !== null
  const handleSave = async () => {
    if (!displayedDraft.title.trim() || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      await onSave(toInput(displayedDraft))
      onOpenChange(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el evento")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="border-b px-9 py-7"><DialogTitle className="text-2xl font-semibold">{isEditing ? "Editar Evento" : "Nuevo Evento"}</DialogTitle></DialogHeader>
        <div className="space-y-6 px-9 py-9">
          <FormField label="Nombre del evento *" htmlFor="timeline-title"><Input id="timeline-title" value={displayedDraft.title} onChange={(inputEvent) => updateDraft({ title: inputEvent.target.value })} placeholder="Ej: Desaparición de Tomás Reyes" /></FormField>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Fecha" htmlFor="timeline-date"><Input id="timeline-date" value={displayedDraft.date} onChange={(inputEvent) => updateDraft({ date: inputEvent.target.value })} placeholder="Ej: 1847-03-15" /></FormField>
            <FormField label="Período" htmlFor="timeline-period"><Input id="timeline-period" value={displayedDraft.temporalLabel} onChange={(inputEvent) => updateDraft({ temporalLabel: inputEvent.target.value })} placeholder="Ej: Unos días después" /></FormField>
          </div>
          <FormField label="Descripción" htmlFor="timeline-description"><Textarea id="timeline-description" value={displayedDraft.description} onChange={(inputEvent) => updateDraft({ description: inputEvent.target.value })} placeholder="Describe qué ocurre en este evento..." rows={5} /></FormField>
          <div className="space-y-2">
            <Label htmlFor="timeline-arc">Arco narrativo</Label>
            <select id="timeline-arc" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" value={displayedDraft.storyboardArcId ?? ""} onChange={(inputEvent) => updateDraft({ storyboardArcId: inputEvent.target.value || null })}>
              <option value="">Sin arco — hecho general de la obra</option>
              {arcs.map((arc) => <option key={arc.id} value={arc.id}>{arc.title}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">Usá esta opción para hechos históricos o eventos que atraviesan toda la obra.</p>
          </div>
          <div className="space-y-3">
            <Label>Impacto narrativo</Label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(impactLabels) as TimelineImpact[]).map((impact) => <Button key={impact} type="button" variant="outline" className={displayedDraft.impact === impact ? "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" : ""} onClick={() => updateDraft({ impact })}>{impactLabels[impact]}</Button>)}
            </div>
          </div>
          <div className="space-y-3">
            <Label>Entidades involucradas</Label>
            <EntitySelector entities={entities} label="" selectedEntityIds={displayedDraft.entityIds} onChange={(entityIds) => updateDraft({ entityIds })} onCreateEntity={onRequestCreateEntity} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="px-9 py-5"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button><Button disabled={!displayedDraft.title.trim() || submitting} onClick={() => void handleSave()}>{submitting && <Loader2 className="animate-spin" />}{isEditing ? "Guardar cambios" : "Crear evento"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>
}
