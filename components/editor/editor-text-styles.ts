import { Extension, Mark } from "@tiptap/core"
import type { Editor } from "@tiptap/react"

import type {
  EditorTextStyle,
  EditorTextStyleDefinition,
  EditorTextStyleKind,
} from "@/types/editor-text-style"
import { getFontFamilyCss, type TextFontFamily } from "./text-font-family"

const EDITOR_STYLE_ATTRIBUTE = "data-editor-style-id"

export const EditorTextStyleMark = Mark.create({
  name: "editorTextStyle",

  addAttributes() {
    return {
      styleId: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute(EDITOR_STYLE_ATTRIBUTE),
        renderHTML: (attributes: { styleId?: string | null }) =>
          attributes.styleId ? { [EDITOR_STYLE_ATTRIBUTE]: attributes.styleId } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: `span[${EDITOR_STYLE_ATTRIBUTE}]` }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0]
  },
})

export const EditorTextStyleAttributes = Extension.create({
  name: "editorTextStyleAttributes",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "blockquote"],
        attributes: {
          editorStyleId: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.getAttribute(EDITOR_STYLE_ATTRIBUTE),
            renderHTML: (attributes: { editorStyleId?: string | null }) =>
              attributes.editorStyleId
                ? { [EDITOR_STYLE_ATTRIBUTE]: attributes.editorStyleId }
                : {},
          },
        },
      },
    ]
  },
})

function cssValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
}

function styleDeclarations(
  definition: EditorTextStyleDefinition,
  kind: EditorTextStyleKind,
) {
  const declarations: string[] = []
  if (definition.fontFamily) {
    declarations.push(
      `font-family: ${getFontFamilyCss(definition.fontFamily as TextFontFamily)}`,
    )
  }
  if (definition.fontSize && /^\d+(?:\.\d+)?(?:pt|px|em|rem|%)$/i.test(definition.fontSize)) {
    declarations.push(`font-size: ${definition.fontSize}`)
  }
  if (definition.color && /^#[0-9a-f]{6}$/i.test(definition.color)) {
    declarations.push(`color: ${definition.color}`)
  }
  if (
    definition.highlightColor &&
    /^#[0-9a-f]{6}$/i.test(definition.highlightColor)
  ) {
    declarations.push(
      `background-color: ${definition.highlightColor}`,
    )
  }
  declarations.push(`font-weight: ${definition.bold ? "700" : "400"}`)
  declarations.push(`font-style: ${definition.italic ? "italic" : "normal"}`)
  if (kind === "text" && definition.subscript !== definition.superscript) {
    declarations.push(
      `vertical-align: ${definition.subscript ? "sub" : "super"}`,
      "font-size: 0.83em",
    )
  }
  const decorations = [
    definition.underline ? "underline" : "",
    definition.strike ? "line-through" : "",
  ].filter(Boolean)
  declarations.push(
    `text-decoration: ${decorations.length ? decorations.join(" ") : "none"}`,
  )
  if (kind === "paragraph") {
    if (["left", "center", "right", "justify"].includes(definition.textAlign)) {
      declarations.push(`text-align: ${definition.textAlign} !important`)
    }
    if (["1", "1.15", "1.5", "1.8", "2"].includes(definition.lineHeight)) {
      declarations.push(`line-height: ${definition.lineHeight} !important`)
    }
    if (Number.isFinite(definition.indentLeft) && definition.indentLeft >= 0) {
      declarations.push(`margin-left: ${definition.indentLeft}cm !important`)
    }
    if (Number.isFinite(definition.indentRight) && definition.indentRight >= 0) {
      declarations.push(`margin-right: ${definition.indentRight}cm !important`)
    }
    if (
      Number.isFinite(definition.firstLineIndent) &&
      definition.firstLineIndent >= 0
    ) {
      declarations.push(`text-indent: ${definition.firstLineIndent}cm !important`)
    }
    if ([2, 4, 8].includes(definition.tabSize)) {
      declarations.push(`tab-size: ${definition.tabSize} !important`)
    }
  }
  return declarations.join("; ")
}

export function buildEditorTextStylesCss(styles: EditorTextStyle[]) {
  return styles
    .map((style) => {
      // IDs are UUIDs, but escape the selector as a guard for old or imported data.
      const id = cssValue(style.id)
      const selector = `[${EDITOR_STYLE_ATTRIBUTE}="${id}"]`
      const declarations = styleDeclarations(style.definition, style.kind)
      return `.ProseMirror ${selector} { ${declarations}; }`
    })
    .join("\n")
}

