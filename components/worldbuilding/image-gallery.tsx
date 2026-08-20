import { ImageIcon, Loader2, Star, StarOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  ImageGenerationJob,
  ImageResponse,
} from "@/services/image-generation.service";

type ImageGalleryProps = {
  readonly images: ImageResponse[];
  readonly loading: boolean;
  readonly activeJob: ImageGenerationJob | null;
  readonly onGenerate: () => void;
  readonly onSetPrimary: (imageId: string) => void;
  readonly onDelete: (image: ImageResponse) => void;
};

export function ImageGallery({
  images,
  loading,
  activeJob,
  onGenerate,
  onSetPrimary,
  onDelete,
}: ImageGalleryProps) {
  const isGenerating =
    activeJob?.status === "QUEUED" || activeJob?.status === "PROCESSING";

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
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="mr-2 h-4 w-4" />
          )}
          {activeJob ? "Generando..." : "Nueva imagen"}
        </Button>
      </div>

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
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {activeJob.errorMessage ?? "No se pudo generar la imagen."}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border p-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando imágenes...
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <ImageIcon className="mb-2 h-8 w-8" />
          <p className="text-sm">Todavía no hay imágenes guardadas.</p>
          <p className="text-xs">Generá la primera variante para esta ficha.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <article
              key={image.id}
              className="overflow-hidden rounded-lg border bg-background"
            >
              <div className="relative aspect-square bg-muted">
                <img
                  src={image.imageUrl}
                  alt={image.prompt}
                  className="h-full w-full object-cover"
                  loading="lazy"
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
                  disabled={image.isPrimary}
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
                  title="Eliminar imagen"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Eliminar imagen</span>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
