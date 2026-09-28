import { Extension } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { Plugin, PluginKey } from "@tiptap/pm/state"

export type EditorSearchRange = { from: number; to: number }

export type EditorSearchHighlightMeta =
  | { ranges: EditorSearchRange[]; activeRange?: EditorSearchRange | null }
  | { clear: true }

export const editorSearchFocusPluginKey = new PluginKey<DecorationSet>(
  "plumEditorSearchFocus",
)

export const EditorSearchFocus = Extension.create({
  name: "editorSearchFocus",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: editorSearchFocusPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, decorations) {
            const meta = transaction.getMeta(
              editorSearchFocusPluginKey,
            ) as EditorSearchHighlightMeta | undefined

            if (meta && "clear" in meta) return DecorationSet.empty
            if (meta && "ranges" in meta) {
              return DecorationSet.create(
                transaction.doc,
                meta.ranges.map((range) => {
                  const isActive =
                    meta.activeRange?.from === range.from &&
                    meta.activeRange.to === range.to

                  return Decoration.inline(range.from, range.to, {
                    class: isActive
                      ? "editor-search-focus"
                      : "editor-search-match",
                    "data-editor-search-focus": isActive ? "true" : "false",
                  })
                }),
              )
            }

            return transaction.docChanged
              ? decorations.map(transaction.mapping, transaction.doc)
              : decorations
          },
        },
        props: {
          decorations: (state) => editorSearchFocusPluginKey.getState(state),
        },
      }),
    ]
  },
})

export function findEditorSearchRange(
  document: ProseMirrorNode,
  query: string,
  occurrence: number,
): EditorSearchRange | null {
  return findEditorSearchRanges(document, query)[occurrence] ?? null
}

export function findEditorSearchRanges(
  document: ProseMirrorNode,
  query: string,
): EditorSearchRange[] {
  const queryLower = query.trim().toLocaleLowerCase()
  if (!queryLower) return []

  const ranges: EditorSearchRange[] = []

  document.descendants((node, position) => {
    if (!node.isText || !node.text) return

    const textLower = node.text.toLocaleLowerCase()
    let offset = textLower.indexOf(queryLower)
    while (offset >= 0) {
      ranges.push({
        from: position + offset,
        to: position + offset + queryLower.length,
      })
      offset = textLower.indexOf(
        queryLower,
        offset + Math.max(queryLower.length, 1),
      )
    }
  })

  return ranges
}
