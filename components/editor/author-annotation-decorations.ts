import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

import type { AuthorAnnotation } from "@/types/author-annotation"

type AuthorAnnotationDecorationState = {
  decorations: DecorationSet
  annotations: AuthorAnnotation[]
  showMarkers: boolean
  focusedAnnotationId: string | null
}

type AuthorAnnotationDecorationMeta = {
  annotations?: AuthorAnnotation[]
  showMarkers?: boolean
  focusedAnnotationId?: string | null
}

export const authorAnnotationDecorationKey = new PluginKey<AuthorAnnotationDecorationState>(
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

export function sortAuthorAnnotationsByTextPosition(
  doc: Parameters<typeof DecorationSet.create>[0],
  annotations: AuthorAnnotation[],
) {
  return annotations
    .map((annotation, originalIndex) => ({
      annotation,
      originalIndex,
      anchor: findAuthorAnnotationAnchor(doc, annotation),
      createdAt: Date.parse(annotation.createdAt),
    }))
    .sort((left, right) => {
      if (left.anchor && right.anchor) {
        const positionOrder =
          left.anchor.from - right.anchor.from || left.anchor.to - right.anchor.to
        if (positionOrder !== 0) return positionOrder
      } else if (left.anchor) {
        return -1
      } else if (right.anchor) {
        return 1
      }

      const leftCreatedAt = Number.isNaN(left.createdAt) ? 0 : left.createdAt
      const rightCreatedAt = Number.isNaN(right.createdAt) ? 0 : right.createdAt
      return leftCreatedAt - rightCreatedAt || left.originalIndex - right.originalIndex
    })
    .map(({ annotation }) => annotation)
}

function createDecorations(
  doc: Parameters<typeof DecorationSet.create>[0],
  annotations: AuthorAnnotation[],
  showMarkers: boolean,
  focusedAnnotationId: string | null,
) {
  const markerOffsetsByBlock = new Map<number, number>()
  let markerNumber = 0
  const decorations = annotations.flatMap((annotation) => {
    const anchor = findAuthorAnnotationAnchor(doc, annotation)
    if (!anchor) return []

    const itemDecorations: Decoration[] = []
    if (annotation.id === focusedAnnotationId) {
      itemDecorations.push(
        Decoration.inline(anchor.from, anchor.to, {
          class: "author-annotation-anchor",
          "data-author-annotation-id": annotation.id,
        }),
      )
    }

    if (showMarkers) {
      markerNumber += 1
      const currentMarkerNumber = markerNumber
      const blockStart = findTextblockStart(doc, anchor.to)
      const markerOffset = markerOffsetsByBlock.get(blockStart) ?? 0
      markerOffsetsByBlock.set(blockStart, markerOffset + 1)
      itemDecorations.push(
        Decoration.widget(
          anchor.to,
          () =>
            createAnnotationMarker(
              annotation,
              currentMarkerNumber,
              markerOffset,
            ),
          {
            key: `author-annotation-marker-${annotation.id}`,
            side: 1,
            stopEvent: (event) =>
              event.type === "mousedown" || event.type === "click",
          },
        ),
      )
    }

    return itemDecorations
  })

  return DecorationSet.create(doc, decorations)
}

function findTextblockStart(
  doc: Parameters<typeof DecorationSet.create>[0],
  position: number,
) {
  const resolvedPosition = doc.resolve(position)
  for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
    if (resolvedPosition.node(depth).isTextblock) {
      return resolvedPosition.before(depth)
    }
  }
  return position
}

function createAnnotationMarker(
  annotation: AuthorAnnotation,
  markerNumber: number,
  offset: number,
) {
  const button = document.createElement("button")
  button.type = "button"
  button.contentEditable = "false"
  button.dataset.authorAnnotationMarkerId = annotation.id
  button.className = [
    "author-annotation-marker",
    "absolute -right-10 top-1 z-10 inline-flex size-6 items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b98ad2]",
    annotation.resolvedAt
      ? "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-800"
      : "border-[#dfc8ec] bg-[#fbf6ff] text-[#8246a0] hover:bg-[#f0e2f7] dark:border-violet-800 dark:bg-[#2b1d33] dark:text-violet-300 dark:hover:bg-violet-950",
  ].join(" ")
  button.setAttribute(
    "aria-label",
    annotation.resolvedAt
      ? `Abrir anotación privada ${markerNumber}, resuelta`
      : `Abrir anotación privada ${markerNumber}, abierta`,
  )
  if (offset > 0) button.style.transform = `translateY(${offset * 1.75}rem)`
  button.title = annotation.resolvedAt
    ? "Anotación resuelta"
    : "Abrir anotación privada"
  button.addEventListener("mousedown", (event) => event.preventDefault())

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  icon.setAttribute("viewBox", "0 0 24 24")
  icon.setAttribute("width", "14")
  icon.setAttribute("height", "14")
  icon.setAttribute("fill", "none")
  icon.setAttribute("stroke", "currentColor")
  icon.setAttribute("stroke-width", "2")
  icon.setAttribute("stroke-linecap", "round")
  icon.setAttribute("stroke-linejoin", "round")
  icon.setAttribute("aria-hidden", "true")

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.setAttribute(
    "d",
    "M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z",
  )
  icon.append(path)
  button.append(icon)

  const badge = document.createElement("span")
  badge.className = "absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-[#8246a0] text-[9px] font-semibold leading-none text-white"
  badge.setAttribute("aria-hidden", "true")
  badge.textContent = String(markerNumber)
  button.append(badge)
  return button
}

/* Inline marks appear only on the focused annotation; markers can stay visible
 * while the sidebar is closed so they can reopen it directly. */

export const AuthorAnnotationDecorations = Extension.create({
  name: "authorAnnotationDecorations",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: authorAnnotationDecorationKey,
        state: {
          init: (): AuthorAnnotationDecorationState => ({
            decorations: DecorationSet.empty,
            annotations: [],
            showMarkers: false,
            focusedAnnotationId: null,
          }),
          apply(transaction, current) {
            const meta = transaction.getMeta(
              authorAnnotationDecorationKey,
            ) as AuthorAnnotationDecorationMeta | undefined

            if (meta) {
              const annotations = meta.annotations ?? current.annotations
              const showMarkers = meta.showMarkers ?? current.showMarkers
              const focusedAnnotationId =
                "focusedAnnotationId" in meta
                  ? (meta.focusedAnnotationId ?? null)
                  : current.focusedAnnotationId
              return {
                decorations: createDecorations(
                  transaction.doc,
                  annotations,
                  showMarkers,
                  focusedAnnotationId,
                ),
                annotations,
                showMarkers,
                focusedAnnotationId,
              }
            }

            return {
              ...current,
              decorations: current.decorations.map(
                transaction.mapping,
                transaction.doc,
              ),
            }
          },
        },
        props: {
          decorations(state) {
            return (
              authorAnnotationDecorationKey.getState(state)?.decorations ??
              DecorationSet.empty
            )
          },
        },
      }),
    ]
  },
})
