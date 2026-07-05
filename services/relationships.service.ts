import { api } from "./api.service"
import type {
  CreateRelationshipInput,
  Relationship,
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
