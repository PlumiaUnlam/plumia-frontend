import type {
  StoryboardCard,
  StoryboardCardStatus,
} from "@/types/storyboard"

export type CardDialogState = {
  card: StoryboardCard | null
  status: StoryboardCardStatus
} | null
