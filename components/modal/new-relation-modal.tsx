"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import {
  getAvailableRelationTypes,
  relationStyleOptions,
} from "@/lib/relation-style";
import type { Entity } from "@/types/entity";
import type {
  CreateRelationshipInput,
  Relationship,
  RelationType,
  UpdateRelationshipInput,
} from "@/types/relationship";

type NewRelationModalProps = {
  readonly show: boolean;
  readonly entities: readonly Entity[];
  readonly onClose: () => void;
  readonly onSubmit: (
    input: CreateRelationshipInput | UpdateRelationshipInput,
  ) => Promise<void>;
  readonly relationship?: Relationship | null;
  readonly mode?: "create" | "edit" | "proposal";
  readonly initialValues?: {
    sourceEntityId: string | null;
    targetEntityId: string | null;
    sourceEntityName?: string;
    targetEntityName?: string;
    relationType: RelationType;
    intensity: number;
    description: string | null;
  };
};

export function NewRelationModal({
  show,
  entities,
  onClose,
  onSubmit,
  relationship,
  mode = relationship ? "edit" : "create",
  initialValues,
}: NewRelationModalProps) {
  const [sourceEntityId, setSourceEntityId] = useState("");
  const [targetEntityId, setTargetEntityId] = useState("");
  const [relationType, setRelationType] = useState<RelationType>("ALLY");
  const [intensity, setIntensity] = useState(3);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isProposal = mode === "proposal";
  const isEditing = !!relationship && !isProposal;
  const selectedSource = useMemo(
    () => entities.find((entity) => entity.id === sourceEntityId),
    [entities, sourceEntityId],
  );
  const selectedTarget = useMemo(
    () => entities.find((entity) => entity.id === targetEntityId),
    [entities, targetEntityId],
  );
  const availableRelationTypes = useMemo(
    () =>
      getAvailableRelationTypes(selectedSource?.type, selectedTarget?.type),
    [selectedSource?.type, selectedTarget?.type],
  );
  const availableRelationOptions = useMemo(
    () =>
      relationStyleOptions.filter((option) =>
        availableRelationTypes.includes(option.id),
      ),
    [availableRelationTypes],
  );

  useEffect(() => {
    if (!show) return;

    let isCurrent = true;

    queueMicrotask(() => {
      if (!isCurrent) return;

      const values = relationship ?? initialValues;
      setSourceEntityId(values?.sourceEntityId ?? "");
      setTargetEntityId(values?.targetEntityId ?? "");
      setRelationType(values?.relationType ?? "ALLY");
      setIntensity(values?.intensity ?? 3);
      setDescription(values?.description ?? "");
      setSubmitting(false);
      setError(null);
    });

    return () => {
      isCurrent = false;
    };
  }, [show, relationship, initialValues]);

  const activeRelationType = availableRelationTypes.includes(relationType)
    ? relationType
    : (availableRelationTypes[0] ?? "KNOWS");

  const canSubmit =
    !!sourceEntityId &&
    !!targetEntityId &&
    sourceEntityId !== targetEntityId &&
    availableRelationTypes.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const input = {
        sourceEntityId,
        targetEntityId,
        relationType: activeRelationType,
        intensity,
        description: description.trim() || (isEditing ? null : undefined),
      };
      await onSubmit(input);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar la relación",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-[600px] gap-0 overflow-hidden">
        <DialogHeader className="border-b p-6 py-4">
          <DialogTitle>
            {isProposal
              ? "Revisar propuesta de relación"
              : isEditing
                ? "Editar Relación"
                : "Nueva Relación"}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <FieldGroup className="grid grid-cols-2 gap-3">
            <EntitySelect
              id="relation-source"
              label="Desde"
              value={sourceEntityId}
              entities={entities}
              excludeId={targetEntityId}
              pendingLabel={isProposal ? initialValues?.sourceEntityName : undefined}
              onChange={setSourceEntityId}
            />
            <EntitySelect
              id="relation-target"
              label="Hasta"
              value={targetEntityId}
              entities={entities}
              excludeId={sourceEntityId}
              pendingLabel={isProposal ? initialValues?.targetEntityName : undefined}
              onChange={setTargetEntityId}
            />
          </FieldGroup>

          <FieldSet className="space-y-2">
            <FieldLegend>Tipo de relación</FieldLegend>

            <FieldGroup className="grid grid-cols-5 gap-2">
              {availableRelationOptions.map(
                ({ id, label, color, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRelationType(id)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                      activeRelationType === id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted"
                    }`}
                  >
                    <Icon
                      className="size-4"
                      style={{
                        color: activeRelationType === id ? undefined : color,
                      }}
                    />
                    {label}
                  </button>
                ),
              )}
            </FieldGroup>
          </FieldSet>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="relation-intensity">Intensidad</FieldLabel>
              <span className="text-sm font-semibold text-primary">
                {intensity} / 5
              </span>
            </div>

            <FieldContent>
              <input
                id="relation-intensity"
                type="range"
                min={1}
                max={5}
                value={intensity}
                onChange={(event) => setIntensity(Number(event.target.value))}
                className="w-full accent-primary"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>Superficial</span>
                <span>Profunda</span>
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="relation-description">
              Descripción
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="relation-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe brevemente el vínculo entre estas entidades..."
                rows={3}
              />
            </FieldContent>
          </Field>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {isProposal
              ? "Aceptar propuesta"
              : isEditing
                ? "Guardar cambios"
                : "Crear relación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type EntitySelectProps = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly entities: readonly Entity[];
  readonly excludeId: string;
  readonly pendingLabel?: string;
  readonly onChange: (value: string) => void;
};

function EntitySelect({
  id,
  label,
  value,
  entities,
  excludeId,
  pendingLabel,
  onChange,
}: EntitySelectProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">
            {pendingLabel ? `${pendingLabel} (pendiente)` : "Seleccionar entidad..."}
          </option>
          {entities
            .filter((entity) => entity.id !== excludeId)
            .map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.canonicalName}
              </option>
            ))}
        </select>
      </FieldContent>
    </Field>
  );
}
