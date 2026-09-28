import type { Editor } from "@tiptap/react"
import { Extension } from "@tiptap/core"
import { Fragment, type Node as ProseMirrorNode } from "@tiptap/pm/model"

export const BULLET_LIST_STYLES = [
  { value: "disc", label: "Punto relleno", marker: "●" },
  { value: "circle", label: "Círculo", marker: "○" },
  { value: "square", label: "Cuadrado", marker: "■" },
  { value: "diamond", label: "Diamante", marker: "◆" },
  { value: "dash", label: "Guion", marker: "–" },
  { value: "check", label: "Marca", marker: "✓" },
] as const

export type BulletListStyle = (typeof BULLET_LIST_STYLES)[number]["value"]

export const BULLET_LIST_COLORS = [
  { value: "currentColor", label: "Color del texto" },
  { value: "#1f2937", label: "Carbón" },
  { value: "#2563eb", label: "Azul" },
  { value: "#7c3aed", label: "Violeta" },
  { value: "#059669", label: "Verde" },
  { value: "#d97706", label: "Ámbar" },
  { value: "#dc2626", label: "Rojo" },
  { value: "#db2777", label: "Rosa" },
] as const

export type BulletListColor = string
export type OrderedListColor = BulletListColor

export const ORDERED_LIST_STYLES = [
  { value: "1", label: "Números", preview: ["1.", "2.", "3."] },
  { value: "a", label: "Minúsculas", preview: ["a.", "b.", "c."] },
  { value: "A", label: "Mayúsculas", preview: ["A.", "B.", "C."] },
  { value: "i", label: "Romanos", preview: ["i.", "ii.", "iii."] },
  { value: "I", label: "Romanos mayúsculos", preview: ["I.", "II.", "III."] },
] as const

export type OrderedListStyle =
  (typeof ORDERED_LIST_STYLES)[number]["value"]

export const ORDERED_LIST_PRESETS = [
  {
    value: "numeric-alpha-roman",
    label: "1. → a. → i.",
    preview: ["1.  Tema", "1.a.  Subtema", "1.a.i.  Detalle"],
  },
  {
    value: "numeric-decimal",
    label: "1. → 1.1. → 1.1.1.",
    preview: ["1.  Tema", "1.1.  Subtema", "1.1.1.  Detalle"],
  },
  {
    value: "alpha-roman",
    label: "A. → a. → i.",
    preview: ["A.  Tema", "A.a.  Subtema", "A.a.i.  Detalle"],
  },
] as const

export type OrderedListPreset =
  (typeof ORDERED_LIST_PRESETS)[number]["value"]

const orderedListPresetValues = new Set<string>(
  ORDERED_LIST_PRESETS.map((preset) => preset.value),
)

const bulletStyleValues = new Set<string>(
  BULLET_LIST_STYLES.map((style) => style.value),
)

function isBulletListStyle(value: string): value is BulletListStyle {
  return bulletStyleValues.has(value)
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value)
}

function isBulletListColor(value: string): value is BulletListColor {
  return value === "currentColor" || isHexColor(value)
}

function parseBulletListStyle(element: HTMLElement): BulletListStyle {
  const dataValue = element.dataset.bulletStyle
  if (dataValue && isBulletListStyle(dataValue)) return dataValue

  const cssValue = element.style.listStyleType
  if (cssValue && isBulletListStyle(cssValue)) return cssValue

  return "disc"
}

