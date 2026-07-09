import { api } from "./api.service";

export interface GenerateImageInput {
  entityId: string;
  width?: number;
  height?: number;
}

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

export async function generateEntityImage(
  input: GenerateImageInput,
): Promise<ImageResponse> {
  return api.post("/publishing/images/generate", input);
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
