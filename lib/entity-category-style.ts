import {
  Calendar,
  Map,
  Shield,
  Sparkles,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { EntityCategory, EntityType } from "@/types/entity";
import { TYPE_TO_CATEGORY } from "@/types/entity";

export type EntityCategoryStyle = {
  readonly id: EntityCategory;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly color: string;
};

export const ENTITY_CATEGORY_STYLES: readonly EntityCategoryStyle[] = [
  {
    id: "Personaje",
    label: "Personaje",
    icon: Users,
    color: "#2563eb",
  },
  {
    id: "Lugar",
    label: "Lugar",
    icon: Map,
    color: "#059669",
  },
  {
    id: "Objeto",
    label: "Objeto",
    icon: Star,
    color: "#d97706",
  },
  {
    id: "Faccion",
    label: "Facción",
    icon: Shield,
    color: "#7c3aed",
  },
  {
    id: "Evento",
    label: "Evento",
    icon: Calendar,
    color: "#dc2626",
  },
  {
    id: "Concepto",
    label: "Concepto",
    icon: Sparkles,
    color: "#0891b2",
  },
];

export const ENTITY_CATEGORY_STYLE_BY_ID = Object.fromEntries(
  ENTITY_CATEGORY_STYLES.map((category) => [category.id, category]),
) as Record<EntityCategory, EntityCategoryStyle>;

export function getEntityCategoryStyle(category: EntityCategory) {
  return ENTITY_CATEGORY_STYLE_BY_ID[category];
}

export function getEntityTypeStyle(type: EntityType) {
  return getEntityCategoryStyle(TYPE_TO_CATEGORY[type]);
}
