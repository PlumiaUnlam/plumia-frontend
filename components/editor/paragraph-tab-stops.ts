import { Plugin } from "@tiptap/pm/state"
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"

const PX_PER_CM = 96 / 2.54

export function normalizeTabStops(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((stop): stop is number => (
    typeof stop === "number" && Number.isFinite(stop) && stop > 0 && stop <= 30
  )).map((stop) => Math.round(stop * 100) / 100))].filter((stop) => stop > 0).sort((a, b) => a - b)
}

/** Las posiciones se miden desde el borde izquierdo del área de texto del párrafo. */
export function nextTabWidth(offset: number, stops: number[], defaultWidth: number): number {
  const position = Math.max(0, offset)
  const explicit = stops.map((stop) => stop * PX_PER_CM).find((stop) => stop > position + 0.5)
  if (explicit !== undefined) return explicit - position
  const origin = (stops.at(-1) ?? 0) * PX_PER_CM
  const interval = Math.max(1, defaultWidth)
  return origin + (Math.floor(Math.max(0, position - origin) / interval) + 1) * interval - position
}

export function tabStopDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = []
  doc.descendants((node, position) => {
    if (node.type.name !== "paragraph" || normalizeTabStops(node.attrs.tabStops).length === 0) return
    node.descendants((child, offset) => {
      if (!child.isText || !child.text) return
      for (const match of child.text.matchAll(/\t/g)) {
        const from = position + 1 + offset + match.index
        decorations.push(Decoration.inline(from, from + 1, { class: "editor-tab-stop", "data-tab-position": String(from) }))
      }
    })
    return false
  })
  return DecorationSet.create(doc, decorations)
}

/** Ajusta sólo la presentación: las tabulaciones siguen siendo texto, con copia y deshacer normales. */
export function paragraphTabStopsPlugin() {
  return new Plugin<DecorationSet>({
    state: {
      init: (_, state) => tabStopDecorations(state.doc),
      apply: (transaction, decorations) => transaction.docChanged ? tabStopDecorations(transaction.doc) : decorations,
    },
    props: { decorations(state) { return this.getState(state) } },
    view(initialView) {
      let view: EditorView = initialView
      let frame: number | null = null
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      const layout = () => {
        frame = null
        const measurements = new Map<string, number>()
        for (const tab of view.dom.querySelectorAll<HTMLElement>(".editor-tab-stop")) {
          const paragraph = tab.closest("p")
          if (!paragraph) continue
          const stops = normalizeTabStops((paragraph.dataset.tabStops ?? "").split(",").map(Number))
          if (!stops.length) continue
          const paragraphStyle = getComputedStyle(paragraph)
          const textStyle = getComputedStyle(tab)
          const origin = paragraph.getBoundingClientRect().left + Number.parseFloat(paragraphStyle.paddingLeft || "0") + Number.parseFloat(paragraphStyle.borderLeftWidth || "0")
          const offset = tab.getBoundingClientRect().left - origin
          const font = textStyle.font || `${textStyle.fontSize} ${textStyle.fontFamily}`
          let space = measurements.get(font)
          if (space === undefined) {
            if (context) context.font = font
            space = context?.measureText(" ").width || Number.parseFloat(textStyle.fontSize) / 2
            measurements.set(font, space)
          }
          const width = nextTabWidth(offset, stops, space * (Number(paragraphStyle.tabSize) || 4))
          tab.style.width = `${Math.max(1, width)}px`
        }
      }
      const schedule = () => { frame ??= requestAnimationFrame(layout) }
      const observer = new ResizeObserver(schedule)
      observer.observe(view.dom)
      window.addEventListener("resize", schedule)
      document.fonts?.addEventListener("loadingdone", schedule)
      schedule()
      return {
        update(nextView) {
          const changed = view.state.doc !== nextView.state.doc
          view = nextView
          if (changed) schedule()
        },
        destroy() {
          if (frame !== null) cancelAnimationFrame(frame)
          observer.disconnect()
          window.removeEventListener("resize", schedule)
          document.fonts?.removeEventListener("loadingdone", schedule)
        },
      }
    },
  })
}
