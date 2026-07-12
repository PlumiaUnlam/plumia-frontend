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

async function getAuthToken(): Promise<string | undefined> {
  return auth.currentUser?.getIdToken()
}

async function requestPresignedUpload(
  entityId: string,
  file: File,
  storageFolder: "entities" | "scenes" = "entities",
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
    throw new Error("Failed to upload image")
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
  existingImageUrl?: string,
): Promise<string> {
  const { publicUrl } = await requestPresignedUpload(
    entityId,
    file,
    "entities",
    existingImageUrl,
  )

  return publicUrl
}

export async function uploadSceneImage(
  sceneId: string,
  file: File,
): Promise<{ storageKey: string; url: string }> {
  const upload = await requestPresignedUpload(sceneId, file, "scenes")
  const url = await resolveStorageKeyUrl(upload.storageKey)

  return { storageKey: upload.storageKey, url }
}