/** Persists the selected bullet icon in TipTap JSON and in rendered HTML. */
export const ListFormatting = Extension.create({
  name: "listFormatting",

  addGlobalAttributes() {
    return [
      {
        types: ["bulletList"],
        attributes: {
          bulletStyle: {
            default: "disc" as BulletListStyle,
            parseHTML: parseBulletListStyle,
            renderHTML: (attributes: { bulletStyle?: BulletListStyle }) => {
              const bulletStyle = attributes.bulletStyle ?? "disc"

              return {
                "data-bullet-style": bulletStyle,
              }
            },
          },
          bulletColor: {
            default: "currentColor" as BulletListColor,
            parseHTML: (element: HTMLElement) => {
              const color = element.dataset.bulletColor
              return color && isBulletListColor(color)
                ? color
                : "currentColor"
            },
            renderHTML: (attributes: { bulletColor?: BulletListColor }) => ({
              "data-bullet-color": attributes.bulletColor ?? "currentColor",
              style: `--bullet-color: ${attributes.bulletColor ?? "currentColor"}`,
            }),
          },
        },
      },
      {
        types: ["orderedList"],
        attributes: {
          orderedListColor: {
            default: "currentColor" as OrderedListColor,
            parseHTML: (element: HTMLElement) => {
              const color = element.dataset.listColor
              return color && isBulletListColor(color)
                ? color
                : "currentColor"
            },
            renderHTML: (attributes: {
              orderedListColor?: OrderedListColor
            }) => {
              const color = attributes.orderedListColor ?? "currentColor"

              return color === "currentColor"
                ? {}
                : {
                    "data-list-color": color,
                    style: `--list-color: ${color}`,
                  }
            },
          },
          orderedListStyle: {
            default: "plain",
            parseHTML: (element: HTMLElement) => {
              const listStyle = element.dataset.listStyle
              return listStyle && orderedListPresetValues.has(listStyle)
                ? listStyle
                : "plain"
            },
            renderHTML: (attributes: {
              orderedListStyle?: OrderedListPreset | "plain"
              start?: number
            }) => ({
              "data-list-style": attributes.orderedListStyle ?? "plain",
              style: `--list-start: ${attributes.start ?? 1}`,
            }),
          },
        },
      },
    ]
  },
})

export function getActiveBulletListStyle(editor: Editor): BulletListStyle {
  const value = editor.getAttributes("bulletList").bulletStyle
  return isBulletListStyle(value) ? value : "disc"
}

export function getActiveBulletListColor(editor: Editor): BulletListColor {
  const value = editor.getAttributes("bulletList").bulletColor
  return typeof value === "string" && isBulletListColor(value)
    ? value
    : "currentColor"
}

export function getActiveOrderedListStyle(editor: Editor): OrderedListStyle {
  const value = editor.getAttributes("orderedList").type

  return ORDERED_LIST_STYLES.some((style) => style.value === value)
    ? (value as OrderedListStyle)
    : "1"
}

export function getActiveOrderedListColor(editor: Editor): OrderedListColor {
  const value = editor.getAttributes("orderedList").orderedListColor
  return typeof value === "string" && isBulletListColor(value)
    ? value
    : "currentColor"
}

export function applyBulletListStyle(
  editor: Editor,
  style: BulletListStyle,
) {
  const chain = editor.chain().focus()

  if (!editor.isActive("bulletList")) {
    chain.toggleBulletList()
  }

  return chain.updateAttributes("bulletList", { bulletStyle: style }).run()
}

export function applyBulletListColor(
  editor: Editor,
  color: BulletListColor,
) {
  const chain = editor.chain().focus()

  if (!editor.isActive("bulletList")) {
    chain.toggleBulletList()
  }

  return chain.updateAttributes("bulletList", { bulletColor: color }).run()
}

export function applyOrderedListStyle(
  editor: Editor,
  style: OrderedListStyle,
) {
  const chain = editor.chain().focus()

  if (!editor.isActive("orderedList")) {
    chain.toggleOrderedList()
  }

  return chain
    .updateAttributes("orderedList", {
      type: style === "1" ? null : style,
      orderedListStyle: "plain",
    })
    .run() && updateRootOrderedListStyle(editor, "plain")
}

export function applyOrderedListColor(
  editor: Editor,
  color: OrderedListColor,
) {
  const chain = editor.chain().focus()

  if (!editor.isActive("orderedList")) {
    chain.toggleOrderedList()
  }

  return chain.updateAttributes("orderedList", { orderedListColor: color }).run()
}

function getNearestOrderedList(editor: Editor) {
  const { $from } = editor.state.selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "orderedList") {
      return {
        depth,
        node: $from.node(depth),
        pos: $from.before(depth),
      }
    }
  }

  return null
}

