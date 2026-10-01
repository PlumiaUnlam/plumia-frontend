export type EditorTextStyleKind = "text" | "paragraph"

export type EditorTextStyleDefinition = {
  blockType: "paragraph" | "heading1" | "heading2" | "heading3"
  fontFamily: string | null
  fontSize: string | null
  color: string | null
  highlightColor: string | null
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  subscript: boolean
  superscript: boolean
  textAlign: "left" | "center" | "right" | "justify"
  lineHeight: "1" | "1.15" | "1.5" | "1.8" | "2"
  indentLeft: number
  indentRight: number
  firstLineIndent: number
  tabSize: 2 | 4 | 8
}

export type EditorTextStyle = {
  id: string
  projectId: string
  name: string
  kind: EditorTextStyleKind
  definition: EditorTextStyleDefinition
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SaveEditorTextStyleInput = Pick<
  EditorTextStyle,
  "name" | "kind" | "definition"
> & { id?: string }

export const DEFAULT_EDITOR_TEXT_STYLE_DEFINITION: EditorTextStyleDefinition = {
  blockType: "paragraph",
  fontFamily: null,
  fontSize: null,
  color: null,
  highlightColor: null,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  subscript: false,
  superscript: false,
  textAlign: "left",
  lineHeight: "1.8",
  indentLeft: 0,
  indentRight: 0,
  firstLineIndent: 0,
  tabSize: 4,
}
