"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  ImageIcon,
  Loader2,
  Sparkles,
  Star,
  StarOff,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityImage } from "@/components/worldbuilding/entity-image";
import type { EntityCategory } from "@/types/entity";
import type {
  ImageGenerationJob,
  ImageResponse,
} from "@/services/image-generation.service";

type ImageGalleryProps = {
  readonly images: readonly ImageResponse[];
  readonly loading: boolean;
  readonly activeJob: ImageGenerationJob | null;
  readonly category: EntityCategory;
  readonly compact?: boolean;
  readonly onGenerate: () => void;
  readonly onUpload: (file: File) => Promise<void>;
  readonly onSetPrimary: (imageId: string) => void;
  readonly onDelete: (image: ImageResponse) => void;
  readonly actionError?: string | null;
  readonly actionsDisabled?: boolean;
};

type GalleryViewProps = Omit<ImageGalleryProps, "compact"> & {
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly onFileChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
  readonly uploading: boolean;
  readonly uploadError: string | null;
  readonly actionError: string | null;
  readonly isGenerating: boolean;
  readonly isBusy: boolean;
};

export function ImageGallery({
  images,
  loading,
  activeJob,
  category,
  compact = false,
  onGenerate,
  onUpload,
  onSetPrimary,
  onDelete,
  actionError = null,
  actionsDisabled = false,
}: ImageGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isGenerating =
    activeJob?.status === "QUEUED" || activeJob?.status === "PROCESSING";
  const isBusy = actionsDisabled || isGenerating || uploading;

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      await onUpload(file);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la imagen.",
      );
    } finally {
      setUploading(false);
    }
  };

  const viewProps: GalleryViewProps = {
    images,
    loading,
    activeJob,
    category,
    onGenerate,
    onUpload,
    onSetPrimary,
    onDelete,
    fileInputRef,
    onFileChange: handleFileChange,
    uploading,
    uploadError,
    actionError,
    isGenerating,
    isBusy,
  };

  if (compact) {
    return <CompactImageGallery {...viewProps} />;
  }

  return <FullImageGallery {...viewProps} />;
}

