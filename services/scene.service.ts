import { api } from "@/services/api.service"
import { resolveStorageKeyUrl } from "@/services/upload.service"
import type {
  SceneDocument,
  ProseMirrorJSON,
  SaveSceneResult,
  SaveSceneVersionResult,
  SceneVersionDocument,
  SceneVersionSummary,
} from "@/types/scene"

/**
 * Acceso a datos del contenido de capítulos.
 *
 * Contrato REST que cumple el backend:
 *
 *   GET    /scenes/:id          -> 200 SceneDocument
 *   PATCH  /scenes/:id          -> 200 { updatedAt, hash, contentChanged }
 *          body: { content: ProseMirrorJSON, wordCount: number }
 *
 * El backend calcula SHA-256 del texto plano de la escena/capítulo. Si el hash
 * no cambió respecto del guardado previo, responde `contentChanged: false` y NO
 * dispara procesos de IA. El editor envía SIEMPRE el documento completo (no deltas)
 * junto con el conteo de palabras derivado del texto plano.
 */

/** Extrae el texto plano de un documento ProseMirror (recursivo sobre nodos `text`). */
function extractPlainText(node: ProseMirrorJSON | null | undefined): string {
  if (!node) return ""
  if (node.type === "text") return node.text ?? ""
  if (!node.content) return ""
  return node.content.map(extractPlainText).join("")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function cloneNode<T>(node: T): T {
  return structuredClone(node)
}

function isLikelyStorageKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !/^https?:\/\//i.test(value) &&
    !value.startsWith("data:")
  )
}

function transformImageNodes(
  node: unknown,
  transform: (attrs: Record<string, unknown>) => Record<string, unknown>,
): unknown {
  if (Array.isArray(node)) {
    return node.map((child) => transformImageNodes(child, transform))
  }

  if (!isRecord(node)) {
    return node
  }

  const next: Record<string, unknown> = { ...node }

  if (Array.isArray(node.content)) {
    next.content = node.content.map((child) =>
      transformImageNodes(child, transform),
    )
  }

  if (node.type === "image") {
    const attrs = isRecord(node.attrs) ? { ...node.attrs } : {}
    next.attrs = transform(attrs)
  }

  return next
}

export function normalizeSceneContentForSave(
  content: ProseMirrorJSON | null | undefined,
): ProseMirrorJSON | null {
  if (!content) return content ?? null

  return transformImageNodes(content, (attrs) => {
    const storageKey = attrs.storageKey
    if (typeof storageKey !== "string" || storageKey.length === 0) {
      return attrs
    }

    return {
      ...attrs,
      src: storageKey,
    }
  }) as ProseMirrorJSON
}

export async function resolveSceneContentImages(
  content: ProseMirrorJSON | null | undefined,
): Promise<ProseMirrorJSON | null> {
  if (!content) return content ?? null

  const urlCache = new Map<string, Promise<string>>()

  const resolveKey = (storageKey: string): Promise<string> => {
    const cached = urlCache.get(storageKey)
    if (cached) return cached

    const promise = resolveStorageKeyUrl(storageKey)
    urlCache.set(storageKey, promise)
    return promise
  }

  const resolved = await (async function walk(
    node: unknown,
  ): Promise<unknown> {
    if (Array.isArray(node)) {
      return Promise.all(node.map((child) => walk(child)))
    }

    if (!isRecord(node)) {
      return node
    }

    const next: Record<string, unknown> = { ...node }

    if (Array.isArray(node.content)) {
      next.content = await Promise.all(node.content.map((child) => walk(child)))
    }

    if (node.type === "image") {
      const attrs = isRecord(node.attrs) ? { ...node.attrs } : {}
      const storageKey = isLikelyStorageKey(attrs.storageKey)
        ? attrs.storageKey
        : isLikelyStorageKey(attrs.src)
          ? attrs.src
          : null

      if (storageKey) {
        try {
          next.attrs = {
            ...attrs,
            src: await resolveKey(storageKey),
          }
        } catch {
          next.attrs = attrs
        }
      } else {
        next.attrs = attrs
      }
    }

    return next
  })(cloneNode(content))

  return resolved as ProseMirrorJSON
}

/** Cuenta palabras del documento (texto plano, separadas por espacios). */
export function countWords(content: ProseMirrorJSON | null | undefined): number {
  const text = extractPlainText(content).trim()
  return text ? text.split(/\s+/).length : 0
}

/** Carga perezosa de una escena (`GET /scenes/:id`). */
export async function getScene(id: string): Promise<SceneDocument> {
  return api.get<SceneDocument>(`/scenes/${id}`)
}

/**
 * Persiste el documento completo de la escena (`PATCH /scenes/:id`).
 * Envía también el `wordCount` derivado del texto plano.
 * Devuelve el nuevo hash y si el texto plano cambió (para decidir IA en el back).
 */
export async function saveScene(
  id: string,
  content: ProseMirrorJSON,
): Promise<SaveSceneResult> {
  const normalizedContent = normalizeSceneContentForSave(content)

  return api.patch<SaveSceneResult>(`/scenes/${id}`, {
    content: normalizedContent,
    wordCount: countWords(normalizedContent),
  })
}

export async function getSceneVersions(
  sceneId: string,
): Promise<SceneVersionSummary[]> {
  return api.get<SceneVersionSummary[]>(`/scenes/${sceneId}/versions`)
}

export async function createSceneVersion(
  sceneId: string,
  label?: string,
  content?: ProseMirrorJSON | null,
): Promise<SceneVersionDocument> {
  return api.post<SceneVersionDocument>(`/scenes/${sceneId}/versions`, {
    ...(label ? { label } : {}),
    ...(content
      ? {
          content: normalizeSceneContentForSave(content),
          wordCount: countWords(content),
        }
      : {}),
  })
}

export async function getSceneVersion(
  sceneId: string,
  versionId: string,
): Promise<SceneVersionDocument> {
  return api.get<SceneVersionDocument>(
    `/scenes/${sceneId}/versions/${versionId}`,
  )
}

export async function saveSceneVersion(
  sceneId: string,
  versionId: string,
  content: ProseMirrorJSON,
): Promise<SaveSceneVersionResult> {
  return api.patch<SaveSceneVersionResult>(
    `/scenes/${sceneId}/versions/${versionId}`,
    {
      content: normalizeSceneContentForSave(content),
      wordCount: countWords(content),
    },
  )
}

export async function renameSceneVersion(
  sceneId: string,
  versionId: string,
  label: string,
): Promise<SceneVersionDocument> {
  return api.patch<SceneVersionDocument>(
    `/scenes/${sceneId}/versions/${versionId}`,
    { label },
  )
}

export async function restoreSceneVersion(
  sceneId: string,
  versionId: string,
): Promise<SaveSceneResult> {
  return api.post<SaveSceneResult>(
    `/scenes/${sceneId}/versions/${versionId}/restore`,
    {},
  )
}

export async function deleteSceneVersion(
  sceneId: string,
  versionId: string,
): Promise<void> {
  return api.delete<void>(`/scenes/${sceneId}/versions/${versionId}`)
}
