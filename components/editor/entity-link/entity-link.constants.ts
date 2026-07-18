import type { EntityType } from "@/types/entity"

export const ENTITY_LINK_MARK_NAME = "entityLink"

export const ENTITY_TYPE_CLASS: Record<EntityType, string> = {
  CHARACTER: "entity-link--character",
  LOCATION: "entity-link--location",
  OBJECT: "entity-link--object",
  ORGANIZATION: "entity-link--organization",
  EVENT: "entity-link--event",
  CONCEPT: "entity-link--concept",
}
