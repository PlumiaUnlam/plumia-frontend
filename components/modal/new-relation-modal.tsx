"use client";

import { useEffect, useState, type ComponentType } from "react";
import {
  Heart,
  Handshake,
  Swords,
  Users,
  GraduationCap,
  Shield,
  Link,
  MapPin,
  Package,
  UserRoundCheck,
} from "lucide-react";

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

import type { Entity } from "@/types/entity";
import type {
  CreateRelationshipInput,
  RelationType,
} from "@/types/relationship";

const relationTypes: Array<{
  id: RelationType;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "ALLY", label: "Aliado", icon: Handshake },
  { id: "ENEMY", label: "Enemigo", icon: Swords },
  { id: "FAMILY", label: "Familia", icon: Users },
  { id: "ROMANTIC", label: "Romance", icon: Heart },
  { id: "MENTOR", label: "Mentor", icon: GraduationCap },
  { id: "RIVAL", label: "Rival", icon: Shield },
  { id: "KNOWS", label: "Conoce", icon: UserRoundCheck },
  { id: "MEMBER_OF", label: "Miembro", icon: Link },
  { id: "LOCATED_IN", label: "Ubicado", icon: MapPin },
  { id: "OWNS", label: "Posee", icon: Package },
];

type NewRelationModalProps = {
  readonly show: boolean;
  readonly entities: readonly Entity[];
  readonly onClose: () => void;
  readonly onSubmit: (input: CreateRelationshipInput) => Promise<void>;
};

export function NewRelationModal({
  show,
  entities,
  onClose,
  onSubmit,
}: NewRelationModalProps) {
  const [sourceEntityId, setSourceEntityId] = useState("");
  const [targetEntityId, setTargetEntityId] = useState("");
  const [relationType, setRelationType] = useState<RelationType>("ALLY");
  const [intensity, setIntensity] = useState(3);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) return;

    let isCurrent = true;

    queueMicrotask(() => {
      if (!isCurrent) return;

      setSourceEntityId("");
      setTargetEntityId("");
      setRelationType("ALLY");
      setIntensity(3);
      setDescription("");
      setSubmitting(false);
      setError(null);
    });

    return () => {
      isCurrent = false;
    };
  }, [show]);

  const canSubmit =
    !!sourceEntityId && !!targetEntityId && sourceEntityId !== targetEntityId;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        sourceEntityId,
        targetEntityId,
        relationType,
        intensity,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear la relación",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-[600px] gap-0 overflow-hidden">
        <DialogHeader className="border-b p-6 py-4">
          <DialogTitle>Nueva Relación</DialogTitle>
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
              onChange={setSourceEntityId}
            />
            <EntitySelect
              id="relation-target"
              label="Hasta"
              value={targetEntityId}
              entities={entities}
              excludeId={sourceEntityId}
              onChange={setTargetEntityId}
            />
          </FieldGroup>

          <FieldSet className="space-y-2">
            <FieldLegend>Tipo de relación</FieldLegend>

            <FieldGroup className="grid grid-cols-5 gap-2">
              {relationTypes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRelationType(id)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                    relationType === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
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
                placeholder="Describe brevemente el vínculo entre estos personajes..."
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
            Crear relación
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
  readonly onChange: (value: string) => void;
};

function EntitySelect({
  id,
  label,
  value,
  entities,
  excludeId,
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
          <option value="">Seleccionar personaje...</option>
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
