import { api } from "@/services/api.service"
import { auth } from "@/lib/firebase"

type PresignedUploadResponse = {
  presignedUrl: string
  publicUrl: string
  storageKey: string
}

type PresignedDownloadByKeyResponse = {
  url: string
}

type StorageFolder = "entities" | "scenes" | "storyboard-audio"

async function getAuthToken(): Promise<string | undefined> {
  return auth.currentUser?.getIdToken()
}

async function requestPresignedUpload(
  entityId: string,
  file: File,
  storageFolder: StorageFolder = "entities",
  existingImageUrl?: string,
): Promise<PresignedUploadResponse> {
  const token = await getAuthToken()

  const presignedRes = await fetch("/api/storage/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      entityId,
      filename: file.name,
      contentType: file.type,
      storageFolder,
      ...(existingImageUrl ? { existingImageUrl } : {}),
    }),
  })

  if (!presignedRes.ok) {
    const err = await presignedRes.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? "Failed to get upload URL")
  }

  const { presignedUrl, publicUrl, storageKey } =
    (await presignedRes.json()) as PresignedUploadResponse

  const uploadRes = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  })

  if (!uploadRes.ok) {
    throw new Error("Failed to upload file")
  }

  return { presignedUrl, publicUrl, storageKey }
}

async function requestPresignedDownloadByKey(
  storageKey: string,
): Promise<PresignedDownloadByKeyResponse> {
  return api.post<PresignedDownloadByKeyResponse>(
    "/storage/presigned-download-by-key",
    { storageKey },
  )
}

export async function resolveStorageKeyUrl(storageKey: string): Promise<string> {
  const { url } = await requestPresignedDownloadByKey(storageKey)
  return url
}

export async function uploadEntityImage(
  entityId: string,
  file: File,
): Promise<{ publicUrl: string; storageKey: string }> {
  const { publicUrl, storageKey } = await requestPresignedUpload(
    entityId,
    file,
  )

  return { publicUrl, storageKey }
}

export async function uploadSceneImage(
  sceneId: string,
  file: File,
): Promise<{ storageKey: string; url: string }> {
  const upload = await requestPresignedUpload(sceneId, file, "scenes")
  const url = await resolveStorageKeyUrl(upload.storageKey)

  return { storageKey: upload.storageKey, url }
}

export async function uploadStoryboardAudio(
  cardId: string,
  audio: Blob,
  filename: string,
  durationSeconds: number,
): Promise<void> {
  const file = new File([audio], filename, {
    type: audio.type || "audio/webm",
  })
  const { storageKey } = await requestPresignedUpload(
    cardId,
    file,
    "storyboard-audio",
  )

  await api.post(`/storyboard-cards/${cardId}/audio`, {
    audioStorageKey: storageKey,
    audioDurationSecs: durationSeconds,
  })
}
