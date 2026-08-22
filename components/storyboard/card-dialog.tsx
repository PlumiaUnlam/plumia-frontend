"use client"

import { useCallback, useState } from "react"
import { Loader2, Mic, MicOff, RefreshCw, Square, Tag } from "lucide-react"

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
import { useVoiceTranscriber } from "@/hooks/use-voice-transcriber"
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

  const handleTranscript = useCallback((text: string) => {
    setDescription((current) =>
      current.trim() ? `${current.trim()} ${text}` : text,
    )
    setTitle((current) => current.trim() || voiceTitle(text))
  }, [])
  const {
    supported: voiceSupported,
    isRecording,
    isTranscribing,
    audioLevel,
    audioInputDevices,
    selectedAudioInputId,
    error: voiceError,
    start: startVoiceRecording,
    stop: stopVoiceRecording,
    selectAudioInput,
    refreshAudioInputDevices,
  } = useVoiceTranscriber({ onTranscript: handleTranscript })

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

        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Registrar por voz</p>
              <p className="text-xs text-muted-foreground">
                La transcripción se agregará a la descripción de la tarjeta.
              </p>
            </div>
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              disabled={
                !voiceSupported || isTranscribing || submitting
              }
              onClick={() => {
                if (isRecording) {
                  stopVoiceRecording()
                } else {
                  void startVoiceRecording()
                }
              }}
            >
              {isTranscribing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isRecording ? (
                <Square className="size-3.5 fill-current" />
              ) : voiceSupported ? (
                <Mic className="size-4" />
              ) : (
                <MicOff className="size-4" />
              )}
              {isTranscribing
                ? "Transcribiendo..."
                : isRecording
                  ? "Detener grabación"
                  : voiceSupported
                    ? "Grabar nota de voz"
                    : "Micrófono no disponible"}
            </Button>
          </div>
          {isRecording ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <div
                className="relative flex size-9 items-center justify-center rounded-full border border-primary/30 bg-primary/5"
                aria-label={`Nivel de audio: ${Math.round(audioLevel * 100)}%`}
                role="img"
              >
                <span
                  className="absolute inset-0 rounded-full bg-primary/20 transition-transform duration-75"
                  style={{
                    opacity: 0.35 + audioLevel * 0.65,
                    transform: `scale(${0.75 + audioLevel * 0.25})`,
                  }}
                />
                <Mic className="relative size-4 text-primary" />
              </div>
              <span>
                {audioLevel > 0.05
                  ? "Señal de audio detectada"
                  : "No se detecta señal; hablá cerca del micrófono"}
              </span>
            </div>
          ) : null}
          {voiceSupported && audioInputDevices.length > 0 ? (
            <div className="mt-3 flex items-center gap-2">
              <label
                className="text-xs text-muted-foreground"
                htmlFor="storyboard-audio-input"
              >
                Micrófono
              </label>
              <select
                id="storyboard-audio-input"
                className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                disabled={isRecording || isTranscribing || submitting}
                value={selectedAudioInputId}
                onChange={(event) => selectAudioInput(event.target.value)}
              >
                {audioInputDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Micrófono ${index + 1}`}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                disabled={isRecording || isTranscribing || submitting}
                onClick={() => void refreshAudioInputDevices()}
                title="Actualizar micrófonos"
                aria-label="Actualizar micrófonos"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          ) : null}
          {voiceError ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {voiceError}
            </p>
          ) : null}
        </div>

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
        <Button
          variant="outline"
          disabled={submitting || isRecording || isTranscribing}
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          disabled={
            !title.trim() || submitting || isRecording || isTranscribing
          }
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

function voiceTitle(text: string): string {
  const firstSentence = text.split(/[.!?]/u)[0]?.trim() ?? ""
  const title = firstSentence || text.trim()
  return title.slice(0, 200) || "Idea registrada por voz"
}
