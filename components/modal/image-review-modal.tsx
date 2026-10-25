"use client";

import { useState } from "react";

import { Loader2, RotateCcw, Sparkles } from "lucide-react";

import { FormDialog } from "@/components/modal/form-dialog";
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
    <FormDialog
      open={!!image}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
      title={`Revisar imagen de ${entityName}`}
      description="La imagen ya quedó guardada. Podés elegirla como imagen principal, pedir un ajuste o conservarla como imagen secundaria."
      size="md"
      layer={2}
      loading={submitting}
      error={error}
      footer={
        <>
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
        </>
      }
    >
      {image && (
        <div className="space-y-5">
          <div className="relative h-80 overflow-hidden rounded-lg border border-border bg-muted">
            <EntityImage
              src={image.imageUrl}
              alt={image.prompt}
              width={768}
              height={768}
              className="h-full w-full object-contain"
              category={category}
              iconClassName="h-12 w-12"
              fill
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

        </div>
      )}
    </FormDialog>
  );
}
