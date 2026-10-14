import type { JSONContent } from "@tiptap/core"

export const NOTE_REFERENCE_NODE = "noteReference"

export type NoteKind = "footnote" | "endnote"

export type SceneNote = {
  id: string | null
  kind: NoteKind
  /** Índice 1-based dentro de su tipo; coincide con el CSS counter del editor. */
  number: number
  content: JSONContent[]
  text: string
}

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  footnote: "Nota al pie",
  endnote: "Nota al final",
}

export function normalizeNoteKind(value: unknown): NoteKind {
  return value === "endnote" ? "endnote" : "footnote"
}

export function normalizeNoteContent(value: unknown): JSONContent[] {
  return Array.isArray(value) ? (value as JSONContent[]) : []
}

export function parseNoteContent(value: string | null | undefined): JSONContent[] {
  if (!value) return []
  try {
    return normalizeNoteContent(JSON.parse(value))
  } catch {
    return []
  }
}

export function createNoteId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Texto plano de la nota; los saltos de línea se conservan como "\n". */
export function noteContentToPlainText(content: JSONContent[]): string {
  return content.map(nodeToPlainText).join("")
}

function nodeToPlainText(node: JSONContent): string {
  if (node.type === NOTE_REFERENCE_NODE || node.type === "image") return ""
  if (node.type === "text") return node.text ?? ""
  if (node.type === "hardBreak") return "\n"
  return Array.isArray(node.content) ? noteContentToPlainText(node.content) : ""
}

export function isNoteEmpty(content: JSONContent[]): boolean {
  return noteContentToPlainText(content).trim().length === 0
}

/** Recorre el JSON de la escena y devuelve sus notas en orden de aparición. */
export function collectSceneNotes(doc: JSONContent | null | undefined): SceneNote[] {
  const notes: SceneNote[] = []
  const counters: Record<NoteKind, number> = { footnote: 0, endnote: 0 }

  const visit = (node: JSONContent) => {
    if (node.type === NOTE_REFERENCE_NODE) {
      const kind = normalizeNoteKind(node.attrs?.kind)
      const content = normalizeNoteContent(node.attrs?.content)
      counters[kind] += 1
      notes.push({
        id: typeof node.attrs?.id === "string" ? node.attrs.id : null,
        kind,
        number: counters[kind],
        content,
        text: noteContentToPlainText(content),
      })
      return
    }
    node.content?.forEach(visit)
  }

  if (doc) visit(doc)
  return notes
}
