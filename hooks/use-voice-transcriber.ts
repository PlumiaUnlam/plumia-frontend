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
  onTranscript: (text: string, recording: VoiceRecording) => void
}

export type VoiceRecording = {
  audio: Blob
  filename: string
  durationSeconds: number
}

type UseVoiceTranscriberResult = {
  supported: boolean
  isRecording: boolean
  isTranscribing: boolean
  audioLevel: number
  audioInputDevices: AudioInputDevice[]
  selectedAudioInputId: string
  error: string | null
  start: () => Promise<void>
  stop: () => void
  selectAudioInput: (deviceId: string) => void
  refreshAudioInputDevices: () => Promise<void>
  clearError: () => void
}

export type AudioInputDevice = {
  deviceId: string
  label: string
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
  const [audioLevel, setAudioLevel] = useState(0)
  const [audioInputDevices, setAudioInputDevices] = useState<
    AudioInputDevice[]
  >([])
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hasAudioSignalRef = useRef(false)
  const recordingStartedAtRef = useRef<number | null>(null)
  const onTranscriptRef = useRef(onTranscript)

  const refreshAudioInputDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices
        .filter((device) => device.kind === "audioinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Micrófono ${index + 1}`,
        }))
        .filter((device) => device.deviceId)

      setAudioInputDevices(inputs)
      setSelectedAudioInputId((current) =>
        inputs.some((device) => device.deviceId === current)
          ? current
          : inputs[0]?.deviceId ?? "",
      )
    } catch {
      // El selector es opcional; la grabación puede seguir usando el micrófono predeterminado.
    }
  }, [])

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    if (!supported || !navigator.mediaDevices?.enumerateDevices) return

    const initialRefreshId = window.setTimeout(
      () => void refreshAudioInputDevices(),
      0,
    )
    const handleDeviceChange = () => void refreshAudioInputDevices()
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange)

    return () => {
      window.clearTimeout(initialRefreshId)
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      )
    }
  }, [refreshAudioInputDevices, supported])

  const stopAudioMonitor = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    analyserRef.current = null
    const audioContext = audioContextRef.current
    audioContextRef.current = null
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close()
    }
    setAudioLevel(0)
  }, [])

  const startAudioMonitor = useCallback(async (stream: MediaStream) => {
    const AudioContextConstructor = getAudioContextConstructor()
    if (!AudioContextConstructor) return

    try {
      const audioContext = new AudioContextConstructor()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.75
      const source = audioContext.createMediaStreamSource(stream)
      const silentOutput = audioContext.createGain()
      silentOutput.gain.value = 0
      source.connect(analyser)
      // Mantiene activo el grafo de audio sin reproducir la voz por los parlantes.
      analyser.connect(silentOutput)
      silentOutput.connect(audioContext.destination)
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      if (audioContext.state === "suspended") {
        await audioContext.resume()
      }

      if (audioContextRef.current !== audioContext) return

      const samples = new Uint8Array(analyser.fftSize)
      const updateLevel = () => {
        if (audioContext.state === "closed") return

        analyser.getByteTimeDomainData(samples)
        let sum = 0
        for (const sample of samples) {
          const normalizedSample = (sample - 128) / 128
          sum += normalizedSample * normalizedSample
        }
        const rms = Math.sqrt(sum / samples.length)
        const level = Math.min(1, Math.max(0, (rms - 0.01) * 6))
        if (level > 0.03) hasAudioSignalRef.current = true
        setAudioLevel(level)
        animationFrameRef.current = window.requestAnimationFrame(updateLevel)
      }

      updateLevel()
    } catch {
      stopAudioMonitor()
    }
  }, [stopAudioMonitor])

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null
        recorder.onerror = null
        recorder.onstop = null
        recorder.stop()
      }
      stopAudioMonitor()
      stopStream(streamRef.current)
      recorderRef.current = null
      streamRef.current = null
    }
  }, [stopAudioMonitor])

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
    if (!window.isSecureContext) {
      setError(
        "El micrófono requiere HTTPS o localhost. Abrí la aplicación desde http://localhost:3001.",
      )
      return
    }

    setError(null)
    setAudioLevel(0)
    hasAudioSignalRef.current = false
    let stream: MediaStream
    try {
      const audioConstraints: MediaTrackConstraints = {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      }
      if (selectedAudioInputId) {
        audioConstraints.deviceId = { exact: selectedAudioInputId }
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      })
    } catch (captureError: unknown) {
      setError(captureErrorMessage(captureError))
      return
    }

    const activeDeviceId = stream.getAudioTracks()[0]?.getSettings().deviceId
    if (activeDeviceId) setSelectedAudioInputId(activeDeviceId)
    void refreshAudioInputDevices()

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
      stopAudioMonitor()
      stopStream(stream)
      recorderRef.current = null
      streamRef.current = null
      setIsRecording(false)
      setError("Se produjo un error al grabar el audio.")
    }
    recorder.onstop = () => {
      const audioType = recorder.mimeType || mimeType || "audio/webm"
      const audio = new Blob(chunksRef.current, { type: audioType })
      const hadAudioSignal = hasAudioSignalRef.current
      const startedAt = recordingStartedAtRef.current
      const durationSeconds = Math.max(
        1,
        Math.round(((performance.now() - (startedAt ?? performance.now())) / 1000)),
      )
      const recording: VoiceRecording = {
        audio,
        filename: audioFilename(audioType),
        durationSeconds,
      }
      chunksRef.current = []
      recordingStartedAtRef.current = null
      recorderRef.current = null
      streamRef.current = null
      stopAudioMonitor()
      stopStream(stream)
      setIsRecording(false)

      if (audio.size === 0) {
        hasAudioSignalRef.current = false
        setError("No se pudo obtener audio del micrófono.")
        return
      }

      setIsTranscribing(true)
      void transcribeAudio(audio, recording.filename)
        .then((result) => {
          const text = result.text.trim()
          if (!text) {
            setError(noVoiceMessage(hadAudioSignal))
            return
          }
          onTranscriptRef.current(text, recording)
        })
        .catch((transcriptionError: unknown) => {
          setError(errorMessage(transcriptionError, hadAudioSignal))
        })
        .finally(() => {
          hasAudioSignalRef.current = false
          setIsTranscribing(false)
        })
    }

    try {
      recorder.start()
      recordingStartedAtRef.current = performance.now()
      void startAudioMonitor(stream)
      setIsRecording(true)
    } catch {
      stopAudioMonitor()
      recorderRef.current = null
      streamRef.current = null
      stopStream(stream)
      setError("No se pudo iniciar la grabación de audio.")
    }
  }, [
    isRecording,
    isTranscribing,
    refreshAudioInputDevices,
    selectedAudioInputId,
    startAudioMonitor,
    stopAudioMonitor,
  ])

  const clearError = useCallback(() => setError(null), [])

  return {
    supported,
    isRecording,
    isTranscribing,
    audioLevel,
    audioInputDevices,
    selectedAudioInputId,
    error,
    start,
    stop,
    selectAudioInput: setSelectedAudioInputId,
    refreshAudioInputDevices,
    clearError,
  }
}

function getAudioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  )
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
    if (error.name === "OverconstrainedError") {
      return "El micrófono seleccionado ya no está disponible. Elegí otro e intentá nuevamente."
    }
  }
  return "No se pudo acceder al micrófono."
}

function errorMessage(error: unknown, hadAudioSignal: boolean): string {
  const message = error instanceof Error ? error.message.trim() : ""
  if (message.includes("No se detectó voz")) {
    return noVoiceMessage(hadAudioSignal)
  }
  if (message) return message
  return "No se pudo transcribir la grabación."
}

function noVoiceMessage(hadAudioSignal: boolean): string {
  return hadAudioSignal
    ? "El micrófono recibió audio, pero Whisper no detectó palabras. Probá hablar más cerca y durante unos segundos."
    : "No se detectó señal del micrófono. Revisá el micrófono seleccionado y sus permisos."
}
