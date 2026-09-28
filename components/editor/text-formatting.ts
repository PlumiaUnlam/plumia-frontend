import { Mark } from "@tiptap/core"
import type { Editor } from "@tiptap/react"

export const TEXT_COLORS = [
  { value: "inherit", label: "Automático" },
  { value: "#1f2937", label: "Carbón" },
  { value: "#2563eb", label: "Azul" },
  { value: "#7c3aed", label: "Violeta" },
  { value: "#059669", label: "Verde" },
  { value: "#d97706", label: "Ámbar" },
  { value: "#dc2626", label: "Rojo" },
  { value: "#db2777", label: "Rosa" },
] as const

export type TextColor = string

function isTextColor(value: string): value is TextColor {
  return value === "inherit" || /^#[0-9a-f]{6}$/i.test(value)
}

/** Stores font color as a real inline mark so it survives JSON autosaves. */
export const TextFormatting = Mark.create({
  name: "textColor",

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const color = element.dataset.textColor
          return color && isTextColor(color) && color !== "inherit"
            ? color
            : null
        },
        renderHTML: (attributes: { color?: TextColor | null }) => {
          const color = attributes.color
          if (!color || color === "inherit") return {}

          return {
            "data-text-color": color,
            style: `color: ${color}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-text-color]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0]
  },
})

export function getActiveTextColor(editor: Editor): TextColor {
  const value = editor.getAttributes("textColor").color
  return typeof value === "string" && isTextColor(value) ? value : "inherit"
}

export function applyTextColor(editor: Editor, color: TextColor) {
  const chain = editor.chain().focus()

  if (color === "inherit") {
    return chain.unsetMark("textColor").run()
  }

  return chain.setMark("textColor", { color }).run()
}
