import { api } from "@/services/api.service"
import type {
  SceneDocument,
  ProseMirrorJSON,
  SaveSceneResult,
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
  return api.patch<SaveSceneResult>(`/scenes/${id}`, {
    content,
    wordCount: countWords(content),
  })
}
