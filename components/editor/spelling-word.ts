import type { Editor } from "@tiptap/react"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { TextSelection } from "@tiptap/pm/state"

export type SpellingWord = { from: number; to: number; word: string }

export function findSpellingWord(document: ProseMirrorNode, position: number): SpellingWord | null {
  if (position < 0 || position > document.content.size) return null
  const resolved = document.resolve(position)
  if (!resolved.parent.isTextblock || resolved.parent.type.name === "codeBlock") return null
  // Un carácter por nodo inline evita desfasar las posiciones alrededor de imágenes y enlaces.
  const text = resolved.parent.textBetween(0, resolved.parent.content.size, "", " ")
  const offset = resolved.parentOffset
  for (const match of text.matchAll(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu)) {
    const start = match.index
    const end = start + match[0].length
    if (offset >= start && offset <= end) {
      return { from: resolved.start() + start, to: resolved.start() + end, word: match[0] }
    }
  }
  return null
}

type SpellingEditor = Pick<Editor, "isDestroyed" | "isEditable" | "state"> & {
  view: Pick<Editor["view"], "dispatch">
}

export function replaceSpellingWord(editor: SpellingEditor, target: SpellingWord, replacement: string): boolean {
  if (editor.isDestroyed || !editor.isEditable || !replacement.trim() || replacement.length > 100) return false
  if (target.from < 0 || target.to > editor.state.doc.content.size || editor.state.doc.textBetween(target.from, target.to, "", " ") !== target.word) return false
  // insertText mantiene las marcas del texto, trata la sugerencia como texto plano y admite deshacer.
  const corrected = replacement.trim()
  const transaction = editor.state.tr.insertText(corrected, target.from, target.to)
  transaction.setSelection(TextSelection.create(transaction.doc, target.from + corrected.length))
  editor.view.dispatch(transaction.scrollIntoView())
  return true
}
