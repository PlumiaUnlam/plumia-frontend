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

export const TextHighlightFormatting = Mark.create({
  name: "textHighlight",

  parseHTML() {
    return [
      { tag: "mark[data-text-highlight]" },
      { tag: "mark" },
    ]
  },

  renderHTML() {
    return [
      "mark",
      {
        "data-text-highlight": "yellow",
        style: "background-color: #ffff00; color: inherit",
      },
      0,
    ]
  },
})

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
