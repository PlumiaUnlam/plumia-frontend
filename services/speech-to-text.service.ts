import { api } from "@/services/api.service"

const TRANSCRIPTION_TIMEOUT_MS = 60 * 1000

export type SpeechToTextResponse = {
  text: string
  language?: string
}

export function transcribeAudio(
  audio: Blob,
  filename = "voice-note.webm",
  signal?: AbortSignal,
): Promise<SpeechToTextResponse> {
  const formData = new FormData()
  formData.append("audio", audio, filename)
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    TRANSCRIPTION_TIMEOUT_MS,
  )
  const abortFromCaller = () => controller.abort()

  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener("abort", abortFromCaller, { once: true })
    }
  }

  return api
    .postFormData<SpeechToTextResponse>(
      "/speech-to-text/transcribe",
      formData,
      { signal: controller.signal },
    )
    .finally(() => {
      clearTimeout(timeoutId)
      signal?.removeEventListener("abort", abortFromCaller)
    })
}
