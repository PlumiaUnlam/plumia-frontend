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
import type { EntityType } from "@/types/entity";

type ImageGenerationModalProps = {
  readonly show: boolean;
  readonly entityName: string;
  readonly entityType: EntityType;
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

type GenerationFieldName = Exclude<
  keyof GenerationForm,
  "additionalInstructions"
>;

type GenerationFieldConfig = {
  readonly field: GenerationFieldName;
  readonly label: string;
  readonly placeholder: string;
};

type GenerationFormConfig = {
  readonly fields: readonly GenerationFieldConfig[];
  readonly additionalLabel: string;
  readonly additionalPlaceholder: string;
};

const GENERATION_FORM_CONFIGS: Record<EntityType, GenerationFormConfig> = {
  CHARACTER: {
    fields: [
      {
        field: "expression",
        label: "Expresión",
        placeholder: "Sereno, sonriente, preocupado...",
      },
      {
        field: "pose",
        label: "Pose",
        placeholder: "De pie, mirando de perfil...",
      },
      {
        field: "background",
        label: "Fondo",
        placeholder: "Bosque al atardecer, fondo neutro...",
      },
      {
        field: "framing",
        label: "Plano / encuadre",
        placeholder: "Primer plano, cuerpo entero...",
      },
      {
        field: "lighting",
        label: "Iluminación",
        placeholder: "Luz cálida lateral, dramática...",
      },
      {
        field: "style",
        label: "Estilo visual",
        placeholder: "Realista, cinematográfico...",
      },
    ],
    additionalLabel: "Detalles de identidad",
    additionalPlaceholder:
      "Por ejemplo: conservar el peinado y la cicatriz del retrato de referencia.",
  },
  LOCATION: {
    fields: [
      {
        field: "background",
        label: "Entorno",
        placeholder: "Ruinas cubiertas de musgo, plaza amurallada...",
      },
      {
        field: "framing",
        label: "Perspectiva",
        placeholder: "Vista aérea, desde la entrada, panorámica...",
      },
      {
        field: "lighting",
        label: "Momento y atmósfera",
        placeholder: "Amanecer con niebla, noche de tormenta...",
      },
      {
        field: "style",
        label: "Estilo visual",
        placeholder: "Realista, concept art, arquitectura detallada...",
      },
    ],
    additionalLabel: "Detalles del lugar",
    additionalPlaceholder:
      "Por ejemplo: destacar la torre derrumbada y las marcas antiguas de la entrada.",
  },
  OBJECT: {
    fields: [
      {
        field: "background",
        label: "Contexto",
        placeholder: "Sobre una mesa de piedra, en un taller...",
      },
      {
        field: "framing",
        label: "Vista",
        placeholder: "Primer plano, vista lateral, objeto completo...",
      },
      {
        field: "lighting",
        label: "Iluminación",
        placeholder: "Luz de museo, contraluz, reflejos intensos...",
      },
      {
        field: "style",
        label: "Material y acabado",
        placeholder: "Metal envejecido, madera tallada, brillante...",
      },
    ],
    additionalLabel: "Detalles del objeto",
    additionalPlaceholder:
      "Por ejemplo: mostrar la inscripción, el desgaste y la gema incrustada.",
  },
  ORGANIZATION: {
    fields: [
      {
        field: "background",
        label: "Contexto",
        placeholder: "Sala de reuniones, fortaleza, calle llena...",
      },
      {
        field: "framing",
        label: "Composición",
        placeholder: "Emblema central, estandartes, grupo reunido...",
      },
      {
        field: "lighting",
        label: "Iluminación",
        placeholder: "Ceremonial, sombría, luz de antorchas...",
      },
      {
        field: "style",
        label: "Identidad visual",
        placeholder: "Militar, noble, clandestina, minimalista...",
      },
    ],
    additionalLabel: "Símbolos o elementos clave",
    additionalPlaceholder:
      "Por ejemplo: incluir el estandarte azul con el halcón plateado.",
  },
  EVENT: {
    fields: [
      {
        field: "background",
        label: "Escenario",
        placeholder: "Batalla en el valle, salón en ruinas...",
      },
      {
        field: "framing",
        label: "Composición",
        placeholder: "Momento central, vista amplia, acción en primer plano...",
      },
      {
        field: "lighting",
        label: "Atmósfera",
        placeholder: "Tensión, caos, celebración, humo y contraluces...",
      },
      {
        field: "style",
        label: "Estilo visual",
        placeholder: "Épico, documental, cinematográfico...",
      },
    ],
    additionalLabel: "Momento a representar",
    additionalPlaceholder:
      "Por ejemplo: mostrar el instante en que se abre el portal frente al ejército.",
  },
  CONCEPT: {
    fields: [
      {
        field: "background",
        label: "Contexto",
        placeholder: "Vacío cósmico, biblioteca, paisaje onírico...",
      },
      {
        field: "framing",
        label: "Forma de representación",
        placeholder:
          "Símbolo central, escena alegórica, composición abstracta...",
      },
      {
        field: "lighting",
        label: "Atmósfera",
        placeholder: "Serena, inquietante, luminosa, opresiva...",
      },
      {
        field: "style",
        label: "Lenguaje visual",
        placeholder: "Abstracto, simbólico, surrealista, realista...",
      },
    ],
    additionalLabel: "Elementos conceptuales",
    additionalPlaceholder:
      "Por ejemplo: representar la memoria como hilos dorados que conectan varias escenas.",
  },
};

const EMPTY_FORM: GenerationForm = {};

export function ImageGenerationModal({
  show,
  entityName,
  entityType,
  entityId,
  referenceImageId,
  onClose,
  onSubmit,
}: ImageGenerationModalProps) {
  const [form, setForm] = useState<GenerationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formConfig = GENERATION_FORM_CONFIGS[entityType];

  useEffect(() => {
    if (show) {
      setForm(EMPTY_FORM);
      setError(null);
      setSubmitting(false);
    }
  }, [show, entityId, entityType]);

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
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar variante de {entityName}</DialogTitle>
          <DialogDescription>
            La imagen de referencia y la identidad de la ficha se conservan.
            Solo definí qué querés cambiar en esta variante.
            <span className="mt-1 block text-xs">
              Todos los campos son opcionales: podés dejarlos en blanco y
              generar la imagen con la configuración base.
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {formConfig.fields.map((field) => (
              <GenerationField
                key={field.field}
                id={`image-${field.field}`}
                label={field.label}
                placeholder={field.placeholder}
                value={form[field.field]}
                onChange={(value) => update(field.field, value)}
              />
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-additional-instructions">
              {formConfig.additionalLabel}
            </Label>
            <Textarea
              id="image-additional-instructions"
              value={form.additionalInstructions ?? ""}
              onChange={(event) =>
                update("additionalInstructions", event.target.value)
              }
              placeholder={formConfig.additionalPlaceholder}
              rows={4}
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
