import type { Node as ProseMirrorNode } from "@tiptap/pm/model"

export type TextSelectionRange = {
  from: number
  to: number
}

export function findCitationRange(
  document: ProseMirrorNode,
  quote: string,
): TextSelectionRange | null {
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
  if (!needle) return null
  const startIndex = haystack.indexOf(needle)
  if (startIndex < 0) return null
  const from = documentPositions[startIndex]
  const lastPosition = documentPositions[startIndex + needle.length - 1]
  if (from === undefined || lastPosition === undefined) return null
  return { from, to: lastPosition + 1 }
}
