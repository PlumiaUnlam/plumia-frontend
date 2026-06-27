import type { EntityCategory } from "@/components/worldbuilding/wiki-panel"

export type EntityType =
  | "CHARACTER"
  | "LOCATION"
  | "OBJECT"
  | "ORGANIZATION"
  | "EVENT"
  | "CONCEPT"

export const CATEGORY_TO_TYPE: Record<EntityCategory, EntityType> = {
  Personaje: "CHARACTER",
  Lugar: "LOCATION",
  Objeto: "OBJECT",
  Faccion: "ORGANIZATION",
  Evento: "EVENT",
  Concepto: "CONCEPT",
}

export const TYPE_TO_CATEGORY: Record<EntityType, EntityCategory> = {
  CHARACTER: "Personaje",
  LOCATION: "Lugar",
  OBJECT: "Objeto",
  ORGANIZATION: "Faccion",
  EVENT: "Evento",
  CONCEPT: "Concepto",
}

export interface Entity {
  id: string
  canonicalName: string
  type: EntityType
  description: string | null
  aliases: string[]
  imageUrl: string | null
  projectId: string
  isActive: boolean
  attributes: unknown
  createdAt: string
  updatedAt: string
}

export interface CreateEntityInput {
  canonicalName: string
  type: EntityType
  description?: string
  aliases?: string[]
  attributes?: Record<string, unknown>
  imageUrl?: string
}

export interface UpdateEntityInput {
  canonicalName?: string
  type?: EntityType
  description?: string | null
  aliases?: string[] | null
  attributes?: Record<string, unknown>
  imageUrl?: string
  isActive?: boolean
}
