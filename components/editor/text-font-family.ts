import { Mark } from "@tiptap/core"
import type { Editor } from "@tiptap/react"

export type TextFontCategory =
  | "sans-serif"
  | "serif"
  | "monospace"
  | "handwriting"
  | "display"

type TextFontFamilyOption = {
  value: string
  label: string
  category: TextFontCategory
  cssName?: string
}

export const SYSTEM_FONT_FAMILIES = [
  { value: "Arial", label: "Arial", category: "sans-serif" },
  { value: "Times New Roman", label: "Times New Roman", category: "serif" },
  { value: "Calibri", label: "Calibri", category: "sans-serif" },
  { value: "Verdana", label: "Verdana", category: "sans-serif" },
  { value: "Georgia", label: "Georgia", category: "serif" },
  { value: "Courier New", label: "Courier New", category: "monospace" },
  {
    value: "Comic Sans",
    label: "Comic Sans",
    cssName: "Comic Sans MS",
    category: "handwriting",
  },
] as const satisfies readonly TextFontFamilyOption[]

const GOOGLE_FONT_CATEGORIES = {
  "ABeeZee": "sans-serif",
  "Alegreya": "serif",
  "Allura": "handwriting",
  "Almendra": "serif",
  "Amatic SC": "handwriting",
  "Arapey": "serif",
  "Atkinson Hyperlegible": "sans-serif",
  "Bangers": "display",
  "Barlow": "sans-serif",
  "Barlow Condensed": "sans-serif",
  "Bebas Neue": "display",
  "Bodoni Moda": "serif",
  "Bungee": "display",
  "Bree Serif": "serif",
  "Cabin": "sans-serif",
  "Cardo": "serif",
  "Caveat": "handwriting",
  "Cedarville Cursive": "handwriting",
  "Chakra Petch": "sans-serif",
  "Cinzel": "serif",
  "Cinzel Decorative": "display",
  "Comfortaa": "sans-serif",
  "Cormorant Garamond": "serif",
  "Cormorant Infant": "serif",
  "Courier Prime": "monospace",
  "Crimson Pro": "serif",
  "Crimson Text": "serif",
  "Cutive Mono": "monospace",
  "Dancing Script": "handwriting",
  "DM Sans": "sans-serif",
  "DM Serif Display": "serif",
  "EB Garamond": "serif",
  "Figtree": "sans-serif",
  "Fredoka": "sans-serif",
  "GFS Didot": "serif",
  "Great Vibes": "handwriting",
  "Grenze Gotisch": "display",
  "Heebo": "sans-serif",
  "IBM Plex Mono": "monospace",
  "IBM Plex Sans": "sans-serif",
  "IBM Plex Serif": "serif",
  "IM Fell English": "serif",
  "Inconsolata": "monospace",
  "Inter": "sans-serif",
  "Italianno": "handwriting",
  "Josefin Sans": "sans-serif",
  "JetBrains Mono": "monospace",
  "Kaushan Script": "handwriting",
  "Lato": "sans-serif",
  "Lexend": "sans-serif",
  "Libre Baskerville": "serif",
  "Libre Caslon Text": "serif",
  "Lilita One": "display",
  "Literata": "serif",
  "Lora": "serif",
  "Manrope": "sans-serif",
  "Marck Script": "handwriting",
  "MedievalSharp": "display",
  "Merriweather": "serif",
  "Metal Mania": "display",
  "Montserrat": "sans-serif",
  "Mulish": "sans-serif",
  "Newsreader": "serif",
  "Noto Serif": "serif",
  "Nunito": "sans-serif",
  "Old Standard TT": "serif",
  "Open Sans": "sans-serif",
  "Oswald": "sans-serif",
  "Outfit": "sans-serif",
  "Overpass": "sans-serif",
  "Petit Formal Script": "handwriting",
  "Pacifico": "handwriting",
  "Pinyon Script": "handwriting",
  "Pirata One": "display",
  "Playfair Display": "serif",
  "Prata": "serif",
  "PT Serif": "serif",
  "Plus Jakarta Sans": "sans-serif",
  "Poppins": "sans-serif",
  "Quicksand": "sans-serif",
  "Raleway": "sans-serif",
  "Righteous": "display",
  "Rubik": "sans-serif",
  "Shadows Into Light": "handwriting",
  "Share Tech Mono": "monospace",
  "Sorts Mill Goudy": "serif",
  "Source Code Pro": "monospace",
  "Source Sans 3": "sans-serif",
  "Source Serif 4": "serif",
  "Space Mono": "monospace",
  "Spectral": "serif",
  "Rouge Script": "handwriting",
  "Tangerine": "handwriting",
  "UnifrakturMaguntia": "display",
  "Vollkorn": "serif",
  "VT323": "monospace",
  "Work Sans": "sans-serif",
  "Zilla Slab": "serif",
} as const satisfies Record<string, TextFontCategory>

type GoogleFontFamily = keyof typeof GOOGLE_FONT_CATEGORIES
type GoogleFontOption = {
  value: GoogleFontFamily
  label: GoogleFontFamily
  category: TextFontCategory
}

const GOOGLE_FONT_NAMES = Object.keys(
  GOOGLE_FONT_CATEGORIES,
) as GoogleFontFamily[]

