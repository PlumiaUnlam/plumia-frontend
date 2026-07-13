import { api } from "@/services/api.service";

export type SummaryResponse = {
  id: string;
  scopeType: string;
  scopeId: string;
  title: string | null;
  content: string;
  source: string;
  isDirty: boolean;
  provider: string | null;
  model: string | null;
  tokenCount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SummaryJobResponse = {
  id: string;
  scopeType: string;
  scopeId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

function isSummaryNotFound(error: unknown) {
  return error instanceof Error && error.message.includes("Summary not found");
}

export async function getChapterSummary(chapterId: string) {
  try {
    return await api.get<SummaryResponse>(`/chapters/${chapterId}/summary`);
  } catch (error) {
    if (isSummaryNotFound(error)) return null;
    throw error;
  }
}

export async function generateChapterSummary(chapterId: string) {
  return api.post<SummaryJobResponse>(
    `/chapters/${chapterId}/summary/generate`,
    {},
  );
}

export async function getSummaryJob(jobId: string) {
  return api.get<SummaryJobResponse>(`/summary-jobs/${jobId}`);
}
