import type { Editor } from "@tiptap/react"
import type { Mark } from "@tiptap/pm/model"

export type TextCase = "sentence" | "lowercase" | "uppercase" | "title" | "toggle"

type TextReplacement = {
  from: number
  to: number
  text: string
  marks: readonly Mark[]
}

export function canTransformSelectedText(editor: Editor) {
  if (!editor.isEditable || editor.state.selection.empty) return false

  let hasText = false
  editor.state.doc.nodesBetween(editor.state.selection.from, editor.state.selection.to, (node) => {
    if (node.isText && node.text) hasText = true
  })
  return hasText
}

export function transformSelectedTextCase(editor: Editor, textCase: TextCase) {
  if (!canTransformSelectedText(editor)) return false

  const { state } = editor
  const { from, to } = state.selection
  const locale = editor.view.dom.getAttribute("lang") ?? undefined
  const replacements: TextReplacement[] = []

  state.doc.nodesBetween(from, to, (node, position) => {
    if (!node.isText || !node.text) return
    const selectedFrom = Math.max(from, position)
    const selectedTo = Math.min(to, position + node.nodeSize)
    if (selectedFrom >= selectedTo) return

    const text = node.text.slice(selectedFrom - position, selectedTo - position)
    const transformed = convertCase(text, textCase, locale)
    if (transformed !== text) {
      replacements.push({ from: selectedFrom, to: selectedTo, text: transformed, marks: node.marks })
    }
  })

  if (!replacements.length) return false

  const transaction = state.tr
  const reverseReplacements = [...replacements].reverse()
  for (const replacement of reverseReplacements) {
    transaction.replaceWith(
      replacement.from,
      replacement.to,
      state.schema.text(replacement.text, replacement.marks),
    )
  }
  transaction.setSelection(state.selection.map(transaction.doc, transaction.mapping))
  editor.view.dispatch(transaction.scrollIntoView())
  editor.view.focus()
  return true
}

function convertCase(text: string, textCase: TextCase, locale?: string) {
  switch (textCase) {
    case "sentence": {
      let capitalizeNext = true
      return Array.from(text.toLocaleLowerCase(locale), (character) => {
        if (/\p{L}/u.test(character)) {
          if (capitalizeNext) {
            capitalizeNext = false
            return character.toLocaleUpperCase(locale)
          }
          return character
        }
        if (/[.!?…\n\r]/u.test(character)) capitalizeNext = true
        return character
      }).join("")
    }
    case "lowercase":
      return text.toLocaleLowerCase(locale)
    case "uppercase":
      return text.toLocaleUpperCase(locale)
    case "title":
      return text.toLocaleLowerCase(locale).replace(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu, (word) => {
        const [first, ...rest] = Array.from(word)
        return `${first.toLocaleUpperCase(locale)}${rest.join("")}`
      })
    case "toggle":
      return Array.from(text, (character) => {
        const lower = character.toLocaleLowerCase(locale)
        const upper = character.toLocaleUpperCase(locale)
        if (lower === upper) return character
        return character === upper ? lower : upper
      }).join("")
  }
}
