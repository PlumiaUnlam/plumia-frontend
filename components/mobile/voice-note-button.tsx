"use client"

import { useCallback, useState } from "react"
import { Loader2, Mic, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  useVoiceTranscriber,
  type VoiceRecording,
} from "@/hooks/use-voice-transcriber"

type VoiceNoteButtonProps = {
  /** Recibe la transcripción y el audio. Si falla, debe avisar al usuario por su cuenta. */
  onNote: (text: string, recording: VoiceRecording) => Promise<void>
  disabled?: boolean
}

export function formatRecordingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

/**
 * Botón flotante para dejar una nota por voz con un toque: toca para grabar,
 * toca de nuevo para detener; se transcribe y se entrega a `onNote`.
 */
export function VoiceNoteButton({
  onNote,
  disabled = false,
}: Readonly<VoiceNoteButtonProps>) {
  const [isSaving, setIsSaving] = useState(false)

  const handleTranscript = useCallback(
    (text: string, recording: VoiceRecording) => {
      setIsSaving(true)
      void onNote(text, recording).finally(() => setIsSaving(false))
    },
    [onNote],
  )
  const {
    supported,
    isRecording,
    isTranscribing,
    audioLevel,
    recordingDurationSeconds,
    error,
    start,
    stop,
    clearError,
  } = useVoiceTranscriber({ onTranscript: handleTranscript })

  const isBusy = isTranscribing || isSaving
  let status = "Nota por voz"
  if (isRecording) status = `Grabando ${formatRecordingTime(recordingDurationSeconds)}`
  else if (isTranscribing) status = "Transcribiendo…"
  else if (isSaving) status = "Guardando…"

  const handleClick = () => {
    if (isRecording) {
      stop()
      return
    }
    clearError()
    void start()
  }

  return (
    <div className="fixed bottom-[4.5rem] right-4 z-30 flex flex-col items-end gap-2 md:hidden">
      {error ? (
        <p
          role="alert"
          className="max-w-64 rounded-lg border border-destructive/30 bg-background px-3 py-2 text-xs text-destructive shadow-md"
        >
          {error}
        </p>
      ) : null}
      {supported ? null : (
        <p className="max-w-64 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground shadow-md">
          Este navegador no permite grabar audio.
        </p>
      )}
      <Button
        type="button"
        size="lg"
        variant={isRecording ? "destructive" : "default"}
        className="h-12 rounded-full px-5 shadow-lg"
        disabled={!supported || isBusy || disabled}
        aria-label={isRecording ? "Detener y guardar la nota" : "Grabar nota por voz"}
        onClick={handleClick}
      >
        {isBusy ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          <RecordIcon recording={isRecording} level={audioLevel} />
        )}
        <span aria-live="polite">{status}</span>
      </Button>
    </div>
  )
}

function RecordIcon({
  recording,
  level,
}: Readonly<{ recording: boolean; level: number }>) {
  if (!recording) return <Mic className="size-5" aria-hidden />
  return (
    <Square
      className="size-4 fill-current"
      style={{ transform: `scale(${1 + Math.min(level, 1) * 0.35})` }}
      aria-hidden
    />
  )
}
