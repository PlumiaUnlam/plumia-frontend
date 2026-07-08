import { api } from "@/services/api.service"
import type {
  CreateMatrixNoteInput,
  CreateStoryboardArcInput,
  StoryboardArc,
  StoryboardMatrixNote,
  UpdateMatrixNoteInput,
} from "@/types/storyboard-matrix"

export async function getStoryboardArcs(projectId: string) {
  return api.get<StoryboardArc[]>(`/projects/${projectId}/storyboard-arcs`)
}

export async function createStoryboardArc(
  projectId: string,
  input: CreateStoryboardArcInput,
) {
  return api.post<StoryboardArc>(`/projects/${projectId}/storyboard-arcs`, input)
}

export async function deleteStoryboardArc(id: string) {
  return api.delete<void>(`/storyboard-arcs/${id}`)
}

export async function createStoryboardMatrixNote(
  arcId: string,
  input: CreateMatrixNoteInput,
) {
  return api.post<StoryboardMatrixNote>(`/storyboard-arcs/${arcId}/notes`, input)
}

export async function updateStoryboardMatrixNote(
  id: string,
  input: UpdateMatrixNoteInput,
) {
  return api.patch<StoryboardMatrixNote>(
    `/storyboard-matrix-notes/${id}`,
    input,
  )
}

export async function deleteStoryboardMatrixNote(id: string) {
  return api.delete<void>(`/storyboard-matrix-notes/${id}`)
}
