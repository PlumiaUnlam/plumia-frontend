import { api } from "./api.service"
import type {
  CreateRelationshipInput,
  Relationship,
  UpdateRelationshipInput,
} from "@/types/relationship"

export async function getRelationships(
  projectId: string,
): Promise<Relationship[]> {
  return api.get<Relationship[]>(
    `/knowledge/relationships?projectId=${encodeURIComponent(projectId)}`,
  )
}

export async function createRelationship(
  projectId: string,
  input: CreateRelationshipInput,
): Promise<Relationship> {
  return api.post<Relationship>(
    `/knowledge/relationships?projectId=${encodeURIComponent(projectId)}`,
    input,
  )
}

export async function updateRelationship(
  id: string,
  input: UpdateRelationshipInput,
): Promise<Relationship> {
  return api.patch<Relationship>(`/knowledge/relationships/${id}`, input)
}

export async function deleteRelationship(id: string): Promise<void> {
  return api.delete<void>(`/knowledge/relationships/${id}`)
}
