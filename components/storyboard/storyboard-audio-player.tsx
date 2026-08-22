"use client"

import { useRef, useState } from "react"
import { Loader2, Pause, Volume2 } from "lucide-react"

import { getStoryboardAudioUrl } from "@/services/storyboard.service"

type StoryboardAudioPlayerProps = {
  cardId: string
  durationSeconds: number | null
}

export function StoryboardAudioPlayer({
  cardId,
  durationSeconds,
}: StoryboardAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (loading) return

    setError(null)
    if (audioUrl && audio) {
      if (audio.paused) {
        await audio.play().catch(() => {
          setError("No se pudo reproducir el audio.")
        })
      } else {
        audio.pause()
      }
      return
    }

    setLoading(true)
    try {
      const response = await getStoryboardAudioUrl(cardId)
      if (!audio) throw new Error("Audio element is not ready")
      audio.src = response.url
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
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="size-3.5" />
        ) : (
          <Volume2 className="size-3.5" />
        )}
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
          setIsPlaying(false)
          setError("No se pudo reproducir el audio.")
        }}
      />
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, "0")}`
}