export const GOOGLE_FONT_FAMILIES: readonly GoogleFontOption[] =
  GOOGLE_FONT_NAMES.map((value) => ({
    value,
    label: value,
    category: GOOGLE_FONT_CATEGORIES[value],
  }))

const GOOGLE_FONTS_BY_CATEGORY = {
  "Serif editoriales": GOOGLE_FONT_FAMILIES.filter(
    (font) => font.category === "serif",
  ).sort((left, right) => left.label.localeCompare(right.label)),
  "Sans serif": GOOGLE_FONT_FAMILIES.filter(
    (font) => font.category === "sans-serif",
  ).sort((left, right) => left.label.localeCompare(right.label)),
  Monoespaciadas: GOOGLE_FONT_FAMILIES.filter(
    (font) => font.category === "monospace",
  ).sort((left, right) => left.label.localeCompare(right.label)),
  Manuscritas: GOOGLE_FONT_FAMILIES.filter(
    (font) => font.category === "handwriting",
  ).sort((left, right) => left.label.localeCompare(right.label)),
  "Display y ficción": GOOGLE_FONT_FAMILIES.filter(
    (font) => font.category === "display",
  ).sort((left, right) => left.label.localeCompare(right.label)),
} as const

export const TEXT_FONT_FAMILY_GROUPS = [
  { label: "Fuentes del sistema", options: SYSTEM_FONT_FAMILIES },
  ...Object.entries(GOOGLE_FONTS_BY_CATEGORY).map(([label, options]) => ({
    label,
    options,
  })),
] as const

const ALL_FONT_FAMILIES = [
  ...SYSTEM_FONT_FAMILIES,
  ...GOOGLE_FONT_FAMILIES,
] as const

type AllFontFamilyOption = (typeof ALL_FONT_FAMILIES)[number]

export type TextFontFamily = (typeof ALL_FONT_FAMILIES)[number]["value"]

function getCssFontName(option: AllFontFamilyOption) {
  return "cssName" in option ? option.cssName : undefined
}

function findFontOption(value: string): TextFontFamilyOption | undefined {
  return ALL_FONT_FAMILIES.find(
    (option) =>
      option.value.toLowerCase() === value.toLowerCase() ||
      getCssFontName(option)?.toLowerCase() === value.toLowerCase(),
  )
}

function parseFontFamily(
  value: string | null | undefined,
): TextFontFamily | null {
  if (!value) return null

  const family = value
    .split(",")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "")
  const option = findFontOption(family)
  return option ? (option.value as TextFontFamily) : null
}

export function getFontFamilyLabel(fontFamily: TextFontFamily): string {
  return findFontOption(fontFamily)?.label ?? "Lora"
}

export function findTextFontFamilyByName(value: string): TextFontFamily | null {
  const normalizedValue = value.trim().replace(/\s+/g, " ").toLowerCase()
  if (!normalizedValue) return null

  const exactMatch = ALL_FONT_FAMILIES.find(
    (option) =>
      option.label.toLowerCase() === normalizedValue ||
      getCssFontName(option)?.toLowerCase() === normalizedValue,
  )
  if (exactMatch) return exactMatch.value as TextFontFamily

  const partialMatches = ALL_FONT_FAMILIES.filter(
    (option) =>
      option.label.toLowerCase().startsWith(normalizedValue) ||
      getCssFontName(option)?.toLowerCase().startsWith(normalizedValue),
  )
  return partialMatches.length === 1
    ? (partialMatches[0].value as TextFontFamily)
    : null
}

export function getFontFamilyCss(fontFamily: TextFontFamily): string {
  const option = findFontOption(fontFamily)
  const family = option?.cssName ?? option?.value ?? "Lora"
  let fallback = "sans-serif"
  if (option?.category === "serif") fallback = "serif"
  else if (option?.category === "monospace") fallback = "monospace"
  else if (option?.category === "handwriting") fallback = "cursive"

  return `'${family}', ${fallback}`
}

/** Stores font family as a mark so it survives JSON autosaves. */
export const TextFontFamilyFormatting = Mark.create({
  name: "textFontFamily",

  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          parseFontFamily(
            element.dataset.fontFamily || element.style.fontFamily,
          ),
        renderHTML: (attributes: { fontFamily?: TextFontFamily | null }) => {
          const fontFamily = attributes.fontFamily
          if (!fontFamily || !findFontOption(fontFamily)) return {}

          return {
            "data-font-family": fontFamily,
            style: `font-family: ${getFontFamilyCss(fontFamily)}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      { tag: "span[data-font-family]" },
      { tag: "span[style*='font-family']" },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0]
  },
})

export function getActiveTextFontFamily(
  editor: Editor,
): TextFontFamily | null {
  const value = editor.getAttributes("textFontFamily").fontFamily
  return typeof value === "string" ? parseFontFamily(value) : null
}

export function applyTextFontFamily(
  editor: Editor,
  fontFamily: TextFontFamily | null,
) {
  const chain = editor.chain().focus()

  if (!fontFamily) {
    return chain.unsetMark("textFontFamily").run()
  }

  return chain.setMark("textFontFamily", { fontFamily }).run()
}
