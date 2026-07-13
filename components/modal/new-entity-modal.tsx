"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Sparkles,
  Tag,
  X,
  ImageIcon,
  Trash2,
  RotateCcw,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldSet,
  FieldLegend,
  FieldGroup,
} from "@/components/ui/field";

import type {
  Entity,
  EntityCategory,
  CreateEntityInput,
  UpdateEntityInput,
} from "@/types/entity";
import { CATEGORY_TO_TYPE, TYPE_TO_CATEGORY } from "@/types/entity";
import { ENTITY_CATEGORY_STYLES } from "@/lib/entity-category-style";
import { EntityIconTile } from "@/components/worldbuilding/entity-icon-tile";

type NewEntityModalProps = {
  readonly show: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (
    data: CreateEntityInput | UpdateEntityInput,
    file?: File | null,
  ) => Promise<void>;
  readonly entity?: Entity | null;
  readonly initialCanonicalName?: string;
  readonly onGenerateImage?: (data: {
    canonicalName: string;
    description: string;
    type: string;
    aliases: string[];
  }) => Promise<string>;
  readonly onClearAiPreview?: () => void;
};

export function NewEntityModal({
  show,
  onClose,
  onSubmit,
  entity,
  initialCanonicalName,
  onGenerateImage,
  onClearAiPreview,
}: NewEntityModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<EntityCategory>("Personaje");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedUrl, setAiGeneratedUrl] = useState<string | null>(null);
  const [aiElapsed, setAiElapsed] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRef = useRef(false);

  const isEditing = !!entity;

  useEffect(() => {
    if (!show) return;

    const initialEntity = entity;

    let isCurrent = true;

    queueMicrotask(() => {
      if (!isCurrent) return;

      if (initialEntity) {
        setName(initialEntity.canonicalName);
        setCategory(TYPE_TO_CATEGORY[initialEntity.type]);
        setDescription(initialEntity.description ?? "");
        setTags(initialEntity.aliases);
      } else {
        setName(initialCanonicalName ?? "");
        setCategory("Personaje");
        setDescription("");
        setTags([]);
      }
      setAiGenerating(false);
      setAiGeneratedUrl(null);
      setAiElapsed(0);
      setAiError(null);
      setTagInput("");
      setError(null);
      setSubmitting(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setImageRemoved(false);
    });

    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (aiGenerating) {
      const id = setInterval(() => {
        setAiElapsed((s) => s + 1);
      }, 1000);
      elapsedRef.current = id;
      return () => clearInterval(id);
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
  }, [aiGenerating]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAiGeneratedUrl(null);
    setAiError(null);
    setImageRemoved(false);
    onClearAiPreview?.();
  };

  const handleRemoveAiImage = () => {
    setAiGeneratedUrl(null);
    onClearAiPreview?.();
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setAiGeneratedUrl(null);
    setAiError(null);
    onClearAiPreview?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerateAi = async () => {
    if (!name.trim() || !onGenerateImage) return;

    cancelRef.current = false;
    setAiGenerating(true);
    setAiElapsed(0);
    setAiError(null);
    setError(null);

    try {
      const url = await onGenerateImage({
        canonicalName: name.trim(),
        description: description.trim(),
        type: CATEGORY_TO_TYPE[category],
        aliases: tags,
      });
      if (cancelRef.current) return;
      setAiGeneratedUrl(url);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setImageRemoved(false);
    } catch (err) {
      if (cancelRef.current) return;
      const message =
        err instanceof Error ? err.message : "Error al generar la imagen";
      setAiError(message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCancelGeneration = () => {
    cancelRef.current = true;
    setAiGenerating(false);
    setAiElapsed(0);
  };

  const addTag = () => {
    if (!tagInput.trim()) return;

    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }

    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const type = CATEGORY_TO_TYPE[category];
      if (isEditing && entity) {
        const input: UpdateEntityInput = {
          canonicalName: name.trim(),
          type,
          description: description.trim() || null,
          aliases: tags.length > 0 ? tags : [],
        };
        if (imageRemoved && !selectedFile && !aiGeneratedUrl) {
          input.imageUrl = null;
        }
        await onSubmit(input, selectedFile);
      } else {
        const input: CreateEntityInput = {
          canonicalName: name.trim(),
          type,
          description: description.trim() || undefined,
          aliases: tags.length > 0 ? tags : [],
        };
        await onSubmit(input, selectedFile);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar la entidad",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderImagePreview = () => {
    if (previewUrl) {
      return (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-48 object-contain bg-muted"
          />
          <button
            type="button"
            onClick={handleRemoveFile}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      );
    }

    if (aiGeneratedUrl) {
      return (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={aiGeneratedUrl}
            alt="AI Generated"
            className="w-full h-48 object-contain bg-muted"
          />
          <button
            type="button"
            onClick={handleRemoveAiImage}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      );
    }

    if (isEditing && entity?.imageUrl && !imageRemoved) {
      return (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={`/api/storage/image/${entity.id}?v=${Date.parse(entity.updatedAt)}`}
            alt={entity.canonicalName}
            className="w-full h-48 object-contain bg-muted"
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => setImageRemoved(true)}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      );
    }

    if (imageRemoved && isEditing) {
      return (
        <div className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center bg-muted/30">
          <p className="text-sm text-muted-foreground">Imagen eliminada</p>
        </div>
      );
    }

    return (
      <EntityIconTile
        category={category}
        className="h-48 w-full rounded-lg"
        iconClassName="h-12 w-12"
      />
    );
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-[600px] gap-0 overflow-hidden">
        <DialogHeader className="p-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEditing ? "Editar Entidad" : "Nueva Entidad"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="entity-name">Nombre *</FieldLabel>

            <FieldContent>
              <Input
                id="entity-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Maren Solís"
              />
            </FieldContent>
          </Field>

          <FieldSet className="space-y-2">
            <FieldLegend>Tipo *</FieldLegend>

            <FieldGroup className="grid grid-cols-3 gap-2">
              {ENTITY_CATEGORY_STYLES.map((categoryStyle) => {
                const { id, label, icon: Icon } = categoryStyle;
                const isSelected = category === id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategory(id)}
                    className={`
                        flex items-center gap-2
                        rounded-lg border px-3 py-2
                        transition-colors hover:bg-muted

                        ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border"
                        }
                      `}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: categoryStyle.color }}
                    />

                    <span className="text-sm font-medium">{label}</span>
                  </button>
                );
              })}
            </FieldGroup>
          </FieldSet>

          <Field>
            <FieldLabel htmlFor="entity-description">Descripción</FieldLabel>

            <FieldContent>
              <Textarea
                id="entity-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe la entidad..."
                rows={4}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="entity-image">
              Imagen{" "}
              {selectedFile || aiGeneratedUrl
                ? "(1 seleccionada)"
                : "(Opcional)"}
            </FieldLabel>

            <FieldContent>
              <input
                id="entity-image"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleFileSelect}
                className="hidden"
              />

              {renderImagePreview()}

              <div className="space-y-2">
                <ImageUploadActions
                  aiGeneratedUrl={aiGeneratedUrl}
                  aiGenerating={aiGenerating}
                  aiError={aiError}
                  aiElapsed={aiElapsed}
                  name={name}
                  selectedFile={selectedFile}
                  onFileClick={() => fileInputRef.current?.click()}
                  onGenerateAi={handleGenerateAi}
                  onCancelGeneration={handleCancelGeneration}
                  onGenerateImage={onGenerateImage}
                />
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Etiquetas</FieldLabel>

            <FieldContent className="grid gap-2">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Agregar etiqueta..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />

                <Button onClick={addTag} type="button">
                  Agregar
                </Button>
              </div>

              <div className="flex min-w-0 gap-2 overflow-x-auto px-1">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm"
                  >
                    <Tag className="h-3 w-3" />

                    {tag}

                    <button onClick={() => removeTag(tag)} type="button">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </FieldContent>
          </Field>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>

          <Button disabled={!name.trim() || submitting} onClick={handleSubmit}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Guardar cambios" : "Crear entidad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImageUploadActions({
  aiGeneratedUrl,
  aiGenerating,
  aiError,
  aiElapsed,
  name,
  selectedFile,
  onFileClick,
  onGenerateAi,
  onCancelGeneration,
  onGenerateImage,
}: {
  readonly aiGeneratedUrl: string | null;
  readonly aiGenerating: boolean;
  readonly aiError: string | null;
  readonly aiElapsed: number;
  readonly name: string;
  readonly selectedFile: File | null;
  readonly onFileClick: () => void;
  readonly onGenerateAi: () => Promise<void>;
  readonly onCancelGeneration: () => void;
  readonly onGenerateImage: ((data: {
    canonicalName: string;
    description: string;
    type: string;
    aliases: string[];
  }) => Promise<string>) | undefined;
}) {
  return (
    <>
      {!aiGeneratedUrl && !aiGenerating && (
        <button
          type="button"
          onClick={onFileClick}
          className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/40 hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <ImageIcon className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {selectedFile ? "Cambiar imagen" : "Seleccionar imagen"}
          </p>
        </button>
      )}

      {aiGenerating && (
        <div className="space-y-2">
          <div className="w-full border-2 border-border rounded-lg p-4 text-center bg-muted/30">
            <Loader2 className="h-6 w-6 mx-auto mb-1 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Generando imagen con IA ({aiElapsed}s)
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelGeneration}
            className="w-full border border-border rounded-lg p-2 text-center text-sm text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {!aiGenerating && aiError && (
        <div className="space-y-2">
          <div className="w-full border-2 border-destructive/30 bg-destructive/5 rounded-lg p-4 text-center">
            <p className="text-sm text-destructive mb-2">{aiError}</p>
          </div>
          <button
            type="button"
            onClick={onGenerateAi}
            className="w-full border-2 border-border rounded-lg p-4 text-center hover:border-primary/40 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-sm text-primary font-medium">Reintentar</p>
          </button>
        </div>
      )}

      {!aiGenerating && !aiError && !aiGeneratedUrl && (
        <button
          type="button"
          onClick={onGenerateAi}
          disabled={!name.trim() || !onGenerateImage}
          className="w-full border-2 border-border rounded-lg p-4 text-center hover:border-primary/40 hover:bg-muted/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-6 w-6 mx-auto mb-1 text-primary" />
          <p className="text-sm text-primary font-medium">Generar con IA</p>
        </button>
      )}
    </>
  );
}
