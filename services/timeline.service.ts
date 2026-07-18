import { api } from "@/services/api.service"
import type {
  CreateTimelineEventInput,
  MoveTimelineEventInput,
  TimelineEvent,
  TimelineEventInput,
} from "@/types/timeline"

export async function getTimelineEvents(projectId: string): Promise<TimelineEvent[]> {
  return api.get<TimelineEvent[]>(
    `/knowledge/timeline?projectId=${encodeURIComponent(projectId)}`,
  )
}

export async function createTimelineEvent(
  projectId: string,
  input: CreateTimelineEventInput,
): Promise<TimelineEvent> {
  return api.post<TimelineEvent>(
    `/knowledge/timeline?projectId=${encodeURIComponent(projectId)}`,
    input,
  )
}

export async function updateTimelineEvent(
  id: string,
  input: TimelineEventInput,
): Promise<TimelineEvent> {
  return api.patch<TimelineEvent>(`/knowledge/timeline/${id}`, input)
}

export async function moveTimelineEvent(
  id: string,
  input: MoveTimelineEventInput,
): Promise<TimelineEvent> {
  return api.post<TimelineEvent>(`/knowledge/timeline/${id}/move`, input)
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  return api.delete<void>(`/knowledge/timeline/${id}`)
}
