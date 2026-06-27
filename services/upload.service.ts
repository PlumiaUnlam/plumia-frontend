import { auth } from "@/lib/firebase"

export async function uploadEntityImage(
  entityId: string,
  file: File,
  existingImageUrl?: string,
): Promise<string> {
  const token = await auth.currentUser?.getIdToken()

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
      ...(existingImageUrl ? { existingImageUrl } : {}),
    }),
  })

  if (!presignedRes.ok) {
    const err = await presignedRes.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? "Failed to get upload URL")
  }

  const { presignedUrl, publicUrl } = await presignedRes.json() as {
    presignedUrl: string
    publicUrl: string
  }

  const uploadRes = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  })

  if (!uploadRes.ok) {
    throw new Error("Failed to upload image")
  }

  return publicUrl
}
