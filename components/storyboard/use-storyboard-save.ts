"use client"

import { useState } from "react"
import { toast } from "sonner"

import type { CardDialogState } from "@/components/storyboard/storyboard-types"
import type { VoiceRecording } from "@/hooks/use-voice-transcriber"
import { voiceTitle } from "@/lib/voice-title"
import {
  createStoryboardCard,
  updateStoryboardCard,
} from "@/services/storyboard.service"
import { uploadStoryboardAudio } from "@/services/upload.service"
import type {
  CreateStoryboardCardInput,
  StoryboardCard,
  StoryboardCardStatus,
} from "@/types/storyboard"

const LIST_REFRESH_ERROR =
  "La tarjeta se guardó, pero no se pudo actualizar la lista. Recargá la página para verla."

type PendingAudio = { cardId: string; recording: VoiceRecording }

function audioUploadErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message.trim() : ""
  return detail
    ? `La tarjeta se guardó, pero no se pudo guardar la nota de voz: ${detail}`
    : "La tarjeta se guardó, pero no se pudo guardar la nota de voz."
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

/** La grabación nueva gana; si no hay, se reintenta la que falló para esta misma tarjeta. */
function pickAudio(
  recording: VoiceRecording | undefined,
  pending: PendingAudio | null,
  cardId: string | undefined,
) {
  if (recording) return recording
  return pending && pending.cardId === cardId ? pending.recording : undefined
}

async function saveCard(
  projectId: string,
  dialogState: NonNullable<CardDialogState>,
  input: CreateStoryboardCardInput,
  audio: VoiceRecording | undefined,
) {
  const savedCard = dialogState.card
    ? await updateStoryboardCard(dialogState.card.id, input)
    : await createStoryboardCard(projectId, {
        ...input,
        status: dialogState.status,
      })
  const audioError = audio ? await tryUploadAudio(savedCard.id, audio) : null
  return { savedCard, audioError }
}

async function refreshCards(mutate: () => Promise<unknown>) {
  try {
    await mutate()
    return true
  } catch {
    return false
  }
}

type UseStoryboardSaveOptions = Readonly<{
  projectId: string
  dialogState: CardDialogState
  submitting: boolean
  setSubmitting: (submitting: boolean) => void
  setDialogState: (state: CardDialogState) => void
  setMobileStatus: (status: StoryboardCardStatus) => void
  mutate: () => Promise<unknown>
}>

/**
 * Guardado de tarjetas y notas de voz. Crear la tarjeta, subir su audio y
 * refrescar la lista son pasos independientes: un fallo posterior nunca invita a
 * repetir la creación, y la grabación se conserva para reintentar solo el audio.
 */
export function useStoryboardSave({
  projectId,
  dialogState,
  submitting,
  setSubmitting,
  setDialogState,
  setMobileStatus,
  mutate,
}: UseStoryboardSaveOptions) {
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null)

  const closeDialog = () => {
    setPendingAudio(null)
    setDialogState(null)
  }

  const handleSave = async (
    input: CreateStoryboardCardInput,
    recording?: VoiceRecording,
  ) => {
    if (!dialogState || submitting) return

    setSubmitting(true)
    setSaveError(null)
    try {
      const audio = pickAudio(recording, pendingAudio, dialogState.card?.id)
      const { savedCard, audioError } = await saveCard(
        projectId,
        dialogState,
        input,
        audio,
      )
      const listRefreshed = await refreshCards(mutate)

      if (audioError && audio) {
        // La tarjeta ya existe: el diálogo sigue abierto sobre ella para reintentar el audio.
        setPendingAudio({ cardId: savedCard.id, recording: audio })
        setDialogState({ card: savedCard, status: savedCard.status })
        setSaveError(`${audioError} Volvé a guardar para reintentar.`)
        return
      }
      closeDialog()
      if (!listRefreshed) setSaveError(LIST_REFRESH_ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  const reportVoiceNoteAudio = async (
    card: StoryboardCard,
    recording: VoiceRecording,
  ) => {
    const audioError = await tryUploadAudio(card.id, recording)
    if (audioError) {
      toast.warning(audioError, {
        action: {
          label: "Reintentar",
          onClick: () => void reportVoiceNoteAudio(card, recording),
        },
      })
      return
    }
    toast.success("Nota guardada en Ideas", {
      action: {
        label: "Editar",
        onClick: () => setDialogState({ card, status: card.status }),
      },
    })
  }

  const handleVoiceNote = async (text: string, recording: VoiceRecording) => {
    let card: StoryboardCard
    try {
      card = await createStoryboardCard(projectId, {
        title: voiceTitle(text),
        description: text,
        tags: [],
        entityIds: [],
        status: "ideas",
      })
    } catch {
      toast.error("No se pudo guardar la nota. Intentá de nuevo.")
      return
    }

    setMobileStatus("ideas")
    await reportVoiceNoteAudio(card, recording)
    if (!(await refreshCards(mutate))) toast.warning(LIST_REFRESH_ERROR)
  }

  return { saveError, closeDialog, handleSave, handleVoiceNote }
}
