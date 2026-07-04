import type { JSONContent } from "@tiptap/react"

/**
 * Documento ProseMirror serializado (lo que devuelve `editor.getJSON()`).
 * Es el formato canónico de persistencia del contenido del capítulo.
 */
export type ProseMirrorJSON = JSONContent

/**
 * Capítulo completo tal como lo entrega/recibe el backend.
 * Unidad de carga y guardado del editor (por ahora el capítulo es tratado
 * como una escena 1:1; migrable a Escena más adelante).
 */
export type ChapterDocument = {
  id: string
  title: string
  /** Documento completo del capítulo en ProseMirror JSON. */
  content: ProseMirrorJSON | null
  /** ISO timestamp del último guardado. */
  updatedAt: string
  /** SHA-256 del texto plano (lo calcula el backend). */
  hash: string
}

/** Respuesta del backend al persistir el contenido de un capítulo. */
export type SaveChapterResult = {
  updatedAt: string
  hash: string
  /**
   * `false` si el SHA-256 del texto plano no cambió respecto del guardado
   * previo (ej: solo se reformateó). El backend usa esto para NO disparar IA.
   */
  contentChanged: boolean
}
