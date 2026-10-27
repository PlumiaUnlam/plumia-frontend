import { api } from "@/services/api.service"

export type RejectedEntityRecognitionProposal = {
  id: string
  entityId: string | null
  name: string
  aliases: string[]
  type: string | null
  sceneTitle: string | null
  createdAt: string
}

export type ProjectEntityRecognitionSettings = {
  importantEntityNames: string[]
  ignoredEntityNames: string[]
  rejectedEntities: RejectedEntityRecognitionProposal[]
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
  settings: Pick<ProjectEntityRecognitionSettings, "importantEntityNames" | "ignoredEntityNames">,
): Promise<ProjectEntityRecognitionSettings> {
  return api.put<ProjectEntityRecognitionSettings>(
    `/projects/${encodeURIComponent(projectId)}/entity-recognition-settings`,
    settings,
  )
}
