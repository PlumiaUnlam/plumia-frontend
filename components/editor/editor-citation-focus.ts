import { Extension } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export type CitationHighlightMeta =
  | { ranges: TextSelectionRange[] }
  | { clear: true }

export const citationFocusPluginKey = new PluginKey<DecorationSet>(
  "plumCitationFocus",
)

export const CitationFocus = Extension.create({
  name: "citationFocus",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: citationFocusPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, decorations) {
            const meta = transaction.getMeta(
              citationFocusPluginKey,
            ) as CitationHighlightMeta | undefined
            if (meta && "clear" in meta) return DecorationSet.empty
            if (meta && "ranges" in meta) {
              return DecorationSet.create(
                transaction.doc,
                meta.ranges.map((range) =>
                  Decoration.inline(range.from, range.to, {
                    style:
                      "border-radius:.28rem;background:color-mix(in srgb,var(--primary) 16%,transparent);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 16%,transparent);box-decoration-break:clone;-webkit-box-decoration-break:clone;",
                    "data-citation-highlight": "true",
                  }),
                ),
              )
            }
            return transaction.docChanged
              ? decorations.map(transaction.mapping, transaction.doc)
              : decorations
          },
        },
        props: {
          decorations: (state) => citationFocusPluginKey.getState(state),
        },
      }),
    ]
  },
})

export type TextSelectionRange = {
  from: number
  to: number
}

export function findCitationRanges(
  document: ProseMirrorNode,
  quote: string,
): TextSelectionRange[] {
  const searchableCharacters: string[] = []
  const documentPositions: number[] = []
  let previousTextEnd = -1

  const append = (character: string, position: number) => {
    if (/\s/u.test(character)) {
      if (
        searchableCharacters.length > 0 &&
        searchableCharacters.at(-1) !== " "
      ) {
        searchableCharacters.push(" ")
        documentPositions.push(position)
      }
      return
    }
    searchableCharacters.push(character.toLocaleLowerCase())
    documentPositions.push(position)
  }

  document.descendants((node, position) => {
    if (!node.isText || !node.text) return
    if (
      searchableCharacters.length > 0 &&
      searchableCharacters.at(-1) !== " " &&
      position > previousTextEnd &&
      !/^\s/u.test(node.text)
    ) {
      append(" ", position)
    }
    for (let index = 0; index < node.text.length; index += 1) {
      append(node.text[index] ?? "", position + index)
    }
    previousTextEnd = position + node.text.length
  })

  const haystack = searchableCharacters.join("")
  const needle = quote.replace(/\s+/gu, " ").trim().toLocaleLowerCase()
  if (!needle) return []

  const ranges: TextSelectionRange[] = []
  let startIndex = haystack.indexOf(needle)
  while (startIndex >= 0) {
    const from = documentPositions[startIndex]
    const lastPosition = documentPositions[startIndex + needle.length - 1]
    if (from !== undefined && lastPosition !== undefined) {
      ranges.push({ from, to: lastPosition + 1 })
    }
    startIndex = haystack.indexOf(needle, startIndex + needle.length)
  }
  return ranges
}
