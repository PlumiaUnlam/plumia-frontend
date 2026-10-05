import type { Editor } from "@tiptap/react"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, TextSelection } from "@tiptap/pm/state"
import type { EditorView } from "@tiptap/pm/view"
import type { TextFontSize } from "./text-font-size"

type SelectedParagraph = { position: number; node: ProseMirrorNode }

type SelectedDropCap = SelectedParagraph & {
  fontSize: TextFontSize | null
}

type TextRange = { from: number; to: number }

function getFirstLetterRange(paragraph: SelectedParagraph): TextRange | null {
  const ranges: TextRange[] = []
  paragraph.node.descendants((node, offset) => {
    if (!node.isText || !node.text || ranges.length) return ranges.length === 0

    const match = /\p{L}[\p{M}]*/u.exec(node.text)
    if (!match || match.index === undefined) return true

    const from = paragraph.position + 1 + offset + match.index
    ranges.push({ from, to: from + match[0].length })
    return false
  })

  return ranges[0] ?? null
}

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

function getSelectedDropCap(editor: Editor): SelectedDropCap | null {
  const { selection } = editor.state
  if (selection.empty) return null

  for (const paragraph of getSelectedParagraphs(editor)) {
    if (paragraph.node.attrs.dropCap !== true) continue
    const firstLetterRange = getFirstLetterRange(paragraph)
    if (
      firstLetterRange &&
      selection.from === firstLetterRange.from &&
      selection.to === firstLetterRange.to
    ) {
      return {
        ...paragraph,
        fontSize: paragraph.node.attrs.dropCapFontSize ?? null,
      }
    }
  }

  return null
}

function getDomRange(view: EditorView, from: number, to: number) {
  try {
    const start = view.domAtPos(from)
    const end = view.domAtPos(to)
    const range = view.dom.ownerDocument.createRange()
    range.setStart(start.node, start.offset)
    range.setEnd(end.node, end.offset)
    return range
  } catch {
    return null
  }
}

function selectTextRange(view: EditorView, event: Event, range: TextRange) {
  event.preventDefault()
  view.dispatch(
    view.state.tr
      .setSelection(TextSelection.create(view.state.doc, range.from, range.to))
      .scrollIntoView(),
  )
  view.focus()
  return true
}

function getParagraphVisualLine(
  view: EditorView,
  paragraphPosition: number,
  paragraphNode: ProseMirrorNode,
  paragraph: HTMLElement,
  clientY: number,
): TextRange & { left: number } | null {
  const contentStart = paragraphPosition + 1
  const contentEnd = paragraphPosition + paragraphNode.nodeSize - 1
  if (contentStart >= contentEnd) return null

  const bounds = paragraph.getBoundingClientRect()
  const position = view.posAtCoords({ left: bounds.left + 1, top: clientY })?.pos
  if (position === undefined) return null

  const cursor = Math.max(contentStart, Math.min(contentEnd, position))
  const referenceTop = view.coordsAtPos(cursor).top
  let from = cursor
  let to = cursor

  while (from > contentStart) {
    const previous = view.coordsAtPos(from - 1)
    if (Math.abs(previous.top - referenceTop) > 2) break
    from -= 1
  }
  while (to < contentEnd) {
    const next = view.coordsAtPos(to + 1)
    if (Math.abs(next.top - referenceTop) > 2) break
    to += 1
  }

  if (from >= to) return null
  return { from, to, left: view.coordsAtPos(from).left }
}

function selectDropCapOrGutterLine(view: EditorView, event: Event) {
  if (!(event instanceof PointerEvent) || event.button !== 0) return false

  const paragraphs: SelectedParagraph[] = []
  view.state.doc.descendants((node, position) => {
    if (node.type.name === "paragraph") {
      paragraphs.push({ position, node })
      return false
    }
    return true
  })

  const pointer = event
  const paragraphsAtY: Array<SelectedParagraph & { dom: HTMLElement }> = []
  for (const paragraph of paragraphs) {
    const dom = view.nodeDOM(paragraph.position)
    if (!(dom instanceof HTMLElement) || dom.tagName !== "P") continue

    const bounds = dom.getBoundingClientRect()
    if (pointer.clientY >= bounds.top && pointer.clientY <= bounds.bottom) {
      paragraphsAtY.push({ ...paragraph, dom })
    }
  }

  for (const paragraph of paragraphsAtY) {
    if (paragraph.node.attrs.dropCap !== true) continue
    const range = getFirstLetterRange(paragraph)
    if (!range) continue

    const rect = getDomRange(view, range.from, range.to)?.getBoundingClientRect()
    if (
      rect &&
      pointer.clientX >= rect.left &&
      pointer.clientX <= rect.right &&
      pointer.clientY >= rect.top &&
      pointer.clientY <= rect.bottom
    ) {
      return selectTextRange(view, event, range)
    }
  }

  let closestLine: (TextRange & { left: number }) | null = null
  let closestDistance = Number.POSITIVE_INFINITY
  for (const paragraph of paragraphsAtY) {
    const line = getParagraphVisualLine(
      view,
      paragraph.position,
      paragraph.node,
      paragraph.dom,
      pointer.clientY,
    )
    if (!line) continue

    const distance = Math.abs(view.coordsAtPos(line.from).top - pointer.clientY)
    if (distance < closestDistance) {
      closestDistance = distance
      closestLine = line
    }
  }

  if (closestLine && pointer.clientX < closestLine.left - 3) {
    return selectTextRange(view, event, closestLine)
  }

  return false
}

/** Clicking the decorative initial selects it; clicking in the line gutter selects that visual line. */
export function dropCapClickSelectionPlugin() {
  return new Plugin({
    props: {
      handleDOMEvents: {
        pointerdown: selectDropCapOrGutterLine,
      },
    },
  })
}

export function getSelectedDropCapFontSize(
  editor: Editor,
): { fontSize: TextFontSize | null } | null {
  const selectedDropCap = getSelectedDropCap(editor)
  return selectedDropCap ? { fontSize: selectedDropCap.fontSize } : null
}

export function applySelectedDropCapFontSize(
  editor: Editor,
  fontSize: TextFontSize | null,
) {
  if (!editor.isEditable) return false

  const selectedDropCap = getSelectedDropCap(editor)
  if (!selectedDropCap) return false

  const { position, node } = selectedDropCap
  const transaction = editor.state.tr.setNodeMarkup(position, node.type, {
    ...node.attrs,
    dropCapFontSize: fontSize,
  })
  transaction.setSelection(editor.state.selection.map(transaction.doc, transaction.mapping))
  editor.view.dispatch(transaction.scrollIntoView())
  editor.view.focus()
  return true
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
