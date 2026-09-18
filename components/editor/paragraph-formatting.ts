import { Extension } from "@tiptap/core"

export const PARAGRAPH_ALIGNMENTS = [
  "left",
  "center",
  "right",
  "justify",
] as const

export type ParagraphAlignment = (typeof PARAGRAPH_ALIGNMENTS)[number]

export const PARAGRAPH_LINE_HEIGHTS = ["1", "1.15", "1.5", "1.8", "2"] as const

export type ParagraphLineHeight = (typeof PARAGRAPH_LINE_HEIGHTS)[number]

export const PARAGRAPH_TAB_SIZES = [2, 4, 8] as const

export type ParagraphTabSize = (typeof PARAGRAPH_TAB_SIZES)[number]

export type ParagraphAttributes = {
  textAlign: ParagraphAlignment
  lineHeight: ParagraphLineHeight
  indentLeft: number
  indentRight: number
  firstLineIndent: number
  tabSize: ParagraphTabSize
}

export const DEFAULT_PARAGRAPH_ATTRIBUTES: ParagraphAttributes = {
  textAlign: "left",
  lineHeight: "1.8",
  indentLeft: 0,
  indentRight: 0,
  firstLineIndent: 0,
  tabSize: 4,
}

function parseAlignment(element: HTMLElement): ParagraphAlignment {
  const value = element.style.textAlign || element.dataset.textAlign

  return PARAGRAPH_ALIGNMENTS.includes(value as ParagraphAlignment)
    ? (value as ParagraphAlignment)
    : DEFAULT_PARAGRAPH_ATTRIBUTES.textAlign
}

function parseLineHeight(element: HTMLElement): ParagraphLineHeight {
  const value = element.style.lineHeight || element.dataset.lineHeight

  return PARAGRAPH_LINE_HEIGHTS.includes(value as ParagraphLineHeight)
    ? (value as ParagraphLineHeight)
    : DEFAULT_PARAGRAPH_ATTRIBUTES.lineHeight
}

function parseIndent(element: HTMLElement, property: string): number {
  const value = element.style.getPropertyValue(property)
  if (!value) return 0

  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return 0

  if (value.trim().endsWith("px")) {
    return Math.round((parsed / 37.7952755906) * 100) / 100
  }

  return Math.round(parsed * 100) / 100
}

function parseTabSize(element: HTMLElement): ParagraphTabSize {
  const value = Number.parseInt(
    element.style.getPropertyValue("tab-size") || element.dataset.tabSize || "",
    10,
  )

  return PARAGRAPH_TAB_SIZES.includes(value as ParagraphTabSize)
    ? (value as ParagraphTabSize)
    : DEFAULT_PARAGRAPH_ATTRIBUTES.tabSize
}

/**
 * Formatting that belongs to an individual paragraph rather than to the
 * document or the current text selection. Attributes are stored in TipTap's
 * canonical JSON so they survive autosave, versions and reloads.
 */
export const ParagraphFormatting = Extension.create({
  name: "paragraphFormatting",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          textAlign: {
            default: DEFAULT_PARAGRAPH_ATTRIBUTES.textAlign,
            parseHTML: parseAlignment,
            renderHTML: (attributes: Partial<ParagraphAttributes>) => ({
              style: `text-align: ${attributes.textAlign}`,
            }),
          },
          lineHeight: {
            default: DEFAULT_PARAGRAPH_ATTRIBUTES.lineHeight,
            parseHTML: parseLineHeight,
            renderHTML: (attributes: Partial<ParagraphAttributes>) => ({
              style: `line-height: ${attributes.lineHeight}`,
            }),
          },
          indentLeft: {
            default: DEFAULT_PARAGRAPH_ATTRIBUTES.indentLeft,
            parseHTML: (element: HTMLElement) => parseIndent(element, "margin-left"),
            renderHTML: (attributes: Partial<ParagraphAttributes>) => ({
              style: `margin-left: ${attributes.indentLeft}cm`,
            }),
          },
          indentRight: {
            default: DEFAULT_PARAGRAPH_ATTRIBUTES.indentRight,
            parseHTML: (element: HTMLElement) => parseIndent(element, "margin-right"),
            renderHTML: (attributes: Partial<ParagraphAttributes>) => ({
              style: `margin-right: ${attributes.indentRight}cm`,
            }),
          },
          firstLineIndent: {
            default: DEFAULT_PARAGRAPH_ATTRIBUTES.firstLineIndent,
            parseHTML: (element: HTMLElement) => parseIndent(element, "text-indent"),
            renderHTML: (attributes: Partial<ParagraphAttributes>) => ({
              style: `text-indent: ${attributes.firstLineIndent}cm`,
            }),
          },
          tabSize: {
            default: DEFAULT_PARAGRAPH_ATTRIBUTES.tabSize,
            parseHTML: parseTabSize,
            renderHTML: (attributes: Partial<ParagraphAttributes>) => ({
              style: `tab-size: ${attributes.tabSize}; -moz-tab-size: ${attributes.tabSize}`,
            }),
          },
        },
      },
    ]
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.state.selection.$from.parent.type.name !== "paragraph") {
          return false
        }

        return this.editor.commands.insertContent("\t")
      },
    }
  },
})
