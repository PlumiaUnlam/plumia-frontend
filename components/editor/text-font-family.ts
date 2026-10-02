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

export const GOOGLE_FONT_FAMILIES = [
  { value: "ABeeZee", label: "ABeeZee", category: "sans-serif" },
  { value: "Alegreya", label: "Alegreya", category: "serif" },
  { value: "Allura", label: "Allura", category: "handwriting" },
  { value: "Almendra", label: "Almendra", category: "serif" },
  { value: "Amatic SC", label: "Amatic SC", category: "handwriting" },
  { value: "Arapey", label: "Arapey", category: "serif" },
  {
    value: "Atkinson Hyperlegible",
    label: "Atkinson Hyperlegible",
    category: "sans-serif",
  },
  { value: "Bangers", label: "Bangers", category: "display" },
  { value: "Barlow", label: "Barlow", category: "sans-serif" },
  {
    value: "Barlow Condensed",
    label: "Barlow Condensed",
    category: "sans-serif",
  },
  { value: "Bebas Neue", label: "Bebas Neue", category: "display" },
  { value: "Bodoni Moda", label: "Bodoni Moda", category: "serif" },
  { value: "Bungee", label: "Bungee", category: "display" },
  { value: "Bree Serif", label: "Bree Serif", category: "serif" },
  { value: "Cabin", label: "Cabin", category: "sans-serif" },
  { value: "Cardo", label: "Cardo", category: "serif" },
  { value: "Caveat", label: "Caveat", category: "handwriting" },
  {
    value: "Cedarville Cursive",
    label: "Cedarville Cursive",
    category: "handwriting",
  },
  { value: "Chakra Petch", label: "Chakra Petch", category: "sans-serif" },
  { value: "Cinzel", label: "Cinzel", category: "serif" },
  {
    value: "Cinzel Decorative",
    label: "Cinzel Decorative",
    category: "display",
  },
  { value: "Comfortaa", label: "Comfortaa", category: "sans-serif" },
  {
    value: "Cormorant Garamond",
    label: "Cormorant Garamond",
    category: "serif",
  },
  { value: "Cormorant Infant", label: "Cormorant Infant", category: "serif" },
  { value: "Courier Prime", label: "Courier Prime", category: "monospace" },
  { value: "Crimson Pro", label: "Crimson Pro", category: "serif" },
  { value: "Crimson Text", label: "Crimson Text", category: "serif" },
  { value: "Cutive Mono", label: "Cutive Mono", category: "monospace" },
  {
    value: "Dancing Script",
    label: "Dancing Script",
    category: "handwriting",
  },
  { value: "DM Sans", label: "DM Sans", category: "sans-serif" },
  { value: "DM Serif Display", label: "DM Serif Display", category: "serif" },
  { value: "EB Garamond", label: "EB Garamond", category: "serif" },
  { value: "Figtree", label: "Figtree", category: "sans-serif" },
  { value: "Fredoka", label: "Fredoka", category: "sans-serif" },
  { value: "GFS Didot", label: "GFS Didot", category: "serif" },
  { value: "Great Vibes", label: "Great Vibes", category: "handwriting" },
  { value: "Grenze Gotisch", label: "Grenze Gotisch", category: "display" },
  { value: "Heebo", label: "Heebo", category: "sans-serif" },
  { value: "IBM Plex Mono", label: "IBM Plex Mono", category: "monospace" },
  { value: "IBM Plex Sans", label: "IBM Plex Sans", category: "sans-serif" },
  { value: "IBM Plex Serif", label: "IBM Plex Serif", category: "serif" },
  { value: "IM Fell English", label: "IM Fell English", category: "serif" },
  { value: "Inconsolata", label: "Inconsolata", category: "monospace" },
  { value: "Inter", label: "Inter", category: "sans-serif" },
  { value: "Italianno", label: "Italianno", category: "handwriting" },
  { value: "Josefin Sans", label: "Josefin Sans", category: "sans-serif" },
  {
    value: "JetBrains Mono",
    label: "JetBrains Mono",
    category: "monospace",
  },
  { value: "Kaushan Script", label: "Kaushan Script", category: "handwriting" },
  { value: "Lato", label: "Lato", category: "sans-serif" },
  { value: "Lexend", label: "Lexend", category: "sans-serif" },
  {
    value: "Libre Baskerville",
    label: "Libre Baskerville",
    category: "serif",
  },
  { value: "Libre Caslon Text", label: "Libre Caslon Text", category: "serif" },
  { value: "Lilita One", label: "Lilita One", category: "display" },
  { value: "Literata", label: "Literata", category: "serif" },
  { value: "Lora", label: "Lora", category: "serif" },
  { value: "Manrope", label: "Manrope", category: "sans-serif" },
  { value: "Marck Script", label: "Marck Script", category: "handwriting" },
  { value: "MedievalSharp", label: "MedievalSharp", category: "display" },
  { value: "Merriweather", label: "Merriweather", category: "serif" },
  { value: "Metal Mania", label: "Metal Mania", category: "display" },
  { value: "Montserrat", label: "Montserrat", category: "sans-serif" },
  { value: "Mulish", label: "Mulish", category: "sans-serif" },
  { value: "Newsreader", label: "Newsreader", category: "serif" },
  { value: "Noto Serif", label: "Noto Serif", category: "serif" },
  { value: "Nunito", label: "Nunito", category: "sans-serif" },
  { value: "Old Standard TT", label: "Old Standard TT", category: "serif" },
  { value: "Open Sans", label: "Open Sans", category: "sans-serif" },
  { value: "Oswald", label: "Oswald", category: "sans-serif" },
  { value: "Outfit", label: "Outfit", category: "sans-serif" },
  { value: "Overpass", label: "Overpass", category: "sans-serif" },
  {
    value: "Petit Formal Script",
    label: "Petit Formal Script",
    category: "handwriting",
  },
  { value: "Pacifico", label: "Pacifico", category: "handwriting" },
  { value: "Pinyon Script", label: "Pinyon Script", category: "handwriting" },
  { value: "Pirata One", label: "Pirata One", category: "display" },
  {
    value: "Playfair Display",
    label: "Playfair Display",
    category: "serif",
  },
  { value: "Prata", label: "Prata", category: "serif" },
  { value: "PT Serif", label: "PT Serif", category: "serif" },
  {
    value: "Plus Jakarta Sans",
    label: "Plus Jakarta Sans",
    category: "sans-serif",
  },
  { value: "Poppins", label: "Poppins", category: "sans-serif" },
  { value: "Quicksand", label: "Quicksand", category: "sans-serif" },
  { value: "Raleway", label: "Raleway", category: "sans-serif" },
  { value: "Righteous", label: "Righteous", category: "display" },
  { value: "Rubik", label: "Rubik", category: "sans-serif" },
  {
    value: "Shadows Into Light",
    label: "Shadows Into Light",
    category: "handwriting",
  },
  { value: "Share Tech Mono", label: "Share Tech Mono", category: "monospace" },
  { value: "Sorts Mill Goudy", label: "Sorts Mill Goudy", category: "serif" },
  {
    value: "Source Code Pro",
    label: "Source Code Pro",
    category: "monospace",
  },
  { value: "Source Sans 3", label: "Source Sans 3", category: "sans-serif" },
  { value: "Source Serif 4", label: "Source Serif 4", category: "serif" },
  { value: "Space Mono", label: "Space Mono", category: "monospace" },
  { value: "Spectral", label: "Spectral", category: "serif" },
  { value: "Rouge Script", label: "Rouge Script", category: "handwriting" },
  { value: "Tangerine", label: "Tangerine", category: "handwriting" },
  {
    value: "UnifrakturMaguntia",
    label: "UnifrakturMaguntia",
    category: "display",
  },
  { value: "Vollkorn", label: "Vollkorn", category: "serif" },
  { value: "VT323", label: "VT323", category: "monospace" },
  { value: "Work Sans", label: "Work Sans", category: "sans-serif" },
  { value: "Zilla Slab", label: "Zilla Slab", category: "serif" },
] as const satisfies readonly TextFontFamilyOption[]

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
