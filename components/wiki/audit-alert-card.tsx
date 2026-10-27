"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Eye,
  FileText,
  RotateCcw,
  RefreshCw,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import type { AuditAlert } from "@/types/audit-alert";

const severityLabel = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
} as const;

export function AuditAlertCard({
  alert,
  focused = false,
  updating,
  onFocusEvidence,
  onResolve,
  onDismiss,
  onApplyKnowledgeUpdate,
  stateTrackingEnabled = false,
  historyMode = false,
  onRestore,
}: {
  readonly alert: AuditAlert;
  readonly focused?: boolean;
  readonly updating: boolean;
  readonly onFocusEvidence: (index?: number) => void;
  readonly onResolve?: () => void;
  readonly onDismiss?: () => void;
  readonly onApplyKnowledgeUpdate?: () => void;
  readonly stateTrackingEnabled?: boolean;
  readonly historyMode?: boolean;
  readonly onRestore?: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const conflict = alert.conflict;
  const isCrossChunkContradiction =
    alert.ruleCode === "INTRA_SCENE_CONTRADICTION" ||
    alert.ruleCode === "CROSS_SCENE_CONTRADICTION";
  const isCrossSceneContradiction =
    alert.ruleCode === "CROSS_SCENE_CONTRADICTION";
  const firstEvidence =
    conflict?.supportingEvidence?.find((evidence) => evidence.side === "first")
      ?.quote ?? conflict?.evidence[0];
  const secondEvidence =
    conflict?.supportingEvidence?.find(
      (evidence) => evidence.side === "second",
    )?.quote ?? conflict?.evidence[1];
  const explanation =
    alert.explanation ??
    alert.description ??
    "La revisión encontró información que podría no ser consistente con la historia.";
  const canApplyKnowledgeUpdate = Boolean(
    !isCrossChunkContradiction &&
      conflict &&
      ["location", "status", "health_status"].includes(
        conflict.field.trim().toLowerCase().replace(/[\s-]+/g, "_"),
      ) &&
      conflict.entityId &&
      alert.sourceChunkId,
  );
  const hasEvidence = Boolean(firstEvidence || secondEvidence || conflict?.evidence.length);
  const archivedAt = alert.resolvedAt
    ? new Intl.DateTimeFormat("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(alert.resolvedAt))
    : null;

  const focusEvidence = (index: number) => {
    setDetailsOpen(false);
    onFocusEvidence(index);
  };

  return (
    <>
      <article
        id={`audit-alert-${alert.id}`}
        tabIndex={-1}
        className={`w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-background to-primary/[0.04] p-3 shadow-sm ${focused ? "ring-2 ring-primary/50" : ""}`}
      >
        <div className="flex w-full min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-700">
            <AlertTriangle className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-start gap-1.5">
              <p className="min-w-0 flex-1 break-words text-xs font-semibold leading-5 text-foreground">
                {alert.title}
              </p>
              <Badge
                variant="outline"
                className="h-auto shrink-0 border-amber-500/30 bg-amber-500/5 px-1.5 py-0 text-[9px] text-amber-700"
              >
                {severityLabel[alert.severity]}
              </Badge>
            </div>
            <AuditAlertContext
              conflict={conflict}
              isCrossChunkContradiction={isCrossChunkContradiction}
              isCrossSceneContradiction={isCrossSceneContradiction}
            />

            <div className="mt-2 rounded-lg border border-primary/10 bg-background/75 px-3 py-2.5">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">
                ¿Qué se encontró?
              </p>
              <p className="break-words text-[11px] leading-relaxed text-foreground/85">
                {explanation}
              </p>
            </div>

            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="mt-1.5 h-7 px-1.5 text-[10px] text-primary hover:bg-primary/5"
              onClick={() => setDetailsOpen(true)}
            >
              <Eye className="size-3.5" />
              Ver detalles de la inconsistencia
            </Button>

            {historyMode ? (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border bg-background/80 p-2">
                <Badge variant="outline" className="text-[9px]">
                  {alert.status === "DISMISSED" ? "Rechazada" : "Resuelta"}
                </Badge>
                <span className="min-w-0 flex-1 text-[10px] text-muted-foreground">
                  {archivedAt ? `Archivada el ${archivedAt}` : "Archivada"}
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="h-7 whitespace-normal text-[10px]"
                  disabled={updating}
                  onClick={onRestore}
                >
                  <RotateCcw className="size-3.5" />
                  {updating ? "Restaurando..." : "Volver a pendientes"}
                </Button>
              </div>
            ) : (
              <div className="mt-2 grid w-full min-w-0 grid-cols-3 gap-1.5">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="h-auto min-h-7 min-w-0 w-full whitespace-normal px-1 py-1 text-[10px] leading-tight"
                  disabled={updating}
                  onClick={() => {
                    if (isCrossChunkContradiction && hasEvidence) {
                      setDetailsOpen(true);
                    } else {
                      onFocusEvidence(0);
                    }
                  }}
                >
                  <FileText className="size-3.5" />
                  Ver evidencia
                </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="h-auto min-h-7 min-w-0 w-full whitespace-normal px-1 py-1 text-[10px] leading-tight"
                disabled={updating}
                onClick={onDismiss}
                title="No volver a mostrar esta misma contradicción en esta escena"
              >
                <X className="size-3.5" />
                {updating ? "Actualizando..." : "Rechazar"}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="h-auto min-h-7 min-w-0 w-full whitespace-normal px-1 py-1 text-[10px] leading-tight"
                disabled={updating}
                onClick={onResolve}
                title="Archivar por ahora; un análisis posterior puede volver a mostrarla"
              >
                <Check className="size-3.5" />
                {updating ? "Actualizando..." : "Marcar resuelta"}
              </Button>
              </div>
            )}
            {!historyMode && stateTrackingEnabled && canApplyKnowledgeUpdate && onApplyKnowledgeUpdate && (
              <div className="mt-1.5 w-full min-w-0">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="h-auto min-h-7 min-w-0 w-full whitespace-normal px-1 py-1 text-[10px] leading-tight"
                  disabled={updating}
                  onClick={onApplyKnowledgeUpdate}
                >
                  <RefreshCw className="size-3.5" />
                  {updating ? "Actualizando..." : "Actualizar línea temporal"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </article>

      <AuditAlertDetailsDialog
        alert={alert}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        isCrossChunkContradiction={isCrossChunkContradiction}
        historyMode={historyMode}
        archivedAt={archivedAt}
        explanation={explanation}
        firstEvidence={firstEvidence}
        secondEvidence={secondEvidence}
        focusEvidence={focusEvidence}
      />
    </>
  );
}

function AuditAlertContext({
  conflict,
  isCrossChunkContradiction,
  isCrossSceneContradiction,
}: Readonly<{
  conflict: AuditAlert["conflict"];
  isCrossChunkContradiction: boolean;
  isCrossSceneContradiction: boolean;
}>) {
  return (
    <>
      {isCrossChunkContradiction && (
        <p className="mt-1 text-[10px] font-medium text-amber-800">
          {isCrossSceneContradiction
            ? "Datos incompatibles entre escenas"
            : "Dos datos incompatibles dentro de esta escena"}
        </p>
      )}
      {conflict && !isCrossChunkContradiction && (
        <p className="mt-1 break-words text-[10px] text-muted-foreground">
          {conflict.relationship
            ? `${conflict.relationship.sourceEntityName} · ${conflict.relationship.targetEntityName}`
            : conflict.entityName}
        </p>
      )}
    </>
  );
}

type AuditAlertDetailsDialogProps = {
  readonly alert: AuditAlert;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly isCrossChunkContradiction: boolean;
  readonly historyMode: boolean;
  readonly archivedAt: string | null;
  readonly explanation: string;
  readonly firstEvidence: string | undefined;
  readonly secondEvidence: string | undefined;
  readonly focusEvidence: (index: number) => void;
};

function AuditAlertDetailsDialog({
  alert,
  open,
  onOpenChange,
  isCrossChunkContradiction,
  historyMode,
  archivedAt,
  explanation,
  firstEvidence,
  secondEvidence,
  focusEvidence,
}: Readonly<AuditAlertDetailsDialogProps>) {
  const conflict = alert.conflict;

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="md"
          className="flex max-h-[min(88dvh,760px)] flex-col gap-0 overflow-hidden border-amber-500/30 bg-background p-0 shadow-2xl"
        >
          <DialogHeader className="shrink-0 border-b border-border bg-background px-5 py-5 pr-14 sm:px-6">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-700">
                <AlertTriangle className="size-4" />
              </span>
              <Badge
                variant="outline"
                className="border-amber-600/35 bg-amber-100 text-amber-950 dark:border-amber-400/40 dark:bg-amber-950 dark:text-amber-100"
              >
                Severidad {severityLabel[alert.severity].toLowerCase()}
              </Badge>
              {isCrossChunkContradiction && (
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  Dentro de la misma escena
                </Badge>
              )}
              {historyMode && archivedAt && (
                <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                  Archivada {archivedAt}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-base">Detalle de la inconsistencia</DialogTitle>
            <DialogDescription className="break-words pr-1 text-xs leading-relaxed text-foreground/80">
              {alert.title}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-background px-5 py-5 sm:px-6">
            <section className="rounded-xl border border-primary/20 bg-card p-4 shadow-sm">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                Explicación
              </p>
              <p className="break-words text-sm leading-relaxed text-foreground">
                {explanation}
              </p>
            </section>

            {conflict && (
              <section className="space-y-2.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {isCrossChunkContradiction ? "Información en conflicto" : "Comparación"}
                  </p>
                  <p className="mt-1 break-words text-xs font-medium text-foreground">
                    {conflict.relationship
                      ? `${conflict.relationship.sourceEntityName} · ${conflict.relationship.targetEntityName}`
                      : conflict.entityName}
                  </p>
                  {conflict.relationship && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Relación: {conflict.relationship.relationType}
                    </p>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <DetailValue
                    label={isCrossChunkContradiction ? "Primer texto" : "Establecido"}
                    value={conflict.currentValue}
                    tone="muted"
                  />
                  <DetailValue
                    label={isCrossChunkContradiction ? "Segundo texto" : "Detectado"}
                    value={conflict.observedValue}
                    tone="accent"
                  />
                </div>
              </section>
            )}

            {isCrossChunkContradiction && (
              <section className="space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Evidencia en el texto
                </p>
                <EvidenceQuote
                  label="Primer fragmento"
                  quote={firstEvidence}
                  onOpen={() => focusEvidence(0)}
                />
                <EvidenceQuote
                  label="Segundo fragmento"
                  quote={secondEvidence}
                  onOpen={() => focusEvidence(1)}
                />
              </section>
            )}
            {conflict &&
              !isCrossChunkContradiction &&
              conflict.evidence.length > 0 && (
              <section className="space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Evidencia en el texto
                </p>
                {conflict.evidence.map((quote, index) => (
                  <EvidenceQuote
                    key={`${index}-${quote}`}
                    label={conflict.evidence.length > 1 ? `Cita ${index + 1}` : "Cita"}
                    quote={quote}
                    onOpen={() => focusEvidence(index)}
                  />
                ))}
              </section>
            )}
          </div>

          <DialogFooter
            className="m-0 w-full shrink-0 rounded-b-xl border-border bg-muted px-5 py-3 sm:px-6"
            showCloseButton
          >
            <span className="hidden text-[10px] text-muted-foreground sm:block sm:mr-auto">
              La decisión final queda en manos del autor.
            </span>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}


function DetailValue({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone: "muted" | "accent";
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-3 ${
        tone === "accent"
          ? "border-primary/25 bg-primary/10"
          : "border-border bg-muted"
      }`}
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-xs leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

function EvidenceQuote({
  label,
  quote,
  onOpen,
}: {
  readonly label: string;
  readonly quote?: string;
  readonly onOpen: () => void;
}) {
  if (!quote) return null;

  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground">
        {label}
      </p>
      <blockquote className="break-words border-l-2 border-primary/50 pl-3 text-xs italic leading-relaxed text-foreground">
        “{quote}”
      </blockquote>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        className="mt-2 h-7 px-1.5 text-[10px] text-primary"
        onClick={onOpen}
      >
        <FileText className="size-3.5" />
        Ver en el manuscrito
      </Button>
    </div>
  );
}
