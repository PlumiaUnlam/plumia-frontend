import { api } from "@/services/api.service"

export type SpeechToTextResponse = {
  text: string
  language?: string
}

export function transcribeAudio(
  audio: Blob,
  filename = "voice-note.webm",
): Promise<SpeechToTextResponse> {
  const formData = new FormData()
  formData.append("audio", audio, filename)
  return api.postFormData<SpeechToTextResponse>(
    "/speech-to-text/transcribe",
    formData,
  )
}
