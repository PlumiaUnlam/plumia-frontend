import { api } from "@/services/api.service"
import type {
  CreateStoryboardCardInput,
  StoryboardCard,
  UpdateStoryboardCardInput,
} from "@/types/storyboard"

export async function getStoryboardCards(projectId: string) {
  return api.get<StoryboardCard[]>(`/projects/${projectId}/storyboard-cards`)
}

export async function createStoryboardCard(
  projectId: string,
  input: CreateStoryboardCardInput,
) {
  return api.post<StoryboardCard>(
    `/projects/${projectId}/storyboard-cards`,
    input,
  )
}

export async function updateStoryboardCard(
  id: string,
  input: UpdateStoryboardCardInput,
) {
  return api.patch<StoryboardCard>(`/storyboard-cards/${id}`, input)
}

export async function deleteStoryboardCard(id: string) {
  return api.delete<void>(`/storyboard-cards/${id}`)
}
