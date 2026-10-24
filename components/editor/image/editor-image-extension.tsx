import Image from "@tiptap/extension-image"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { mergeAttributes } from "@tiptap/core"

import { EditorImageNodeView } from "./editor-image-node-view"
import {
  DEFAULT_IMAGE_TEXT_FLOW,
  getImageTextFlowHTMLAttributes,
  normalizeImageTextFlow,
} from "./image-text-flow"

function parseWidth(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== "string") {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export const EditorImage = Image.extend({
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      storageKey: {
        default: null,
        parseHTML: (element: HTMLElement) => element.dataset.storageKey ?? null,
        renderHTML: (attributes) => {
          if (typeof attributes.storageKey !== "string") {
            return {}
          }

          return {
            "data-storage-key": attributes.storageKey,
          }
        },
      },
      width: {
        default: null,
        parseHTML: (element) =>
          parseWidth(element.dataset.width ?? null) ??
          parseWidth(element.getAttribute("width")) ??
          parseWidth(element.style.width),
        renderHTML: (attributes) => {
          if (typeof attributes.width !== "number") {
            return {}
          }

          return {
            "data-width": String(attributes.width),
            width: String(attributes.width),
          }
        },
      },
      textFlow: {
        default: DEFAULT_IMAGE_TEXT_FLOW,
        parseHTML: (element: HTMLElement) =>
          normalizeImageTextFlow(element.dataset.textFlow),
        renderHTML: (attributes) =>
          getImageTextFlowHTMLAttributes(
            attributes.textFlow,
            attributes.width,
          ),
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        loading: "lazy",
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorImageNodeView)
  },
})