function CompactImageGallery({
  images,
  loading,
  activeJob,
  category,
  onGenerate,
  onSetPrimary,
  onDelete,
  fileInputRef,
  onFileChange,
  uploadError,
  actionError,
  isBusy,
}: GalleryViewProps) {
  return (
    <div className="mt-3 space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={(event) => void onFileChange(event)}
        className="hidden"
      />

      <CompactSavedImages
        images={images}
        loading={loading}
        category={category}
        isBusy={isBusy}
        onSetPrimary={onSetPrimary}
        onDelete={onDelete}
      />

      {activeJob && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span>
              {activeJob.status === "QUEUED"
                ? "En cola..."
                : "Generando una variante..."}
            </span>
            <span>{activeJob.progress}%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${activeJob.progress}%` }}
            />
          </div>
        </div>
      )}

      {activeJob?.status === "FAILED" && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {activeJob.errorMessage ?? "No se pudo generar la imagen."}
        </p>
      )}

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

      {actionError && <p className="text-xs text-destructive">{actionError}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGenerate}
          disabled={isBusy}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generar con IA
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
        >
          <Upload className="mr-2 h-4 w-4" />
          Cargar imagen
        </Button>
      </div>
    </div>
  );
}

function CompactSavedImages({
  images,
  loading,
  category,
  isBusy,
  onSetPrimary,
  onDelete,
}: Pick<
  GalleryViewProps,
  "images" | "loading" | "category" | "isBusy" | "onSetPrimary" | "onDelete"
>) {
  if (loading) {
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando variantes guardadas...
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image) => (
        <div
          key={image.id}
          className="relative overflow-hidden rounded-md border border-border bg-muted p-0.5"
        >
          <EntityImage
            src={image.imageUrl}
            alt={image.prompt}
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded object-cover"
            category={category}
            iconClassName="h-5 w-5"
          />
          {image.isPrimary && (
            <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
              Principal
            </span>
          )}
          <div className="absolute right-1 top-1 flex gap-1">
            <button
              type="button"
              className="rounded-full bg-background/90 p-1 text-primary shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onSetPrimary(image.id)}
              disabled={image.isPrimary || isBusy}
              title="Usar como imagen principal"
            >
              {image.isPrimary ? (
                <Star className="h-3 w-3 fill-current" />
              ) : (
                <StarOff className="h-3 w-3" />
              )}
              <span className="sr-only">Usar como principal</span>
            </button>
            <button
              type="button"
              className="rounded-full bg-background/90 p-1 text-muted-foreground shadow-sm hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onDelete(image)}
              disabled={isBusy}
              title="Eliminar imagen"
            >
              <Trash2 className="h-3 w-3" />
              <span className="sr-only">Eliminar imagen</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FullImageGallery({
  images,
  loading,
  activeJob,
  category,
  onGenerate,
  onSetPrimary,
  onDelete,
  fileInputRef,
  onFileChange,
  uploading,
  uploadError,
  actionError,
  isGenerating,
  isBusy,
}: GalleryViewProps) {
  const newImageLabel = getNewImageLabel(uploading, isGenerating);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">
            BAÚL DE IMÁGENES
          </h3>
          <p className="text-xs text-muted-foreground">
            Todas las variantes quedan asociadas a esta ficha.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(event) => void onFileChange(event)}
          className="hidden"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isBusy}>
              {isBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="mr-2 h-4 w-4" />
              )}
              {newImageLabel}
              {!isBusy && <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onGenerate}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generar variante
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Cargar imagen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {activeJob && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span>
              {activeJob.status === "QUEUED"
                ? "En cola..."
                : "Generando una variante..."}
            </span>
            <span>{activeJob.progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${activeJob.progress}%` }}
            />
          </div>
        </div>
      )}

      {activeJob?.status === "FAILED" && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {activeJob.errorMessage ?? "No se pudo generar la imagen."}
        </p>
      )}

      <FullSavedImages
        images={images}
        loading={loading}
        category={category}
        isBusy={isBusy}
        onSetPrimary={onSetPrimary}
        onDelete={onDelete}
      />
    </section>
  );
}

function FullSavedImages({
  images,
  loading,
  category,
  isBusy,
  onSetPrimary,
  onDelete,
}: Pick<
  GalleryViewProps,
  | "images"
  | "loading"
  | "category"
  | "isBusy"
  | "onSetPrimary"
  | "onDelete"
>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4" /> Cargando imágenes...
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <ImageIcon className="mb-2 h-8 w-8" />
        <p className="text-sm">Todavía no hay imágenes guardadas.</p>
        <p className="text-xs">Generá la primera variante para esta ficha.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image) => (
        <article
          key={image.id}
          className="overflow-hidden rounded-lg border bg-background"
        >
          <div className="relative aspect-square bg-muted">
            <EntityImage
              src={image.imageUrl}
              alt={image.prompt}
              width={512}
              height={512}
              className="h-full w-full object-cover"
              category={category}
              iconClassName="h-10 w-10"
            />
            {image.isPrimary && (
              <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                Principal
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 p-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={image.isPrimary || isBusy}
              onClick={() => onSetPrimary(image.id)}
              title="Usar como imagen principal"
            >
              {image.isPrimary ? (
                <Star className="mr-1 h-4 w-4 fill-current" />
              ) : (
                <StarOff className="mr-1 h-4 w-4" />
              )}
              Principal
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(image)}
              disabled={isBusy}
              title="Eliminar imagen"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Eliminar imagen</span>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function getNewImageLabel(uploading: boolean, isGenerating: boolean): string {
  if (uploading) return "Cargando...";
  if (isGenerating) return "Generando...";
  return "Nueva imagen";
}
