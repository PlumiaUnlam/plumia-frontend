"use client"

import { useRef, useState } from "react"
import type { ReactNode } from "react"
import { Loader2, Pause, Volume2 } from "lucide-react"

import { getStoryboardAudioUrl } from "@/services/storyboard.service"

const AUDIO_URL_TTL_MS = 10 * 60 * 1000

type StoryboardAudioPlayerProps = Readonly<{
  cardId: string
  durationSeconds: number | null
  transcript: string
}>

export function StoryboardAudioPlayer({
  cardId,
  durationSeconds,
  transcript,
}: StoryboardAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioUrlFetchedAtRef = useRef<number | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const captionTrackUrl = createCaptionTrackUrl(transcript, durationSeconds)

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (loading) return

    setError(null)
    if (audioUrl && audio && !audio.paused) {
      audio.pause()
      return
    }

    const audioUrlFetchedAt = audioUrlFetchedAtRef.current
    const hasFreshAudioUrl =
      Boolean(audioUrl) &&
      audioUrlFetchedAt !== null &&
      Date.now() - audioUrlFetchedAt < AUDIO_URL_TTL_MS

    if (hasFreshAudioUrl && audio) {
      await audio.play().catch(() => {
        setError("No se pudo reproducir el audio.")
      })
      return
    }

    setLoading(true)
    try {
      const response = await getStoryboardAudioUrl(cardId)
      if (!audio) throw new Error("Audio element is not ready")
      audio.src = response.url
      audioUrlFetchedAtRef.current = Date.now()
      setAudioUrl(response.url)
      await audio.play()
    } catch {
      setError("No se pudo cargar el audio.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-wait disabled:opacity-60"
        onClick={(event) => {
          event.stopPropagation()
          void togglePlayback()
        }}
        disabled={loading}
        aria-label={isPlaying ? "Pausar audio" : "Escuchar audio"}
      >
        {getPlaybackIcon(loading, isPlaying)}
        {isPlaying ? "Pausar audio" : "Escuchar audio"}
      </button>
      {durationSeconds ? (
        <span className="text-xs text-muted-foreground">
          {formatDuration(durationSeconds)}
        </span>
      ) : null}
      <audio
        ref={audioRef}
        className={
          audioUrl ? "h-7 min-w-[180px] max-w-full" : "sr-only"
        }
        controls={Boolean(audioUrl)}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setAudioUrl(null)
          audioUrlFetchedAtRef.current = null
          setIsPlaying(false)
          setError("No se pudo reproducir el audio.")
        }}
      >
        <track
          kind="captions"
          src={captionTrackUrl}
          srcLang="es"
          label="Transcripción"
          default
        />
      </audio>
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

function formatDuration(seconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(roundedSeconds / 60)
  const remainder = roundedSeconds % 60
  return `${minutes}:${String(remainder).padStart(2, "0")}`
}

function getPlaybackIcon(loading: boolean, isPlaying: boolean): ReactNode {
  if (loading) return <Loader2 className="size-3.5 animate-spin" />
  if (isPlaying) return <Pause className="size-3.5" />
  return <Volume2 className="size-3.5" />
}

function createCaptionTrackUrl(
  transcript: string,
  durationSeconds: number | null,
): string {
  const duration = Math.max(durationSeconds ?? 1, 1)
  const cue = `WEBVTT\n\n00:00:00.000 --> ${formatVttTimestamp(duration)}\n${transcript.trim() || "Transcripción no disponible."}`
  return `data:text/vtt;charset=utf-8,${encodeURIComponent(cue)}`
}

function formatVttTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.000`
}
