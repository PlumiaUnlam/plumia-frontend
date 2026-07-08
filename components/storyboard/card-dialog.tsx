"use client"

import { useState } from "react"
import { Tag } from "lucide-react"

import { ChipEditor } from "@/components/storyboard/chip-editor"
import { EntitySelector } from "@/components/storyboard/entity-selector"
import type { CardDialogState } from "@/components/storyboard/storyboard-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type {
  CreateStoryboardCardInput,
  StoryboardCard,
} from "@/types/storyboard"
import type { Entity } from "@/types/entity"

type CardDialogProps = {
  state: CardDialogState
  entities: Entity[]
  submitting: boolean
  onClose: () => void
  onSave: (input: CreateStoryboardCardInput) => Promise<void>
}

export function CardDialog({
  state,
  entities,
  submitting,
  onClose,
  onSave,
}: CardDialogProps) {
  const card = state?.card ?? null

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-2xl">
        {state ? (
          <CardDialogForm
            key={card?.id ?? state.status}
            card={card}
            entities={entities}
            submitting={submitting}
            onClose={onClose}
            onSave={onSave}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type CardDialogFormProps = {
  card: StoryboardCard | null
  entities: Entity[]
  submitting: boolean
  onClose: () => void
  onSave: (input: CreateStoryboardCardInput) => Promise<void>
}

function CardDialogForm({
  card,
  entities,
  submitting,
  onClose,
  onSave,
}: CardDialogFormProps) {
  const [title, setTitle] = useState(card?.title ?? "")
  const [description, setDescription] = useState(card?.description ?? "")
  const [tags, setTags] = useState<string[]>(card?.tags ?? [])
  const [entityIds, setEntityIds] = useState<string[]>(card?.entityIds ?? [])
  const [tagInput, setTagInput] = useState("")

  const addValue = (
    value: string,
    values: string[],
    setValues: (values: string[]) => void,
    setInput: (value: string) => void,
  ) => {
    const trimmed = value.trim()
    if (!trimmed || values.includes(trimmed)) return
    setValues([...values, trimmed])
    setInput("")
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{card ? "Editar Tarjeta" : "Nueva Tarjeta"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        <Field>
          <FieldLabel htmlFor="storyboard-title">
            Título de la escena *
          </FieldLabel>
          <FieldContent>
            <Input
              id="storyboard-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej: La emboscada en el bosque"
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="storyboard-description">
            Descripción breve
          </FieldLabel>
          <FieldContent>
            <Textarea
              id="storyboard-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe qué ocurre en esta escena..."
              rows={4}
              className="resize-none"
            />
          </FieldContent>
        </Field>

        <ChipEditor
          label="Etiquetas narrativas"
          placeholder="Ej: Acción, Misterio..."
          values={tags}
          input={tagInput}
          icon={Tag}
          onInputChange={setTagInput}
          onAdd={() => addValue(tagInput, tags, setTags, setTagInput)}
          onRemove={(tag) => setTags(tags.filter((item) => item !== tag))}
        />

        <EntitySelector
          entities={entities}
          selectedEntityIds={entityIds}
          onChange={setEntityIds}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" disabled={submitting} onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!title.trim() || submitting}
          onClick={() => {
            void onSave({
              title: title.trim(),
              description: description.trim(),
              tags,
              entityIds,
              ...(card ? { status: card.status } : {}),
            })
          }}
        >
          {card ? "Guardar cambios" : "Crear tarjeta"}
        </Button>
      </DialogFooter>
    </>
  )
}
