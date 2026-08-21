import { api } from "./api.service";

export interface GenerateImageInput {
  entityId: string;
  width?: number;
  height?: number;
  referenceImageId?: string;
  prompt?: string;
  expression?: string;
  pose?: string;
  background?: string;
  framing?: string;
  lighting?: string;
  style?: string;
  additionalInstructions?: string;
}

export type ImageGenerationJobStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface ImageResponse {
  id: string;
  entityId: string;
  prompt: string;
  imageUrl: string;
  imageType: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface GeneratePreviewImageInput {
  name: string;
  type: string;
  description?: string;
  attributes?: Record<string, unknown>;
  width?: number;
  height?: number;
}

export interface PreviewImageResponse {
  imageUrl: string;
  storageKey: string;
  prompt: string;
  imageType: string;
}

export interface AttachImageInput {
  entityId: string;
  storageKey: string;
  prompt: string;
  imageType: string;
}

export interface ImageGenerationJob {
  id: string;
  entityId: string;
  status: ImageGenerationJobStatus;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  generatedImage: ImageResponse | null;
}

export async function generateEntityImage(
  input: GenerateImageInput,
): Promise<ImageGenerationJob> {
  return api.post("/publishing/images/generate", input);
}

export async function getImageGenerationJob(
  jobId: string,
): Promise<ImageGenerationJob> {
  return api.get(`/publishing/images/jobs/${jobId}`);
}

export async function getEntityImages(
  entityId: string,
): Promise<ImageResponse[]> {
  return api.get(`/publishing/images/${entityId}`);
}

export async function getPrimaryEntityImages(
  entityIds: readonly string[],
): Promise<Record<string, string>> {
  const ids = [...new Set(entityIds)];
  if (ids.length === 0) {
    return {};
  }

  const images = await api.get<ImageResponse[]>(
    `/publishing/images/primary?entityIds=${encodeURIComponent(ids.join(","))}`,
  );
  return Object.fromEntries(
    images.map((image) => [image.entityId, image.imageUrl]),
  );
}

export async function setPrimaryImage(
  entityId: string,
  imageId: string,
): Promise<ImageResponse> {
  return api.post(`/publishing/images/${entityId}/primary`, { imageId });
}

export async function deleteEntityImage(
  entityId: string,
  imageId: string,
): Promise<void> {
  return api.delete(`/publishing/images/${entityId}/${imageId}`);
}

export async function generatePreviewImage(
  input: GeneratePreviewImageInput,
): Promise<PreviewImageResponse> {
  return api.post("/publishing/images/generate-preview", input);
}

export async function attachImage(
  input: AttachImageInput,
): Promise<ImageResponse> {
  return api.post("/publishing/images/attach", input);
}
