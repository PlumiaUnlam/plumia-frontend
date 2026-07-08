import { api } from "./api.service"
import type { Entity, CreateEntityInput, UpdateEntityInput } from "@/types/entity"

export async function getEntities(projectId: string): Promise<Entity[]> {
  return api.get<Entity[]>(`/knowledge/entities?projectId=${encodeURIComponent(projectId)}`)
}

export async function getEntity(id: string): Promise<Entity> {
  return api.get<Entity>(`/knowledge/entities/${id}`)
}

export async function createEntity(projectId: string, input: CreateEntityInput): Promise<Entity> {
  return api.post<Entity>(`/knowledge/entities?projectId=${encodeURIComponent(projectId)}`, input)
}

export async function updateEntity(id: string, input: UpdateEntityInput): Promise<Entity> {
  return api.patch<Entity>(`/knowledge/entities/${id}`, input)
}

export async function deleteEntity(id: string): Promise<void> {
  return api.delete<void>(`/knowledge/entities/${id}`)
}