function getRootOrderedList(editor: Editor) {
  const nearest = getNearestOrderedList(editor)
  if (!nearest) return null

  const { $from } = editor.state.selection
  let depth = nearest.depth

  while (depth >= 3) {
    const parent = $from.node(depth - 1)
    const outerList = $from.node(depth - 2)

    if (
      parent.type.name !== "listItem" ||
      outerList.type.name !== "orderedList"
    ) {
      break
    }

    depth -= 2
  }

  return {
    depth,
    node: $from.node(depth),
    pos: $from.before(depth),
  }
}

function updateRootOrderedListStyle(
  editor: Editor,
  style: OrderedListPreset | "plain",
) {
  const root = getRootOrderedList(editor)
  if (!root) return false

  const transaction = editor.state.tr.setNodeMarkup(
    root.pos,
    root.node.type,
    { ...root.node.attrs, orderedListStyle: style },
    root.node.marks,
  )

  editor.view.dispatch(transaction.scrollIntoView())
  return true
}

export function getActiveOrderedListPreset(
  editor: Editor,
): OrderedListPreset | "plain" {
  const root = getRootOrderedList(editor)
  const value = root?.node.attrs.orderedListStyle

  return typeof value === "string" && orderedListPresetValues.has(value)
    ? (value as OrderedListPreset)
    : "plain"
}

export function applyOrderedListPreset(
  editor: Editor,
  preset: OrderedListPreset,
) {
  const chain = editor.chain().focus()

  if (!editor.isActive("orderedList")) {
    chain.toggleOrderedList()
  }

  const applied = chain
    .updateAttributes("orderedList", {
      type: null,
      orderedListStyle: preset,
    })
    .run()

  return applied && updateRootOrderedListStyle(editor, preset)
}

export function getOrderedListStart(editor: Editor) {
  const list = getNearestOrderedList(editor)
  const start = Number(list?.node.attrs.start ?? 1)
  return Number.isFinite(start) && start > 0 ? Math.floor(start) : 1
}

export function setOrderedListStart(editor: Editor, start: number) {
  const safeStart = Number.isFinite(start) ? Math.max(1, Math.floor(start)) : 1
  return editor
    .chain()
    .focus()
    .updateAttributes("orderedList", { start: safeStart })
    .run()
}

export function continueOrderedList(editor: Editor) {
  const list = getNearestOrderedList(editor)
  if (!list) return false

  const { $from } = editor.state.selection
  const parent = $from.node(list.depth - 1)
  const listIndex = $from.index(list.depth - 1)
  let start = 1

  for (let index = listIndex - 1; index >= 0; index -= 1) {
    const previous = parent.child(index)
    if (previous.type.name !== "orderedList") continue

    start = Number(previous.attrs.start ?? 1) + previous.childCount
    break
  }

  return setOrderedListStart(editor, start)
}

function collectListParagraphs(
  listNode: ProseMirrorNode,
  paragraphs: ProseMirrorNode[],
) {
  listNode.forEach((listItem) => {
    if (listItem.type.name !== "listItem") return

    listItem.forEach((contentNode) => {
      if (contentNode.type.name === "paragraph") {
        paragraphs.push(contentNode)
        return
      }

      if (
        contentNode.type.name === "bulletList" ||
        contentNode.type.name === "orderedList"
      ) {
        collectListParagraphs(contentNode, paragraphs)
      }
    })
  })
}

/** Removes the complete list that contains the cursor, preserving its text as paragraphs. */
export function removeCurrentList(editor: Editor) {
  editor.commands.focus()

  const { state } = editor
  const { $from } = state.selection
  let listDepth = -1

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const nodeName = $from.node(depth).type.name
    if (nodeName === "bulletList" || nodeName === "orderedList") {
      listDepth = depth
      break
    }
  }

  if (listDepth < 0) return false

  const listNode = $from.node(listDepth)
  const paragraphs: ProseMirrorNode[] = []
  collectListParagraphs(listNode, paragraphs)

  const from = $from.before(listDepth)
  const transaction = state.tr.replaceWith(
    from,
    from + listNode.nodeSize,
    Fragment.fromArray(paragraphs),
  )

  editor.view.dispatch(transaction.scrollIntoView())
  return true
}
