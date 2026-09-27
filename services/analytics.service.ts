import { api } from "@/services/api.service";
import type {
  AnalyticsDashboard,
  WritingGoal,
  WritingGoalType,
} from "@/types/analytics";

export function getAnalyticsDashboard(
  projectId: string,
  options: Pick<RequestInit, "signal"> = {},
) {
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();
  return api.get<AnalyticsDashboard>(
    `/analytics/projects/${encodeURIComponent(projectId)}/dashboard?timezoneOffsetMinutes=${timezoneOffsetMinutes}`,
    options,
  );
}

export function upsertWritingGoal(
  projectId: string,
  goalType: WritingGoalType,
  payload: { targetWords: number; deadline?: string },
) {
  return api.put<WritingGoal>(
    `/analytics/projects/${encodeURIComponent(projectId)}/goals/${goalType}`,
    payload,
  );
}
