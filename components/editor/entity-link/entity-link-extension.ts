import { Mark, mergeAttributes } from "@tiptap/core"

import type { EntityType } from "@/types/entity"
import { ENTITY_LINK_MARK_NAME, ENTITY_TYPE_CLASS } from "./entity-link.constants"

export type EntityLinkAttrs = {
  entityId: string
  entityType: EntityType
  entityName: string
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    entityLink: {
      setEntityLink: (attrs: EntityLinkAttrs) => ReturnType
      unsetEntityLink: () => ReturnType
    }
  }
}

export const EntityLink = Mark.create({
  name: ENTITY_LINK_MARK_NAME,

  inclusive: false,

  addAttributes() {
    return {
      entityId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-id"),
        renderHTML: (attributes) => {
          if (!attributes.entityId) return {}
          return { "data-entity-id": attributes.entityId }
        },
      },
      entityType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-type"),
        renderHTML: (attributes) => {
          if (!attributes.entityType) return {}
          return { "data-entity-type": attributes.entityType }
        },
      },
      entityName: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-name"),
        renderHTML: (attributes) => {
          if (!attributes.entityName) return {}
          return { "data-entity-name": attributes.entityName }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: "a[data-entity-id]" }]
  },

  renderHTML({ HTMLAttributes }) {
    const entityType = HTMLAttributes["data-entity-type"] as EntityType | undefined
    const typeClass = entityType ? ENTITY_TYPE_CLASS[entityType] : ""

    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        class: ["entity-link", typeClass].filter(Boolean).join(" "),
        title: HTMLAttributes["data-entity-name"] ?? undefined,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setEntityLink:
        (attrs) =>
        ({ chain }) =>
          chain()
            .unsetMark("link")
            .setMark(this.name, attrs)
            .run(),
      unsetEntityLink:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    }
  },
})
