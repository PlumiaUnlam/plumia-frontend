import { Mark } from "@tiptap/core"
import type { Editor } from "@tiptap/react"

export const TEXT_FONT_SIZES = [
  { value: "8pt", label: "8 pt" },
  { value: "9pt", label: "9 pt" },
  { value: "10pt", label: "10 pt" },
  { value: "11pt", label: "11 pt" },
  { value: "12pt", label: "12 pt" },
  { value: "14pt", label: "14 pt" },
  { value: "16pt", label: "16 pt" },
  { value: "18pt", label: "18 pt" },
  { value: "20pt", label: "20 pt" },
  { value: "24pt", label: "24 pt" },
  { value: "28pt", label: "28 pt" },
  { value: "32pt", label: "32 pt" },
  { value: "36pt", label: "36 pt" },
  { value: "48pt", label: "48 pt" },
  { value: "72pt", label: "72 pt" },
] as const

export type TextFontSize = (typeof TEXT_FONT_SIZES)[number]["value"]

function isTextFontSize(value: string): value is TextFontSize {
  return TEXT_FONT_SIZES.some((option) => option.value === value)
}

function parseFontSize(value: string | null | undefined): TextFontSize | null {
  return value && isTextFontSize(value) ? value : null
}

/** Stores text size as a mark so it survives the editor's JSON autosaves. */
export const TextFontSizeFormatting = Mark.create({
  name: "textFontSize",

  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          parseFontSize(
            element.dataset.fontSize || element.style.fontSize,
          ),
        renderHTML: (attributes: { fontSize?: TextFontSize | null }) => {
          const fontSize = parseFontSize(attributes.fontSize)
          if (!fontSize) return {}

          return {
            "data-font-size": fontSize,
            style: `font-size: ${fontSize}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      { tag: "span[data-font-size]" },
      { tag: "span[style*='font-size']" },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0]
  },
})

export function getActiveTextFontSize(editor: Editor): TextFontSize | null {
  const value = editor.getAttributes("textFontSize").fontSize
  return typeof value === "string" ? parseFontSize(value) : null
}

export function applyTextFontSize(
  editor: Editor,
  fontSize: TextFontSize | null,
) {
  const chain = editor.chain().focus()

  if (!fontSize) {
    return chain.unsetMark("textFontSize").run()
  }

  return chain.setMark("textFontSize", { fontSize }).run()
}
