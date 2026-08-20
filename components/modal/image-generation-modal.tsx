"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GenerateImageInput } from "@/services/image-generation.service";

type ImageGenerationModalProps = {
  readonly show: boolean;
  readonly entityName: string;
  readonly entityId: string;
  readonly referenceImageId?: string;
  readonly onClose: () => void;
  readonly onSubmit: (input: GenerateImageInput) => Promise<void>;
};

type GenerationForm = Pick<
  GenerateImageInput,
  | "expression"
  | "pose"
  | "background"
  | "framing"
  | "lighting"
  | "style"
  | "additionalInstructions"
>;

const EMPTY_FORM: GenerationForm = {};

export function ImageGenerationModal({
  show,
  entityName,
  entityId,
  referenceImageId,
  onClose,
  onSubmit,
}: ImageGenerationModalProps) {
  const [form, setForm] = useState<GenerationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setForm(EMPTY_FORM);
      setError(null);
      setSubmitting(false);
    }
  }, [show, entityId]);

  const update = (field: keyof GenerationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value || undefined }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        entityId,
        ...(referenceImageId ? { referenceImageId } : {}),
        ...form,
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo solicitar la generación",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={show}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generar variante de {entityName}</DialogTitle>
          <DialogDescription>
            La imagen de referencia y la identidad de la ficha se conservan.
            Solo definí qué querés cambiar en esta variante.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <GenerationField
              id="image-expression"
              label="Expresión"
              placeholder="Sereno, sonriente, preocupado..."
              value={form.expression}
              onChange={(value) => update("expression", value)}
            />
            <GenerationField
              id="image-pose"
              label="Pose"
              placeholder="De pie, mirando de perfil..."
              value={form.pose}
              onChange={(value) => update("pose", value)}
            />
            <GenerationField
              id="image-background"
              label="Fondo"
              placeholder="Bosque al atardecer, fondo neutro..."
              value={form.background}
              onChange={(value) => update("background", value)}
            />
            <GenerationField
              id="image-framing"
              label="Plano / encuadre"
              placeholder="Primer plano, cuerpo entero..."
              value={form.framing}
              onChange={(value) => update("framing", value)}
            />
            <GenerationField
              id="image-lighting"
              label="Iluminación"
              placeholder="Luz cálida lateral, dramática..."
              value={form.lighting}
              onChange={(value) => update("lighting", value)}
            />
            <GenerationField
              id="image-style"
              label="Estilo visual"
              placeholder="Realista, cinematográfico..."
              value={form.style}
              onChange={(value) => update("style", value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-additional-instructions">
              Instrucciones adicionales
            </Label>
            <Textarea
              id="image-additional-instructions"
              value={form.additionalInstructions ?? ""}
              onChange={(event) =>
                update("additionalInstructions", event.target.value)
              }
              placeholder="Por ejemplo: conservar el peinado y la cicatriz del retrato de referencia."
              rows={3}
              maxLength={1000}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generar variante
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GenerationField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly value: string | undefined;
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={300}
      />
    </div>
  );
}
