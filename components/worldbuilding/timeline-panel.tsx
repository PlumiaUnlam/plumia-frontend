"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  CalendarDays,
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
  timelineEventsMock,
  type TimelineEvent,
  type TimelineImpact,
} from "@/mocks/timeline.mock"
import type { Entity } from "@/types/entity"

type TimelinePanelProps = {
  entities: Entity[]
  newEventRequest: number
  createdEntity: { id: string; revision: number } | null
  onRequestCreateEntity: (canonicalName: string) => void
}

const impactLabels: Record<TimelineImpact, string> = {
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
}

const impactStyles: Record<TimelineImpact, string> = {
  high: "border-red-500 bg-red-50/70 dark:bg-red-950/20",
  medium: "border-amber-500 bg-amber-50/70 dark:bg-amber-950/20",
  low: "border-primary/45 bg-card",
}

function createEmptyEvent(): TimelineEvent {
  return {
    id: crypto.randomUUID(),
    date: "",
    temporalLabel: "",
    title: "",
    description: "",
    entityIds: [],
    arc: "",
    impact: "medium",
  }
}

export function TimelinePanel({
  entities,
  newEventRequest,
  createdEntity,
  onRequestCreateEntity,
}: TimelinePanelProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(timelineEventsMock)
  const [isParticipantFilterOpen, setIsParticipantFilterOpen] =
    useState(false)
  const [isArcFilterOpen, setIsArcFilterOpen] = useState(false)
  const [selectedImpacts, setSelectedImpacts] = useState<TimelineImpact[]>([
    "high",
    "medium",
    "low",
  ])
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [selectedArc, setSelectedArc] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    new Set(),
  )

  const entityById = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity])),
    [entities],
  )
  const participantEntities = useMemo(
    () => entities.filter((entity) => entity.type === "CHARACTER"),
    [entities],
  )
  const arcs = useMemo(
    () => [...new Set(events.map((event) => event.arc).filter(Boolean))],
    [events],
  )
  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          selectedImpacts.includes(event.impact) &&
          (!selectedEntityId ||
            event.entityIds.includes(selectedEntityId)) &&
          (!selectedArc || event.arc === selectedArc),
      ),
    [events, selectedArc, selectedEntityId, selectedImpacts],
  )

  useEffect(() => {
    if (newEventRequest > 0) {
      setEditingEvent(createEmptyEvent())
      setIsDialogOpen(true)
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
    setSelectedArc(null)
    setSelectedImpacts(["high", "medium", "low"])
  }

  const saveEvent = (event: TimelineEvent) => {
    setEvents((current) => {
      const exists = current.some((currentEvent) => currentEvent.id === event.id)
      return exists
        ? current.map((currentEvent) =>
            currentEvent.id === event.id ? event : currentEvent,
          )
        : [...current, event]
    })
    setIsDialogOpen(false)
    setEditingEvent(null)
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
              value={selectedArc ?? ""}
              onChange={(event) => setSelectedArc(event.target.value || null)}
            >
              <option value="">Todos los arcos</option>
              {arcs.map((arc) => (
                <option key={arc} value={arc}>
                  {arc}
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
                    onDelete={() => setEvents((current) => current.filter((currentEvent) => currentEvent.id !== event.id))}
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
          <p className="mt-4 text-base leading-relaxed text-foreground/90">{event.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {characters.map((entity) => <Badge key={entity.id} variant="secondary" className="h-7 gap-1.5 bg-primary/10 px-3 text-sm text-primary"><Users /> {entity.canonicalName}</Badge>)}
            {locations.map((entity) => <Badge key={entity.id} variant="secondary" className="h-7 gap-1.5 bg-emerald-100 px-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{entity.canonicalName}</Badge>)}
          </div>
          {event.arc && <p className="mt-4 flex items-center gap-2 text-sm font-medium text-primary/75"><Zap className="size-4" /> Arco: {event.arc}</p>}
        </>
      )}
    </article>
  )
}

function TimelineEventDialog({ entities, createdEntity, event, open, onRequestCreateEntity, onOpenChange, onSave }: { entities: Entity[]; createdEntity: TimelinePanelProps["createdEntity"]; event: TimelineEvent | null; open: boolean; onRequestCreateEntity: TimelinePanelProps["onRequestCreateEntity"]; onOpenChange: (open: boolean) => void; onSave: (event: TimelineEvent) => void }) {
  const [draft, setDraft] = useState<TimelineEvent | null>(null)
  const displayedDraft = draft ?? event

  useEffect(() => {
    if (open) setDraft(event)
  }, [event, open])

  useEffect(() => {
    if (!open || !createdEntity) return

    setDraft((current) => {
      const base = current ?? event
      if (!base || base.entityIds.includes(createdEntity.id)) return base
      return { ...base, entityIds: [...base.entityIds, createdEntity.id] }
    })
  }, [createdEntity, event, open])

  if (!displayedDraft) return null

  const updateDraft = (changes: Partial<TimelineEvent>) => setDraft((current) => ({ ...(current ?? event ?? createEmptyEvent()), ...changes }))
  const isEditing = event ? eventsTitle(event.id) === "Editar" : false

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto sm:max-w-4xl">
          <DialogHeader className="border-b px-9 py-7"><DialogTitle className="text-2xl font-semibold">{isEditing ? "Editar Evento" : "Nuevo Evento"}</DialogTitle></DialogHeader>
          <div className="space-y-6 px-9 py-9">
            <FormField label="Nombre del evento *" htmlFor="timeline-title"><Input id="timeline-title" value={displayedDraft.title} onChange={(event) => updateDraft({ title: event.target.value })} placeholder="Ej: Desaparición de Tomás Reyes" /></FormField>
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField label="Fecha" htmlFor="timeline-date"><Input id="timeline-date" value={displayedDraft.date} onChange={(event) => updateDraft({ date: event.target.value })} placeholder="Ej: 1847-03-15" /></FormField>
              <FormField label="Período" htmlFor="timeline-period"><Input id="timeline-period" value={displayedDraft.temporalLabel} onChange={(event) => updateDraft({ temporalLabel: event.target.value })} placeholder="Ej: Primavera de 1847" /></FormField>
            </div>
            <FormField label="Descripción" htmlFor="timeline-description"><Textarea id="timeline-description" value={displayedDraft.description} onChange={(event) => updateDraft({ description: event.target.value })} placeholder="Describe qué ocurre en este evento..." rows={5} /></FormField>
            <div className="space-y-3">
              <Label>Impacto narrativo</Label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(impactLabels) as TimelineImpact[]).map((impact) => <Button key={impact} type="button" variant="outline" className={displayedDraft.impact === impact ? "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" : ""} onClick={() => updateDraft({ impact })}>{impactLabels[impact]}</Button>)}
              </div>
            </div>
            <div className="space-y-3">
              <Label>Entidades involucradas</Label>
              <EntitySelector
                entities={entities}
                label=""
                selectedEntityIds={displayedDraft.entityIds}
                onChange={(entityIds) => updateDraft({ entityIds })}
                onCreateEntity={onRequestCreateEntity}
              />
            </div>
          </div>
          <DialogFooter className="px-9 py-5"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!displayedDraft.title.trim()} onClick={() => onSave(displayedDraft)}>{isEditing ? "Guardar cambios" : "Crear evento"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>
}

function eventsTitle(id: string) {
  return ["tomas", "first", "codex", "alliance"].some((prefix) => id.startsWith(prefix)) ? "Editar" : "Nuevo"
}
