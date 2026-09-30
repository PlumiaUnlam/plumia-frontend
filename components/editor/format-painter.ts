"use client"

import { useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"
import type { Mark } from "@tiptap/pm/model"

import {
  DEFAULT_PARAGRAPH_ATTRIBUTES,
  type ParagraphAttributes,
} from "./paragraph-formatting"

type PainterBlockType = "paragraph" | "heading"

type FormatSnapshot = {
  sourceFrom: number
  sourceTo: number
  marks: readonly Mark[]
  blockType: PainterBlockType | null
  headingLevel: number
  paragraphAttributes: ParagraphAttributes
  editorStyleId: string | null
}

type PainterSession = {
  snapshot: FormatSnapshot
  pointerSelecting: boolean
  pendingFrame: number | null
  pendingCaretTimeout: number | null
  onPointerDown: (event: PointerEvent) => void
  onPointerUp: () => void
  onSelectionUpdate: () => void
  onUpdate: () => void
  onKeyDown: (event: KeyboardEvent) => void
  onDestroy: () => void
}

const sessions = new WeakMap<Editor, PainterSession>()
const listeners = new WeakMap<Editor, Set<() => void>>()

function notify(editor: Editor) {
  listeners.get(editor)?.forEach((listener) => listener())
}

function subscribe(editor: Editor, listener: () => void) {
  const editorListeners = listeners.get(editor) ?? new Set<() => void>()
  editorListeners.add(listener)
  listeners.set(editor, editorListeners)

  return () => {
    editorListeners.delete(listener)
    if (editorListeners.size === 0) listeners.delete(editor)
  }
}

function isSameSelection(editor: Editor, snapshot: FormatSnapshot) {
  const { from, to } = editor.state.selection
  return from === snapshot.sourceFrom && to === snapshot.sourceTo
}

function captureFormat(editor: Editor): FormatSnapshot {
  const { selection, schema, storedMarks } = editor.state
  const sourceBlock = selection.$from.parent
  const paragraphAttributes: ParagraphAttributes = {
    textAlign:
      sourceBlock.attrs.textAlign ?? DEFAULT_PARAGRAPH_ATTRIBUTES.textAlign,
    lineHeight:
      sourceBlock.attrs.lineHeight ?? DEFAULT_PARAGRAPH_ATTRIBUTES.lineHeight,
    indentLeft:
      sourceBlock.attrs.indentLeft ?? DEFAULT_PARAGRAPH_ATTRIBUTES.indentLeft,
    indentRight:
      sourceBlock.attrs.indentRight ?? DEFAULT_PARAGRAPH_ATTRIBUTES.indentRight,
    firstLineIndent:
      sourceBlock.attrs.firstLineIndent ??
      DEFAULT_PARAGRAPH_ATTRIBUTES.firstLineIndent,
    tabSize: sourceBlock.attrs.tabSize ?? DEFAULT_PARAGRAPH_ATTRIBUTES.tabSize,
  }

  const blockType: PainterBlockType | null =
    sourceBlock.type.name === "paragraph" || sourceBlock.type.name === "heading"
      ? sourceBlock.type.name
      : null
  const headingLevel =
    sourceBlock.type.name === "heading" &&
    typeof sourceBlock.attrs.level === "number"
      ? sourceBlock.attrs.level
      : 1
  const linkMark = schema.marks.link
  const marks = (storedMarks ?? selection.$from.marks()).filter(
    (mark) => mark.type !== linkMark,
  )

  return {
    sourceFrom: selection.from,
    sourceTo: selection.to,
    marks,
    blockType,
    headingLevel,
    paragraphAttributes,
    editorStyleId:
      typeof sourceBlock.attrs.editorStyleId === "string"
        ? sourceBlock.attrs.editorStyleId
        : null,
  }
}

function applyFormat(editor: Editor, snapshot: FormatSnapshot) {
  const { state, view } = editor
  const { selection, schema } = state
  const { from, to } = selection
  const transaction = state.tr

  if (selection.empty) {
    transaction.setStoredMarks([...snapshot.marks])
  } else {
    for (const markType of Object.values(schema.marks)) {
      if (markType.name !== "link") {
        transaction.removeMark(from, to, markType)
      }
    }

    for (const mark of snapshot.marks) {
      transaction.addMark(from, to, mark)
    }
  }

  const targetBlocks: Array<{ pos: number; node: typeof state.doc }> = []
  if (selection.empty) {
    if (selection.$from.parent.isTextblock) {
      targetBlocks.push({
        pos: selection.$from.before(selection.$from.depth),
        node: selection.$from.parent,
      })
    }
  } else {
    transaction.doc.nodesBetween(from, to, (node, pos) => {
      if (node.isTextblock) targetBlocks.push({ pos, node })
    })
  }

  if (snapshot.blockType) {
    const targetType = schema.nodes[snapshot.blockType]

    if (targetType) {
      for (const { pos, node } of targetBlocks) {
        const $pos = transaction.doc.resolve(pos)
        const canReplace = $pos.parent.canReplaceWith(
          $pos.index(),
          $pos.index() + 1,
          targetType,
        )

        if (!canReplace || !targetType.validContent(node.content)) continue

        const attributes =
          snapshot.blockType === "heading"
            ? {
                level: snapshot.headingLevel,
                editorStyleId: snapshot.editorStyleId,
              }
            : {
                ...snapshot.paragraphAttributes,
                editorStyleId: snapshot.editorStyleId,
              }
        transaction.setNodeMarkup(pos, targetType, attributes, node.marks)
      }
    }
  }

  if (transaction.docChanged || transaction.storedMarksSet) {
    view.dispatch(transaction)
  }
  view.focus()
}

function stopSession(editor: Editor, session: PainterSession) {
  if (session.pendingFrame !== null) {
    cancelAnimationFrame(session.pendingFrame)
  }
  if (session.pendingCaretTimeout !== null) {
    window.clearTimeout(session.pendingCaretTimeout)
  }

  editor.off("selectionUpdate", session.onSelectionUpdate)
  editor.off("update", session.onUpdate)
  editor.off("destroy", session.onDestroy)
  editor.view.dom.removeEventListener("pointerdown", session.onPointerDown, true)
  window.removeEventListener("pointerup", session.onPointerUp, true)
  window.removeEventListener("keydown", session.onKeyDown, true)
  sessions.delete(editor)
  notify(editor)
}

function applyCurrentSelection(editor: Editor, session: PainterSession) {
  if (isSameSelection(editor, session.snapshot)) return

  stopSession(editor, session)
  applyFormat(editor, session.snapshot)
}

function scheduleApply(editor: Editor, session: PainterSession, delayCaret: boolean) {
  if (session.pendingFrame !== null) {
    cancelAnimationFrame(session.pendingFrame)
    session.pendingFrame = null
  }
  if (session.pendingCaretTimeout !== null) {
    window.clearTimeout(session.pendingCaretTimeout)
    session.pendingCaretTimeout = null
  }

  const scheduleFrame = () => {
    session.pendingFrame = requestAnimationFrame(() => {
      session.pendingFrame = null
      if (!sessions.has(editor) || session.pointerSelecting) return
      applyCurrentSelection(editor, session)
    })
  }

  if (delayCaret && editor.state.selection.empty) {
    session.pendingCaretTimeout = window.setTimeout(() => {
      session.pendingCaretTimeout = null
      scheduleFrame()
    }, 280)
    return
  }

  scheduleFrame()
}

function startSession(editor: Editor) {
  const snapshot = captureFormat(editor)
  const session: PainterSession = {
    snapshot,
    pointerSelecting: false,
    pendingFrame: null,
    pendingCaretTimeout: null,
    onPointerDown: (event) => {
      if (event.button !== 0) return
      session.pointerSelecting = true
      if (session.pendingCaretTimeout !== null) {
        window.clearTimeout(session.pendingCaretTimeout)
        session.pendingCaretTimeout = null
      }
    },
    onPointerUp: () => {
      if (!session.pointerSelecting) return
      session.pointerSelecting = false
      scheduleApply(editor, session, true)
    },
    onSelectionUpdate: () => {
      if (!session.pointerSelecting) scheduleApply(editor, session, false)
    },
    onUpdate: () => stopSession(editor, session),
    onKeyDown: (event) => {
      if (event.key === "Escape") stopSession(editor, session)
    },
    onDestroy: () => stopSession(editor, session),
  }

  sessions.set(editor, session)
  editor.on("selectionUpdate", session.onSelectionUpdate)
  editor.on("update", session.onUpdate)
  editor.on("destroy", session.onDestroy)
  editor.view.dom.addEventListener("pointerdown", session.onPointerDown, true)
  window.addEventListener("pointerup", session.onPointerUp, true)
  window.addEventListener("keydown", session.onKeyDown, true)
  notify(editor)
}

export function isFormatPainterActive(editor: Editor) {
  return sessions.has(editor)
}

export function toggleFormatPainter(editor: Editor) {
  const session = sessions.get(editor)
  if (session) {
    if (!isSameSelection(editor, session.snapshot)) {
      applyCurrentSelection(editor, session)
    } else {
      stopSession(editor, session)
    }
    return
  }

  startSession(editor)
}

export function useFormatPainterState(editor: Editor) {
  const [active, setActive] = useState(() => isFormatPainterActive(editor))

  useEffect(() => {
    const update = () => setActive(isFormatPainterActive(editor))
    const unsubscribe = subscribe(editor, update)
    update()

    return unsubscribe
  }, [editor])

  return active
}
