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
import type {
  GenerateImageInput,
  ImageResponse,
} from "@/services/image-generation.service";
import type { EntityCategory, EntityType } from "@/types/entity";
import { TYPE_TO_CATEGORY } from "@/types/entity";

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
  | "visualIdentity"
>;

type GenerationFieldName = Exclude<
  keyof GenerationForm,
  "visualIdentity"
>;

type GenerationFieldConfig = {
  readonly field: GenerationFieldName;
  readonly label: string;
  readonly placeholder: string;
};

type GenerationFormConfig = {
  readonly fields: readonly GenerationFieldConfig[];
  readonly promptPlaceholder: string;
};

const GENERATION_FORM_CONFIGS: Record<EntityType, GenerationFormConfig> = {
  CHARACTER: {
    fields: [
      {
        field: "expression",
        label: "Expresión del rostro",
        placeholder: "Sereno o sonriente",
      },
      {
        field: "pose",
        label: "Pose o movimiento",
        placeholder: "De pie o caminando",
      },
      {
        field: "background",
        label: "Fondo",
        placeholder: "Bosque al atardecer",
      },
      {
        field: "framing",
        label: "Tipo de plano",
        placeholder: "Primer plano o cuerpo entero",
      },
      {
        field: "lighting",
        label: "Iluminación",
        placeholder: "Luz cálida lateral",
      },
      {
        field: "style",
        label: "Estilo visual",
        placeholder: "Realista, estilo cine",
      },
    ],
    promptPlaceholder: "Ej.: mostrarlo cruzando el bosque bajo la lluvia.",
  },
  LOCATION: {
    fields: [
      {
        field: "background",
        label: "Entorno",
        placeholder: "Ruinas con musgo",
      },
      {
        field: "framing",
        label: "Perspectiva",
        placeholder: "Aérea o panorámica",
      },
      {
        field: "lighting",
        label: "Momento y atmósfera",
        placeholder: "Amanecer con niebla",
      },
      {
        field: "style",
        label: "Estilo visual",
        placeholder: "Realista o concept art",
      },
    ],
    promptPlaceholder: "Ej.: destacar la torre y las marcas de la entrada.",
  },
  OBJECT: {
    fields: [
      {
        field: "background",
        label: "Contexto",
        placeholder: "Sobre una mesa de piedra",
      },
      {
        field: "framing",
        label: "Vista",
        placeholder: "Primer plano o vista lateral",
      },
      {
        field: "lighting",
        label: "Iluminación",
        placeholder: "Luz de museo o contraluz",
      },
      {
        field: "style",
        label: "Material y acabado",
        placeholder: "Metal envejecido o madera tallada",
      },
    ],
    promptPlaceholder: "Ej.: mostrar la inscripción y la gema incrustada.",
  },
  ORGANIZATION: {
    fields: [
      {
        field: "background",
        label: "Contexto",
        placeholder: "Sala de reuniones o fortaleza",
      },
      {
        field: "framing",
        label: "Composición",
        placeholder: "Emblema central, estandartes",
      },
      {
        field: "lighting",
        label: "Iluminación",
        placeholder: "Ceremonial, luz de antorchas",
      },
      {
        field: "style",
        label: "Estilo visual",
        placeholder: "Solemne, militar o clandestino",
      },
    ],
    promptPlaceholder: "Ej.: incluir el estandarte azul con el halcón.",
  },
  EVENT: {
    fields: [
      {
        field: "background",
        label: "Escenario",
        placeholder: "Batalla en un valle",
      },
      {
        field: "framing",
        label: "Composición",
        placeholder: "Momento central, vista amplia",
      },
      {
        field: "lighting",
        label: "Atmósfera",
        placeholder: "Tensión, humo, contraluces",
      },
      {
        field: "style",
        label: "Estilo visual",
        placeholder: "Épico, documental, cinematográfico",
      },
    ],
    promptPlaceholder: "Ej.: mostrar el instante en que se abre el portal.",
  },
  CONCEPT: {
    fields: [
      {
        field: "background",
        label: "Contexto",
        placeholder: "Vacío cósmico o biblioteca",
      },
      {
        field: "framing",
        label: "Forma de representación",
        placeholder: "Símbolo central o escena alegórica",
      },
      {
        field: "lighting",
        label: "Atmósfera",
        placeholder: "Serena, inquietante, opresiva",
      },
      {
        field: "style",
        label: "Lenguaje visual",
        placeholder: "Abstracto, simbólico, surrealista",
      },
    ],
    promptPlaceholder: "Ej.: representar la memoria como hilos dorados.",
  },
};

const EMPTY_FORM: GenerationForm = {};

function getGenerationTitle(
  entityName: string,
  imagesLoading: boolean,
  isVariant: boolean,
  hasImages: boolean,
): string {
  if (imagesLoading) return `Preparar generación de ${entityName}`;
  if (isVariant) return `Generar imagen secundaria de ${entityName}`;
  if (hasImages) {
    return `Generar imagen secundaria sin referencia de ${entityName}`;
  }
  return `Generar primera imagen de ${entityName}`;
}

