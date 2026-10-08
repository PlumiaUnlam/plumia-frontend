import { api } from "@/services/api.service"

export const MAX_COVER_BYTES = 10 * 1024 * 1024
export const COVER_TYPES = ["image/jpeg", "image/png"] as const
export const COVER_ACCEPT = COVER_TYPES.join(",")
export type CoverType = (typeof COVER_TYPES)[number]

const RECOMMENDED_RATIO = 1.6
const RATIO_TOLERANCE = 0.15
const MIN_RECOMMENDED_SIDE = 1000

const COVER_ERRORS: Record<string, string> = {
  "Invalid cover storage key": "La imagen no corresponde a este libro.",
  "Cover image was not uploaded": "La imagen no llegó a subirse. Probá de nuevo.",
  "Cover image must be JPG or PNG": "La portada tiene que ser JPG o PNG.",
  "Cover image must be 10 MB or smaller": "La portada no puede superar los 10 MB.",
  "Book not found": "No se encontró el libro.",
}

/** Error ya redactado para el usuario. */
export class CoverError extends Error {}

function isCoverType(type: string): type is CoverType {
  return (COVER_TYPES as readonly string[]).includes(type)
}

export function validateCoverFile(file: File): CoverType {
  if (!isCoverType(file.type)) {
    throw new CoverError("La portada tiene que ser JPG o PNG.")
  }
  if (file.size > MAX_COVER_BYTES) {
    throw new CoverError("La portada no puede superar los 10 MB.")
  }
  return file.type
}

export function translateCoverError(error: unknown, fallback: string): string {
  if (error instanceof CoverError) return error.message
  if (error instanceof Error) return COVER_ERRORS[error.message] ?? fallback
  return fallback
}

export async function getBookCover(
  bookId: string,
  options: Pick<RequestInit, "signal"> = {},
): Promise<string | null> {
  const { coverUrl } = await api.get<{ coverUrl: string | null }>(
    `/books/${bookId}/cover`,
    options,
  )
  return coverUrl
}

export async function uploadBookCover(bookId: string, file: File): Promise<string> {
  const contentType = validateCoverFile(file)

  const { presignedUrl, storageKey } = await api.post<{
    presignedUrl: string
    storageKey: string
  }>(`/books/${bookId}/cover/upload-url`, { contentType })

  // Subida directa a R2: sin token ni base URL de la API, con el mismo Content-Type firmado.
  const upload = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  })
  if (!upload.ok) {
    throw new CoverError("No se pudo subir la imagen. Probá de nuevo.")
  }

  const { coverUrl } = await api.put<{ coverUrl: string }>(
    `/books/${bookId}/cover`,
    { storageKey },
  )
  return coverUrl
}

export async function removeBookCover(bookId: string): Promise<void> {
  await api.delete<void>(`/books/${bookId}/cover`)
}

/** Aviso (no bloqueante) si la imagen no se parece a una portada vertical 1:1,6. */
export async function getCoverDimensionWarning(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file)
  try {
    const { width, height } = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
        image.onerror = () => reject(new Error("No se pudo leer la imagen."))
        image.src = url
      },
    )
    if (!width || !height) return null

    const warnings: string[] = []
    if (width >= height) {
      warnings.push("la imagen es horizontal y las portadas son verticales")
    } else if (Math.abs(height / width - RECOMMENDED_RATIO) / RECOMMENDED_RATIO > RATIO_TOLERANCE) {
      warnings.push("la proporción se aleja de la recomendada (1:1,6)")
    }
    if (Math.max(width, height) < MIN_RECOMMENDED_SIDE) {
      warnings.push("la resolución es baja y puede verse pixelada")
    }
    if (warnings.length === 0) return null

    const detail = warnings.join("; ")
    return `${detail.charAt(0).toUpperCase()}${detail.slice(1)} (${width} × ${height} px). Recomendado: 1600 × 2560 px.`
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
