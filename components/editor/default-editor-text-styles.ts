import type { EditorTextStyle, EditorTextStyleDefinition } from "@/types/editor-text-style"
import { DEFAULT_EDITOR_TEXT_STYLE_DEFINITION } from "@/types/editor-text-style"

const BUILT_IN_STYLE_ID_PREFIX = "builtin:"

type BuiltInStyle = {
  id: string
  name: string
  kind: EditorTextStyle["kind"]
  definition: EditorTextStyleDefinition
}

function paragraphStyle(
  changes: Partial<EditorTextStyleDefinition>,
): EditorTextStyleDefinition {
  return {
    ...DEFAULT_EDITOR_TEXT_STYLE_DEFINITION,
    fontFamily: "Lora",
    fontSize: "11pt",
    ...changes,
  }
}

function characterStyle(
  changes: Partial<EditorTextStyleDefinition>,
): EditorTextStyleDefinition {
  return {
    ...DEFAULT_EDITOR_TEXT_STYLE_DEFINITION,
    ...changes,
  }
}

const BUILT_IN_STYLES: BuiltInStyle[] = [
  {
    id: `${BUILT_IN_STYLE_ID_PREFIX}normal-text`,
    name: "Texto normal",
    kind: "paragraph",
    definition: paragraphStyle({}),
  },
  {
    id: `${BUILT_IN_STYLE_ID_PREFIX}main-title`,
    name: "Título principal",
    kind: "paragraph",
    definition: paragraphStyle({
      blockType: "heading1",
      fontSize: "24pt",
      bold: true,
      textAlign: "center",
      lineHeight: "1.15",
    }),
  },
  {
    id: `${BUILT_IN_STYLE_ID_PREFIX}section-title`,
    name: "Título de sección",
    kind: "paragraph",
    definition: paragraphStyle({
      blockType: "heading2",
      fontSize: "18pt",
      bold: true,
      lineHeight: "1.15",
    }),
  },
  {
    id: `${BUILT_IN_STYLE_ID_PREFIX}subtitle`,
    name: "Subtítulo",
    kind: "paragraph",
    definition: paragraphStyle({
      blockType: "heading3",
      fontSize: "14pt",
      italic: true,
      color: "#5f6368",
      lineHeight: "1.15",
    }),
  },
  {
    id: `${BUILT_IN_STYLE_ID_PREFIX}block-quote`,
    name: "Cita en bloque",
    kind: "paragraph",
    definition: paragraphStyle({
      fontSize: "12pt",
      color: "#5f6368",
      italic: true,
      lineHeight: "1.5",
      indentLeft: 1,
      indentRight: 1,
    }),
  },
  {
    id: `${BUILT_IN_STYLE_ID_PREFIX}epigraph`,
    name: "Epígrafe",
    kind: "paragraph",
    definition: paragraphStyle({
      fontSize: "11pt",
      italic: true,
      textAlign: "center",
      lineHeight: "1.5",
    }),
  },
  {
    id: `${BUILT_IN_STYLE_ID_PREFIX}poetry`,
    name: "Verso",
    kind: "paragraph",
    definition: paragraphStyle({
      fontSize: "12pt",
      lineHeight: "1.5",
      indentLeft: 0.75,
    }),
  },
  {
    id: `${BUILT_IN_STYLE_ID_PREFIX}emphasis`,
    name: "Énfasis",
    kind: "text",
    definition: characterStyle({ italic: true }),
  },
  {
    id: `${BUILT_IN_STYLE_ID_PREFIX}strong-emphasis`,
    name: "Énfasis fuerte",
    kind: "text",
    definition: characterStyle({ bold: true }),
  },
  {
    id: `${BUILT_IN_STYLE_ID_PREFIX}inline-code`,
    name: "Código en línea",
    kind: "text",
    definition: characterStyle({
      fontFamily: "Courier New",
      fontSize: "10pt",
      color: "#5f6368",
    }),
  },
]

export function createDefaultEditorTextStyles(projectId: string): EditorTextStyle[] {
  return BUILT_IN_STYLES.map((style) => ({
    ...style,
    projectId,
    definition: { ...style.definition },
    isActive: true,
    createdAt: "1970-01-01T00:00:00.000Z",
    updatedAt: "1970-01-01T00:00:00.000Z",
  }))
}

export function isDefaultEditorTextStyle(style: EditorTextStyle) {
  return style.id.startsWith(BUILT_IN_STYLE_ID_PREFIX)
}
