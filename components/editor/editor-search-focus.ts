import { Extension } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { Plugin, PluginKey } from "@tiptap/pm/state"

export type EditorSearchHighlightMeta =
  | { from: number; to: number }
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
            if (meta && "from" in meta) {
              return DecorationSet.create(transaction.doc, [
                Decoration.inline(meta.from, meta.to, {
                  class: "editor-search-focus",
                  "data-editor-search-focus": "true",
                }),
              ])
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
): { from: number; to: number } | null {
  const queryLower = query.trim().toLocaleLowerCase()
  if (!queryLower || occurrence < 0) return null

  let currentOccurrence = 0
  let result: { from: number; to: number } | null = null

  document.descendants((node, position) => {
    if (result || !node.isText || !node.text) return

    const textLower = node.text.toLocaleLowerCase()
    let offset = textLower.indexOf(queryLower)
    while (offset >= 0) {
      if (currentOccurrence === occurrence) {
        result = {
          from: position + offset,
          to: position + offset + queryLower.length,
        }
        return
      }

      currentOccurrence += 1
      offset = textLower.indexOf(
        queryLower,
        offset + Math.max(queryLower.length, 1),
      )
    }
  })

  return result
}

