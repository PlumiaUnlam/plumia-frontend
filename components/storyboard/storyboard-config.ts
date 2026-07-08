import type { ElementType } from "react"
import {
  BookOpen,
  CheckCircle2,
  Sparkles,
  Zap,
} from "lucide-react"

import type { StoryboardCardStatus } from "@/types/storyboard"

export type StoryboardColumnConfig = {
  id: StoryboardCardStatus
  title: string
  color: string
  icon: ElementType
}

export const STORYBOARD_COLUMNS: StoryboardColumnConfig[] = [
  { id: "ideas", title: "Ideas", color: "text-purple-500", icon: Sparkles },
  {
    id: "planned",
    title: "Planificado",
    color: "text-blue-500",
    icon: BookOpen,
  },
  {
    id: "in-progress",
    title: "En Progreso",
    color: "text-amber-500",
    icon: Zap,
  },
  {
    id: "completed",
    title: "Finalizado",
    color: "text-emerald-500",
    icon: CheckCircle2,
  },
]
