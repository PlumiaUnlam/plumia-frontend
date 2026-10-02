import { api } from "@/services/api.service"
import type { AuthorAnnotation, CreateAuthorAnnotationInput } from "@/types/author-annotation"

export function getSceneAnnotations(
  sceneId: string,
  options: Pick<RequestInit, "signal"> = {},
): Promise<AuthorAnnotation[]> {
  return api.get<AuthorAnnotation[]>(`/scenes/${sceneId}/annotations`, options)
}

export function createSceneAnnotation(
  sceneId: string,
  input: CreateAuthorAnnotationInput,
): Promise<AuthorAnnotation> {
  return api.post<AuthorAnnotation>(`/scenes/${sceneId}/annotations`, input)
}

export function updateSceneAnnotation(
  sceneId: string,
  annotationId: string,
  body: string,
): Promise<AuthorAnnotation> {
  return api.patch<AuthorAnnotation>(
    `/scenes/${sceneId}/annotations/${annotationId}`,
    { body },
  )
}

export function deleteSceneAnnotation(
  sceneId: string,
  annotationId: string,
): Promise<void> {
  return api.delete<void>(`/scenes/${sceneId}/annotations/${annotationId}`)
}
