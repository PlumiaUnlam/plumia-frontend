import type { Editor } from "@tiptap/react"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"

type SelectedParagraph = { position: number; node: ProseMirrorNode }

function getSelectedParagraphs(editor: Editor): SelectedParagraph[] {
  const { doc, selection } = editor.state
  if (selection.empty) {
    const $position = selection.$from
    for (let depth = $position.depth; depth > 0; depth -= 1) {
      const node = $position.node(depth)
      if (node.type.name === "paragraph") {
        return [{ position: $position.before(depth), node }]
      }
    }
    return []
  }

  const paragraphs: SelectedParagraph[] = []
  doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (node.type.name === "paragraph") {
      paragraphs.push({ position, node })
      return false
    }
    return true
  })
  return paragraphs
}

export function canApplyDropCap(editor: Editor) {
  return editor.isEditable && getSelectedParagraphs(editor).length > 0
}

export function isDropCapActive(editor: Editor) {
  const paragraphs = getSelectedParagraphs(editor)
  return paragraphs.length > 0 && paragraphs.every(({ node }) => node.attrs.dropCap === true)
}

export function toggleDropCap(editor: Editor) {
  if (!editor.isEditable) return false
  const paragraphs = getSelectedParagraphs(editor)
  if (!paragraphs.length) return false

  const enable = !paragraphs.every(({ node }) => node.attrs.dropCap === true)
  const { selection } = editor.state
  const transaction = editor.state.tr
  for (const { position, node } of paragraphs.reverse()) {
    transaction.setNodeMarkup(position, node.type, { ...node.attrs, dropCap: enable })
  }
  transaction.setSelection(selection.map(transaction.doc, transaction.mapping))
  editor.view.dispatch(transaction.scrollIntoView())
  return true
}
