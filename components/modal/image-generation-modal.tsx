"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { EntityImage } from "@/components/worldbuilding/entity-image";
import {
  getEntityAttributes,
  getEntityVisualBase,
} from "@/lib/entity-wiki";
import type { GenerateImageInput } from "@/services/image-generation.service";
import type { EntityCategory, EntityType } from "@/types/entity";
import { TYPE_TO_CATEGORY } from "@/types/entity";
import type { ImageResponse } from "@/services/image-generation.service";

type ImageGenerationModalProps = {
  readonly show: boolean;
  readonly entityName: string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly referenceImageId?: string;
  readonly entityDescription?: string | null;
  readonly entityAttributes?: unknown;
  readonly images: readonly ImageResponse[];
  readonly imagesLoading: boolean;
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
  | "visualIdentity"
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
        placeholder: "Bosque al atardecer, neutro...",
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
  entityDescription,
  entityAttributes,
  images,
  imagesLoading,
  onClose,
  onSubmit,
}: ImageGenerationModalProps) {
  const [form, setForm] = useState<GenerationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReferenceImageId, setSelectedReferenceImageId] = useState<
    string | null
  >(null);
  const [acknowledgedMissingAppearance, setAcknowledgedMissingAppearance] =
    useState(false);
  const dialogIdentity = `${entityId}:${entityType}:${show ? "open" : "closed"}`;
  const [lastDialogIdentity, setLastDialogIdentity] =
    useState(dialogIdentity);
  const formConfig = GENERATION_FORM_CONFIGS[entityType];

  if (dialogIdentity !== lastDialogIdentity) {
    setLastDialogIdentity(dialogIdentity);
    if (show) {
      setForm(EMPTY_FORM);
      setError(null);
      setSubmitting(false);
      setSelectedReferenceImageId(null);
      setAcknowledgedMissingAppearance(false);
    }
  }

  const update = (field: keyof GenerationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value || undefined }));
  };
  const attributes = getEntityAttributes(entityAttributes);
  const visualBase = getEntityVisualBase(
    entityType,
    entityDescription,
    attributes,
  );
  const effectiveReferenceImageId =
    selectedReferenceImageId ?? referenceImageId ?? "";
  const selectedReference = images.find(
    (image) => image.id === effectiveReferenceImageId,
  );
  const resolvedReferenceImageId = selectedReference?.id ?? "";
  const category: EntityCategory = TYPE_TO_CATEGORY[entityType];
  const isVariant = Boolean(selectedReference);
  const generationTitle = imagesLoading
    ? `Preparar generación de ${entityName}`
    : isVariant
    ? `Generar imagen secundaria de ${entityName}`
    : images.length > 0
      ? `Generar imagen secundaria sin referencia de ${entityName}`
      : `Generar primera imagen de ${entityName}`;
  const characterNeedsAppearanceWarning =
    entityType === "CHARACTER" &&
    !selectedReference &&
    !visualBase &&
    !form.visualIdentity?.trim();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        entityId,
        ...(resolvedReferenceImageId
          ? { referenceImageId: resolvedReferenceImageId }
          : { skipReferenceImage: true }),
        ...(form.visualIdentity?.trim()
          ? { visualIdentity: form.visualIdentity.trim() }
          : {}),
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
      <DialogContent size="medium" className="z-[70] w-[calc(100vw-2rem)] min-w-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b p-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle>{generationTitle}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6">
          <DialogDescription>
            <span className="block">
              {isVariant
                ? "La imagen de referencia y la identidad visual de la ficha sirven como base. Definí solo los cambios para esta imagen secundaria."
                : images.length > 0
                  ? "La identidad visual de la ficha sirve como base. Podés crear una imagen secundaria sin referencia."
                  : "La identidad visual de la ficha sirve como base para crear la primera imagen."}
            </span>
            <span className="mt-1 block text-xs">
              Los rasgos estables vienen de la ficha; estos campos solo definen
              esta imagen y podés dejarlos en blanco.
              {entityType === "CHARACTER"
                ? " La personalidad y el rol no se usan como rasgos físicos."
                : ""}
            </span>
          </DialogDescription>

          <form
            id="image-generation-form"
            onSubmit={submit}
            className="space-y-5"
          >
            {error && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <section className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <h3 className="text-sm font-semibold">Identidad visual de la ficha</h3>
                {visualBase ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {visualBase}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    La ficha no tiene rasgos visuales para usar como base.
                  </p>
                )}
              </div>
              <Field>
                <FieldLabel htmlFor="image-visual-identity">
                  Ajuste visual para esta imagen (opcional)
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id="image-visual-identity"
                    value={form.visualIdentity ?? ""}
                    onChange={(event) => update("visualIdentity", event.target.value)}
                    placeholder="Agregá aquí un cambio visual puntual; la identidad estable de la ficha se conserva."
                    rows={3}
                    maxLength={2000}
                  />
                </FieldContent>
                <p className="text-xs text-muted-foreground">
                  Se agrega al prompt de esta generación y no modifica la ficha.
                </p>
              </Field>
            </section>

            <section className="space-y-3 rounded-lg border border-border p-3">
              <div>
                <h3 className="text-sm font-semibold">Imagen de referencia</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {imagesLoading
                    ? "Cargando imágenes de la ficha para elegir una referencia…"
                    : selectedReference
                    ? selectedReference.isPrimary
                      ? "Se usará la imagen principal."
                      : "Se usará la imagen que seleccionaste."
                    : images.length > 0
                      ? "Sin imagen de referencia. Se usará solo la información de la ficha."
                      : "Sin imagen de referencia. Se creará la primera imagen con los datos de la ficha."}
                </p>
              </div>
              {selectedReference && (
                <EntityImage
                  src={selectedReference.imageUrl}
                  alt={`Referencia de ${entityName}`}
                  width={128}
                  height={128}
                  className="size-24 rounded-md border border-border object-cover"
                  category={category}
                  iconClassName="h-5 w-5"
                />
              )}
              {!imagesLoading && images.length > 0 && (
                <div
                  className="flex flex-wrap items-start gap-2"
                  role="group"
                  aria-label="Elegir imagen de referencia"
                >
                  {images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      aria-pressed={resolvedReferenceImageId === image.id}
                      aria-label={`${image.isPrimary ? "Imagen principal" : "Imagen secundaria"}. Usar esta imagen como referencia`}
                      onClick={() => setSelectedReferenceImageId(image.id)}
                      className={`rounded-md border p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        resolvedReferenceImageId === image.id
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border"
                      }`}
                    >
                      <EntityImage
                        src={image.imageUrl}
                        alt={image.prompt}
                        width={64}
                        height={64}
                        className="size-16 rounded object-cover"
                        category={category}
                        iconClassName="h-4 w-4"
                      />
                      <span className="mt-1 block text-[10px] text-primary">
                        {image.isPrimary ? "Imagen principal" : "Imagen secundaria"}
                      </span>
                    </button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant={!resolvedReferenceImageId ? "secondary" : "outline"}
                    onClick={() => setSelectedReferenceImageId("")}
                  >
                    Sin referencia
                  </Button>
                </div>
              )}
            </section>

            {characterNeedsAppearanceWarning && (
              <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <p className="flex items-start gap-2 font-medium">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  La ficha no incluye rasgos físicos suficientes. El proveedor no puede conservar detalles que no están descritos.
                </p>
                <label className="flex items-start gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={acknowledgedMissingAppearance}
                    onChange={(event) =>
                      setAcknowledgedMissingAppearance(event.target.checked)
                    }
                    className="mt-1 accent-primary"
                  />
                  Entiendo y quiero generar con la información disponible.
                </label>
              </div>
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

            <Field>
              <FieldLabel htmlFor="image-additional-instructions">
                {formConfig.additionalLabel}
              </FieldLabel>
              <FieldContent>
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
              </FieldContent>
            </Field>
          </form>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="image-generation-form"
            disabled={
              submitting ||
              imagesLoading ||
              (characterNeedsAppearanceWarning && !acknowledgedMissingAppearance)
            }
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isVariant
              ? "Generar imagen secundaria"
              : images.length > 0
                ? "Generar imagen secundaria"
                : "Generar primera imagen"}
          </Button>
        </DialogFooter>
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
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <Input
          id={id}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          title={placeholder}
          className="placeholder:text-ellipsis"
          maxLength={300}
        />
      </FieldContent>
    </Field>
  );
}