export function readEditorTextStyleFromSelection(
  editor: Editor,
): EditorTextStyleDefinition {
  const currentBlock = editor.state.selection.$from.parent
  const headingLevel = currentBlock.attrs.level
  const blockType =
    currentBlock.type.name === "heading" &&
    [1, 2, 3].includes(headingLevel)
      ? (`heading${headingLevel}` as EditorTextStyleDefinition["blockType"])
      : "paragraph"
  const paragraph = {
    ...editor.getAttributes("paragraph"),
    ...editor.getAttributes("heading"),
  }
  return {
    blockType,
    fontFamily: editor.getAttributes("textFontFamily").fontFamily ?? null,
    fontSize: editor.getAttributes("textFontSize").fontSize ?? null,
    color: editor.getAttributes("textColor").color ?? null,
    highlightColor: editor.isActive("textHighlight") ? "#ffff00" : null,
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    subscript: editor.isActive("subscript"),
    superscript: editor.isActive("superscript"),
    textAlign: paragraph.textAlign ?? "left",
    lineHeight: paragraph.lineHeight ?? "1.8",
    indentLeft: paragraph.indentLeft ?? 0,
    indentRight: paragraph.indentRight ?? 0,
    firstLineIndent: paragraph.firstLineIndent ?? 0,
    tabSize: paragraph.tabSize ?? 4,
  }
}

export function applyEditorTextStyle(editor: Editor, style: EditorTextStyle) {
  if (style.kind === "text") {
    const chain = editor.chain().focus()
    clearCharacterFormatting(chain)
    return chain.setMark("editorTextStyle", { styleId: style.id }).run()
  }

  const { from, to, empty } = editor.state.selection
  const transaction = editor.state.tr
  let changed = false

  const formattingMarks = [
    "bold",
    "italic",
    "strike",
    "underline",
    "textColor",
    "textFontSize",
    "textFontFamily",
    "subscript",
    "superscript",
    "textHighlight",
  ]

  const applyAt = (position: number, node: typeof editor.state.doc) => {
    const blockType = style.definition.blockType ?? "paragraph"
    const isHeading = blockType.startsWith("heading")
    const targetType = isHeading
      ? editor.state.schema.nodes.heading
      : editor.state.schema.nodes.paragraph
    const attributes: Record<string, unknown> = { ...node.attrs }
    delete attributes.level
    if (isHeading) {
      attributes.level = Number(blockType.slice("heading".length))
    }
    attributes.editorStyleId = style.id
    transaction.setNodeMarkup(position, targetType, attributes)
    const contentStart = position + 1
    const contentEnd = position + node.nodeSize - 1
    for (const markName of formattingMarks) {
      const markType = editor.state.schema.marks[markName]
      if (markType) transaction.removeMark(contentStart, contentEnd, markType)
    }
    changed = true
  }

  if (empty) {
    const { $from } = editor.state.selection
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth)
      if (["paragraph", "heading"].includes(node.type.name)) {
        applyAt($from.before(depth), node)
        break
      }
    }
  } else {
    editor.state.doc.nodesBetween(from, to, (node, position) => {
      if (["paragraph", "heading"].includes(node.type.name)) {
        applyAt(position, node)
      }
    })
  }

  if (changed) editor.view.dispatch(transaction.scrollIntoView())
  return changed
}

function clearCharacterFormatting(chain: ReturnType<Editor["chain"]>) {
  for (const mark of [
    "bold",
    "italic",
    "strike",
    "underline",
    "textColor",
    "textFontSize",
    "textFontFamily",
    "subscript",
    "superscript",
    "textHighlight",
  ]) {
    chain.unsetMark(mark)
  }
}

export function getEditorStyleKindForSelection(editor: Editor): EditorTextStyleKind {
  return editor.state.selection.empty ? "paragraph" : "text"
}

export function getAppliedEditorStyleId(editor: Editor) {
  const inlineStyleId = editor.getAttributes("editorTextStyle").styleId
  if (typeof inlineStyleId === "string") return inlineStyleId
  const blockStyleId = editor.getAttributes("paragraph").editorStyleId
  if (typeof blockStyleId === "string") return blockStyleId
  const headingStyleId = editor.getAttributes("heading").editorStyleId
  return typeof headingStyleId === "string" ? headingStyleId : null
}