function getReferenceDescription(
  imagesLoading: boolean,
  selectedReference: ImageResponse | undefined,
  hasImages: boolean,
): string {
  if (imagesLoading) return "Cargando imágenes…";
  if (selectedReference?.isPrimary) return "Se usará la imagen principal.";
  if (selectedReference) return "Se usará la imagen seleccionada.";
  if (hasImages) return "Sin referencia; se usará la ficha como base.";
  return "Sin referencia; la ficha será la base visual.";
}

function getSubmitErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "No se pudo solicitar la generación";
}

function createGenerationInput(
  entityId: string,
  resolvedReferenceImageId: string,
  form: GenerationForm,
): GenerateImageInput {
  const { visualIdentity, ...otherInstructions } = form;
  const reference = resolvedReferenceImageId
    ? { referenceImageId: resolvedReferenceImageId }
    : { skipReferenceImage: true };
  const visualInstructions = visualIdentity?.trim()
    ? { visualIdentity: visualIdentity.trim() }
    : {};

  return {
    entityId,
    ...reference,
    ...visualInstructions,
    ...otherInstructions,
  };
}

function getSubmitButtonLabel(isVariant: boolean, hasImages: boolean): string {
  if (isVariant || hasImages) return "Generar imagen secundaria";
  return "Generar primera imagen";
}

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
  const generationTitle = getGenerationTitle(
    entityName,
    imagesLoading,
    isVariant,
    images.length > 0,
  );
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
      await onSubmit(
        createGenerationInput(entityId, resolvedReferenceImageId, form),
      );
      onClose();
    } catch (submitError) {
      setError(getSubmitErrorMessage(submitError));
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
            {selectedReference
              ? "La ficha y la imagen de referencia definen la base visual. Lo que indiques acá solo afecta esta imagen."
              : "La ficha define la base visual. Lo que indiques acá solo afecta esta imagen."}
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

            <VisualBaseSection visualBase={visualBase} />

            <ReferenceImagePicker
              images={images}
              imagesLoading={imagesLoading}
              selectedReference={selectedReference}
              entityName={entityName}
              category={category}
              resolvedReferenceImageId={resolvedReferenceImageId}
              onSelect={setSelectedReferenceImageId}
            />

            <Field>
              <FieldLabel htmlFor="image-visual-instructions">
                ¿Qué querés mostrar en esta imagen? (opcional)
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="image-visual-instructions"
                  value={form.visualIdentity ?? ""}
                  onChange={(event) =>
                    update("visualIdentity", event.target.value)
                  }
                  placeholder={formConfig.promptPlaceholder}
                  rows={3}
                  maxLength={2000}
                />
              </FieldContent>
              <p className="text-xs text-muted-foreground">
                Podés describir la escena o un cambio puntual.
              </p>
            </Field>

            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Ajustes por aspecto (opcional)
              </summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
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
            </details>

            <CharacterAppearanceWarning
              show={characterNeedsAppearanceWarning}
              checked={acknowledgedMissingAppearance}
              onChange={setAcknowledgedMissingAppearance}
            />

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
            {getSubmitButtonLabel(isVariant, images.length > 0)}
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
          maxLength={300}
        />
      </FieldContent>
    </Field>
  );
}

function VisualBaseSection({ visualBase }: { readonly visualBase: string }) {
  return (
    <section className="rounded-lg border border-border bg-muted/30 p-3">
      <div>
        <h3 className="text-sm font-semibold">Base visual de la ficha</h3>
        {visualBase ? (
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {visualBase}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Sin rasgos visuales cargados.
          </p>
        )}
      </div>
    </section>
  );
}

function ReferenceImagePicker({
  images,
  imagesLoading,
  selectedReference,
  entityName,
  category,
  resolvedReferenceImageId,
  onSelect,
}: {
  readonly images: readonly ImageResponse[];
  readonly imagesLoading: boolean;
  readonly selectedReference: ImageResponse | undefined;
  readonly entityName: string;
  readonly category: EntityCategory;
  readonly resolvedReferenceImageId: string;
  readonly onSelect: (imageId: string) => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <h3 className="text-sm font-semibold">Imagen de referencia</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {getReferenceDescription(
            imagesLoading,
            selectedReference,
            images.length > 0,
          )}
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
        <fieldset className="flex min-w-0 flex-wrap items-start gap-2">
          <legend className="sr-only">Elegir imagen de referencia</legend>
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              aria-pressed={resolvedReferenceImageId === image.id}
              aria-label={`${image.isPrimary ? "Imagen principal" : "Imagen secundaria"}. Usar esta imagen como referencia`}
              onClick={() => onSelect(image.id)}
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
            onClick={() => onSelect("")}
          >
            Sin referencia
          </Button>
        </fieldset>
      )}
    </section>
  );
}

function CharacterAppearanceWarning({
  show,
  checked,
  onChange,
}: {
  readonly show: boolean;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  if (!show) return null;

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <p className="flex items-start gap-2 font-medium">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        La ficha no incluye rasgos físicos suficientes. El proveedor no puede
        conservar detalles que no están descritos.
      </p>
      <label className="flex items-start gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 accent-primary"
        />
        <span>Entiendo y quiero generar con la información disponible.</span>
      </label>
    </div>
  );
}
