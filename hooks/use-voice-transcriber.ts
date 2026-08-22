"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

import { transcribeAudio } from "@/services/speech-to-text.service"

type UseVoiceTranscriberOptions = {
  onTranscript: (text: string) => void
}

type UseVoiceTranscriberResult = {
  supported: boolean
  isRecording: boolean
  isTranscribing: boolean
  error: string | null
  start: () => Promise<void>
  stop: () => void
  clearError: () => void
}

const AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
]

const subscribeToVoiceSupport = () => () => undefined
const getVoiceSupportSnapshot = () =>
  typeof window !== "undefined" &&
  typeof MediaRecorder !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia)
const getServerVoiceSupportSnapshot = () => false

export function useVoiceTranscriber({
  onTranscript,
}: UseVoiceTranscriberOptions): UseVoiceTranscriberResult {
  const supported = useSyncExternalStore(
    subscribeToVoiceSupport,
    getVoiceSupportSnapshot,
    getServerVoiceSupportSnapshot,
  )
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null
        recorder.onerror = null
        recorder.onstop = null
        recorder.stop()
      }
      stopStream(streamRef.current)
      recorderRef.current = null
      streamRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === "inactive") return
    recorder.stop()
  }, [])

  const start = useCallback(async () => {
    if (isRecording || isTranscribing) return
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("Este navegador no permite grabar audio.")
      return
    }

    setError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (captureError: unknown) {
      setError(captureErrorMessage(captureError))
      return
    }

    const mimeType = AUDIO_MIME_TYPES.find((value) =>
      MediaRecorder.isTypeSupported(value),
    )
    let recorder: MediaRecorder
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
    } catch {
      stopStream(stream)
      setError("No se pudo iniciar la grabación de audio.")
      return
    }

    chunksRef.current = []
    streamRef.current = stream
    recorderRef.current = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onerror = () => {
      stopStream(stream)
      recorderRef.current = null
      streamRef.current = null
      setIsRecording(false)
      setError("Se produjo un error al grabar el audio.")
    }
    recorder.onstop = () => {
      const audioType = recorder.mimeType || mimeType || "audio/webm"
      const audio = new Blob(chunksRef.current, { type: audioType })
      chunksRef.current = []
      recorderRef.current = null
      streamRef.current = null
      stopStream(stream)
      setIsRecording(false)

      if (audio.size === 0) {
        setError("No se pudo obtener audio del micrófono.")
        return
      }

      setIsTranscribing(true)
      void transcribeAudio(audio, audioFilename(audioType))
        .then((result) => {
          const text = result.text.trim()
          if (!text) {
            setError("No se detectó voz en la grabación.")
            return
          }
          onTranscriptRef.current(text)
        })
        .catch((transcriptionError: unknown) => {
          setError(errorMessage(transcriptionError))
        })
        .finally(() => setIsTranscribing(false))
    }

    try {
      recorder.start()
      setIsRecording(true)
    } catch {
      recorderRef.current = null
      streamRef.current = null
      stopStream(stream)
      setError("No se pudo iniciar la grabación de audio.")
    }
  }, [isRecording, isTranscribing])

  const clearError = useCallback(() => setError(null), [])

  return {
    supported,
    isRecording,
    isTranscribing,
    error,
    start,
    stop,
    clearError,
  }
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

function audioFilename(mimeType: string): string {
  if (mimeType.includes("ogg")) return "voice-note.ogg"
  if (mimeType.includes("mp4")) return "voice-note.m4a"
  return "voice-note.webm"
}

function captureErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Necesito permiso para usar el micrófono. Habilitalo en el navegador e intentá nuevamente."
    }
    if (error.name === "NotFoundError") {
      return "No se encontró un micrófono disponible."
    }
    if (error.name === "NotReadableError") {
      return "El micrófono está siendo usado por otra aplicación."
    }
  }
  return "No se pudo acceder al micrófono."
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  return "No se pudo transcribir la grabación."
}
