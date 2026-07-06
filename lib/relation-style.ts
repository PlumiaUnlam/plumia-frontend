import {
  GraduationCap,
  Handshake,
  Heart,
  Link,
  MapPin,
  Package,
  Shield,
  Swords,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from "lucide-react"

import type { EntityType } from "@/types/entity"
import type { RelationType } from "@/types/relationship"

export const relationStyles: Record<
  RelationType,
  {
    label: string
    color: string
    icon: LucideIcon
  }
> = {
  ALLY: { label: "Aliado", color: "#10b981", icon: Handshake },
  ENEMY: { label: "Enemigo", color: "#ef4444", icon: Swords },
  FAMILY: { label: "Familia", color: "#8b5cf6", icon: Users },
  ROMANTIC: { label: "Romance", color: "#ec4899", icon: Heart },
  MENTOR: { label: "Mentor", color: "#0ea5e9", icon: GraduationCap },
  RIVAL: { label: "Rival", color: "#f59e0b", icon: Shield },
  MEMBER_OF: { label: "Miembro", color: "#6366f1", icon: Link },
  LOCATED_IN: { label: "Ubicado", color: "#14b8a6", icon: MapPin },
  OWNS: { label: "Posee", color: "#a855f7", icon: Package },
  KNOWS: { label: "Conoce", color: "#64748b", icon: UserRoundCheck },
}

export const relationStyleOptions = Object.entries(relationStyles).map(
  ([id, style]) => ({
    id: id as RelationType,
    ...style,
  }),
)

const characterRelations: readonly RelationType[] = [
  "ALLY",
  "ENEMY",
  "FAMILY",
  "ROMANTIC",
  "MENTOR",
  "RIVAL",
  "KNOWS",
]

const organizationRelations: readonly RelationType[] = [
  "ALLY",
  "ENEMY",
  "RIVAL",
  "MEMBER_OF",
  "KNOWS",
]

function includesType(types: readonly EntityType[], type: EntityType) {
  return types.includes(type)
}

export function getAvailableRelationTypes(
  sourceType?: EntityType,
  targetType?: EntityType,
): readonly RelationType[] {
  if (!sourceType || !targetType) {
    return relationStyleOptions.map((option) => option.id)
  }

  const pair = [sourceType, targetType] as const

  if (sourceType === "CHARACTER" && targetType === "CHARACTER") {
    return characterRelations
  }

  if (sourceType === "ORGANIZATION" && targetType === "ORGANIZATION") {
    return organizationRelations
  }

  if (includesType(pair, "LOCATION")) {
    return ["LOCATED_IN"]
  }

  if (includesType(pair, "OBJECT")) {
    return ["OWNS"]
  }

  if (
    includesType(pair, "CHARACTER") &&
    includesType(pair, "ORGANIZATION")
  ) {
    return ["MEMBER_OF", "ALLY", "ENEMY"]
  }

  if (includesType(pair, "CHARACTER")) {
    return ["KNOWS"]
  }

  if (includesType(pair, "ORGANIZATION")) {
    return ["ALLY", "ENEMY", "MEMBER_OF"]
  }

  return ["KNOWS"]
}

export function isRelationTypeAvailable(
  relationType: RelationType,
  sourceType?: EntityType,
  targetType?: EntityType,
) {
  return getAvailableRelationTypes(sourceType, targetType).includes(
    relationType,
  )
}
