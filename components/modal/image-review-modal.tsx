"use client";

import { useState } from "react";

import { Loader2, RotateCcw, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { EntityImage } from "@/components/worldbuilding/entity-image";
import type { ImageResponse } from "@/services/image-generation.service";
import type { EntityCategory } from "@/types/entity";

type ImageReviewModalProps = {
  readonly image: ImageResponse | null;
  readonly entityName: string;
  readonly category: EntityCategory;
  readonly onClose: () => void;
  readonly onAccept: (image: ImageResponse) => Promise<void>;
  readonly onRegenerate: (
    image: ImageResponse,
    feedback: string,
  ) => Promise<void>;
};

export function ImageReviewModal({
  image,
  entityName,
  category,
  onClose,
  onAccept,
  onRegenerate,
}: ImageReviewModalProps) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!image) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAccept(image);
      onClose();
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "No se pudo aceptar la imagen.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!image || !feedback.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onRegenerate(image, feedback.trim());
      onClose();
    } catch (regenerateError) {
      setError(
        regenerateError instanceof Error
          ? regenerateError.message
          : "No se pudo solicitar la regeneración.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={!!image}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <DialogContent className="z-[70] min-w-[600px] gap-0 overflow-hidden">
        <DialogHeader className="border-b p-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle>Revisar imagen de {entityName}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6">
          <DialogDescription>
            La variante ya quedó guardada en el baúl. Podés aceptarla como
            principal, pedir un ajuste o dejarla como variante.
          </DialogDescription>

          {image && (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-lg border border-border bg-muted">
                <EntityImage
                  src={image.imageUrl}
                  alt={image.prompt}
                  width={768}
                  height={768}
                  className="max-h-80 w-full object-contain"
                  category={category}
                  iconClassName="h-12 w-12"
                />
              </div>

              <Field>
                <FieldLabel htmlFor="image-review-feedback">
                  ¿Querés ajustar algo? (opcional si vas a aceptar)
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id="image-review-feedback"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Por ejemplo: conservar el rostro, cambiar el fondo a una biblioteca y usar un plano medio."
                    rows={4}
                    maxLength={1000}
                    disabled={submitting}
                  />
                </FieldContent>
              </Field>

              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleRegenerate()}
            disabled={!feedback.trim() || submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Regenerar con ajuste
          </Button>
          <Button onClick={() => void handleAccept()} disabled={submitting}>
            <Sparkles className="mr-2 h-4 w-4" />
            Aceptar imagen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
