import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

import type { AuthorAnnotation } from "@/types/author-annotation"

export const authorAnnotationDecorationKey = new PluginKey<DecorationSet>(
  "authorAnnotationDecorations",
)

export function findAuthorAnnotationAnchor(
  doc: Parameters<typeof DecorationSet.create>[0],
  annotation: AuthorAnnotation,
) {
  const from = annotation.anchorFrom ?? -1
  const to = annotation.anchorTo ?? -1
  const quote = annotation.quote?.trim() ?? ""
  if (from >= 1 && to > from && to <= doc.content.size) {
    const anchoredText = doc.textBetween(from, to, "\n").trim()
    if (anchoredText === quote) return { from, to }
  }

  const textParts: string[] = []
  const positions: number[] = []
  doc.descendants((node, position) => {
    if (!node.isTextblock) return
    if (textParts.length > 0) {
      textParts.push("\n")
      positions.push(position)
    }
    const text = node.textContent
    textParts.push(text)
    for (let index = 0; index < text.length; index += 1) {
      positions.push(position + 1 + index)
    }
  })

  const text = textParts.join("")
  if (!quote) return null

  let matchIndex = text.indexOf(quote)
  if (matchIndex === -1) return null
  let bestIndex = matchIndex
  let bestDistance = Math.abs((positions[matchIndex] ?? from) - from)
  while (matchIndex !== -1) {
    const distance = Math.abs((positions[matchIndex] ?? from) - from)
    if (distance < bestDistance) {
      bestIndex = matchIndex
      bestDistance = distance
    }
    matchIndex = text.indexOf(quote, matchIndex + 1)
  }

  const anchorFrom = positions[bestIndex]
  const anchorTo = (positions[bestIndex + quote.length - 1] ?? -1) + 1
  if (
    anchorFrom === undefined ||
    anchorTo <= anchorFrom ||
    anchorTo > doc.content.size
  ) {
    return null
  }
  return { from: anchorFrom, to: anchorTo }
}

function createDecorations(
  doc: Parameters<typeof DecorationSet.create>[0],
  annotations: AuthorAnnotation[],
) {
  const decorations = annotations.flatMap((annotation) => {
    const anchor = findAuthorAnnotationAnchor(doc, annotation)
    if (!anchor) return []

    return [
      Decoration.inline(anchor.from, anchor.to, {
        class: "author-annotation-anchor",
        "data-author-annotation-id": annotation.id,
      }),
    ]
  })

  return DecorationSet.create(doc, decorations)
}

export const AuthorAnnotationDecorations = Extension.create({
  name: "authorAnnotationDecorations",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: authorAnnotationDecorationKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, decorations) {
            const annotations = transaction.getMeta(authorAnnotationDecorationKey) as
              | AuthorAnnotation[]
              | undefined

            if (annotations) return createDecorations(transaction.doc, annotations)
            return decorations.map(transaction.mapping, transaction.doc)
          },
        },
        props: {
          decorations(state) {
            return (
              authorAnnotationDecorationKey.getState(state) ?? DecorationSet.empty
            )
          },
        },
      }),
    ]
  },
})
