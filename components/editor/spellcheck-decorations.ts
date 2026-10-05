import { Extension } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type NSpell from "nspell"

export type MisspelledRange = { from: number; to: number; word: string }

type DecorationMeta =
  | { mode: "replace-all"; ranges: MisspelledRange[] }
  | { mode: "replace-range"; from: number; to: number; ranges: MisspelledRange[] }

export const spellcheckDecorationKey = new PluginKey<DecorationSet>("spellcheckDecorations")

export const SpellcheckDecorations = Extension.create({
  name: "spellcheckDecorations",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: spellcheckDecorationKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, current) {
            const meta = transaction.getMeta(spellcheckDecorationKey) as DecorationMeta | undefined
            const mapped = transaction.docChanged ? current.map(transaction.mapping, transaction.doc) : current
            if (!meta) return mapped

            const additions = meta.ranges.map(({ from, to }) =>
              Decoration.inline(from, to, { class: "spellcheck-misspelled" }),
            )
            if (meta.mode === "replace-all") {
              return DecorationSet.create(transaction.doc, additions)
            }

            return mapped
              .remove(mapped.find(meta.from, meta.to))
              .add(transaction.doc, additions)
          },
        },
        props: {
          decorations(state) {
            return spellcheckDecorationKey.getState(state) ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})

export function findMisspelledRanges(document: ProseMirrorNode, spell: NSpell): MisspelledRange[] {
  const ranges: MisspelledRange[] = []
  document.descendants((node, position) => {
    if (!node.isTextblock) return true
    if (node.type.name !== "codeBlock") collectNodeMisspellings(node, position, spell, ranges)
    return false
  })
  return ranges
}

export function findMisspelledRangesInBlock(
  node: ProseMirrorNode,
  position: number,
  spell: NSpell,
): MisspelledRange[] {
  if (!node.isTextblock || node.type.name === "codeBlock") return []
  const ranges: MisspelledRange[] = []
  collectNodeMisspellings(node, position, spell, ranges)
  return ranges
}

export function replaceAllSpellcheckDecorations(editor: Editor, ranges: MisspelledRange[]) {
  if (editor.isDestroyed) return
  editor.view.dispatch(
    editor.state.tr
      .setMeta(spellcheckDecorationKey, { mode: "replace-all", ranges } satisfies DecorationMeta)
      .setMeta("addToHistory", false),
  )
}

export function replaceSpellcheckDecorationsInRange(
  editor: Editor,
  from: number,
  to: number,
  ranges: MisspelledRange[],
) {
  if (editor.isDestroyed) return
  editor.view.dispatch(
    editor.state.tr
      .setMeta(spellcheckDecorationKey, { mode: "replace-range", from, to, ranges } satisfies DecorationMeta)
      .setMeta("addToHistory", false),
  )
}

function collectNodeMisspellings(
  node: ProseMirrorNode,
  nodePosition: number,
  spell: NSpell,
  ranges: MisspelledRange[],
) {
  let text = ""
  const positions: Array<number | null> = []
  node.descendants((child, offset) => {
    if (child.isText) {
      const value = child.text ?? ""
      text += value
      for (let index = 0; index < value.length; index += 1) {
        positions.push(nodePosition + 1 + offset + index)
      }
      return false
    }
    if (child.isInline && child.isLeaf) {
      text += " "
      positions.push(null)
      return false
    }
    return true
  })

  for (const match of text.matchAll(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu)) {
    const word = match[0]
    const start = match.index
    const end = start + word.length
    if (word.length > 64 || spell.correct(word)) continue

    const from = positions[start]
    if (from === null || from === undefined) continue
    let contiguous = true
    for (let index = start + 1; index < end; index += 1) {
      if (positions[index] !== from + index - start) {
        contiguous = false
        break
      }
    }
    if (contiguous) ranges.push({ from, to: from + word.length, word })
  }
}
