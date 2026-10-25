import { api } from "@/services/api.service"

export type ProjectEntityRecognitionSettings = {
  importantEntityNames: string[]
}

export function getProjectEntityRecognitionSettings(
  projectId: string,
): Promise<ProjectEntityRecognitionSettings> {
  return api.get<ProjectEntityRecognitionSettings>(
    `/projects/${encodeURIComponent(projectId)}/entity-recognition-settings`,
  )
}

export function updateProjectEntityRecognitionSettings(
  projectId: string,
  importantEntityNames: string[],
): Promise<ProjectEntityRecognitionSettings> {
  return api.put<ProjectEntityRecognitionSettings>(
    `/projects/${encodeURIComponent(projectId)}/entity-recognition-settings`,
    { importantEntityNames },
  )
}
