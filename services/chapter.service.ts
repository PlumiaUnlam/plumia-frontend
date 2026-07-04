import { chapterContentMock } from "@/mocks/chapter-content.mock"
import type {
  ChapterDocument,
  ProseMirrorJSON,
  SaveChapterResult,
} from "@/types/chapter"

/**
 * Acceso a datos del contenido de capítulos.
 *
 * Contrato REST que el backend deberá cumplir (hoy respaldado por mocks):
 *
 *   GET  /api/chapters/:id          -> 200 ChapterDocument
 *   PUT  /api/chapters/:id          -> 200 { updatedAt, hash, contentChanged }
 *        body: { content: ProseMirrorJSON }
 *
 * El backend calcula SHA-256 del texto plano de la escena/capítulo. Si el hash
 * no cambió respecto del guardado previo, responde `contentChanged: false` y NO
 * dispara procesos de IA. El editor envía SIEMPRE el documento completo (no deltas).
 */

const SIMULATED_LATENCY_MS = 250

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Extrae el texto plano de un documento ProseMirror (recursivo sobre nodos `text`). */
function extractPlainText(node: ProseMirrorJSON | null | undefined): string {
  if (!node) return ""
  if (node.type === "text") return node.text ?? ""
  if (!node.content) return ""
  return node.content.map(extractPlainText).join("")
}

/** SHA-256 hexadecimal del texto plano. Simula el cálculo que hará el backend. */
async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** Carga perezosa de un capítulo (simula `GET /api/chapters/:id`). */
export async function getChapter(id: string): Promise<ChapterDocument> {
  await delay(SIMULATED_LATENCY_MS)

  const chapter = chapterContentMock[id]
  if (!chapter) {
    throw new Error(`Capítulo no encontrado: ${id}`)
  }

  // Aseguramos un hash inicial coherente al servir.
  if (!chapter.hash) {
    chapter.hash = await sha256(extractPlainText(chapter.content))
  }

  return { ...chapter }
}

/**
 * Persiste el documento completo del capítulo (simula `PUT /api/chapters/:id`).
 * Devuelve el nuevo hash y si el texto plano cambió (para decidir IA en el back).
 */
export async function saveChapter(
  id: string,
  content: ProseMirrorJSON,
): Promise<SaveChapterResult> {
  await delay(SIMULATED_LATENCY_MS)

  const chapter = chapterContentMock[id]
  if (!chapter) {
    throw new Error(`Capítulo no encontrado: ${id}`)
  }

  const newHash = await sha256(extractPlainText(content))
  const contentChanged = newHash !== chapter.hash
  const updatedAt = new Date().toISOString()

  // last-write-wins: sobrescribimos el documento guardado.
  chapter.content = content
  chapter.hash = newHash
  chapter.updatedAt = updatedAt

  return { updatedAt, hash: newHash, contentChanged }
}
