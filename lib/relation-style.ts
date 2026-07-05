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
