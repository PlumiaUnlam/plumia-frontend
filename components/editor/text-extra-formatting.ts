import { Mark } from "@tiptap/core"
import type { Editor } from "@tiptap/react"

import { DEFAULT_PARAGRAPH_ATTRIBUTES } from "./paragraph-formatting"

export const TextSubscriptFormatting = Mark.create({
  name: "subscript",
  excludes: "superscript",

  parseHTML() {
    return [{ tag: "sub" }]
  },

  renderHTML() {
    return ["sub", 0]
  },
})

export const TextSuperscriptFormatting = Mark.create({
  name: "superscript",
  excludes: "subscript",

  parseHTML() {
    return [{ tag: "sup" }]
  },

  renderHTML() {
    return ["sup", 0]
  },
})

export const DEFAULT_TEXT_HIGHLIGHT_COLOR = "#ffff00"

const chosenHighlightColors = new WeakMap<Editor, string>()

export const TextHighlightFormatting = Mark.create({
  name: "textHighlight",

  addAttributes() {
    return {
      color: {
        default: DEFAULT_TEXT_HIGHLIGHT_COLOR,
        parseHTML: (element: HTMLElement) => {
          const color = element.dataset.highlightColor
          return color && /^#[0-9a-f]{6}$/i.test(color)
            ? color
            : DEFAULT_TEXT_HIGHLIGHT_COLOR
        },
        renderHTML: (attributes: { color?: string }) => {
          const color = attributes.color
          if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return {}

          return {
            "data-highlight-color": color,
            style: `background-color: ${color}; color: inherit`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      { tag: "mark[data-text-highlight]" },
      { tag: "mark" },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", { "data-text-highlight": "true", ...HTMLAttributes }, 0]
  },
})

export function getTextHighlightColor(editor: Editor) {
  const activeColor = editor.getAttributes("textHighlight").color
  if (typeof activeColor === "string" && /^#[0-9a-f]{6}$/i.test(activeColor)) {
    return activeColor
  }

  return chosenHighlightColors.get(editor) ?? DEFAULT_TEXT_HIGHLIGHT_COLOR
}

export function applyTextHighlightColor(editor: Editor, color: string) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return false

  chosenHighlightColors.set(editor, color)
  return editor.chain().focus().setMark("textHighlight", { color }).run()
}

export function toggleTextHighlight(
  editor: Editor,
  color = getTextHighlightColor(editor),
) {
  const chain = editor.chain().focus()

  if (editor.isActive("textHighlight")) {
    return chain.unsetMark("textHighlight").run()
  }

  chosenHighlightColors.set(editor, color)
  return chain.setMark("textHighlight", { color }).run()
}

export function toggleTextMark(
  editor: Editor,
  mark: "bold" | "italic" | "underline" | "strike",
) {
  const chain = editor.chain().focus()

  if (editor.isActive(mark)) {
    return chain.unsetMark(mark).run()
  }

  return chain.setMark(mark).run()
}

export function toggleSubscript(editor: Editor) {
  return editor
    .chain()
    .focus()
    .unsetMark("superscript")
    .toggleMark("subscript")
    .run()
}

export function toggleSuperscript(editor: Editor) {
  return editor
    .chain()
    .focus()
    .unsetMark("subscript")
    .toggleMark("superscript")
    .run()
}

export function clearTextFormatting(editor: Editor) {
  const chain = editor.chain().focus()

  for (const mark of [
    "bold",
    "italic",
    "strike",
    "underline",
    "code",
    "textColor",
    "textFontSize",
    "textFontFamily",
    "subscript",
    "superscript",
    "textHighlight",
    "editorTextStyle",
  ]) {
    chain.unsetMark(mark)
  }

  return chain
    .setParagraph()
    .updateAttributes("paragraph", {
      ...DEFAULT_PARAGRAPH_ATTRIBUTES,
      editorStyleId: null,
    })
    .run()
}
