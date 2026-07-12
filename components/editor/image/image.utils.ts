import {
  ALLOWED_EDITOR_IMAGE_MIME_TYPES,
  MAX_EDITOR_IMAGE_BYTES,
} from "./image.constants"

export function validateEditorImageFile(file: File): string | null {
  if (!ALLOWED_EDITOR_IMAGE_MIME_TYPES.has(file.type)) {
    return "Solo se permiten imagenes JPG, PNG, WEBP o AVIF."
  }

  if (file.size > MAX_EDITOR_IMAGE_BYTES) {
    return "La imagen no puede superar los 10 MB."
  }

  return null
}

export function getImageFileFromClipboard(
  event: ClipboardEvent,
): File | null {
  const clipboardItems = Array.from(event.clipboardData?.items ?? [])

  for (const item of clipboardItems) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) {
      continue
    }

    const file = item.getAsFile()
    if (file) {
      return file
    }
  }

  const firstFile = event.clipboardData?.files?.[0]
  if (firstFile?.type.startsWith("image/")) {
    return firstFile
  }

  return null
}

