import { AlertTriangle, Check, FileText, RefreshCw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AuditAlert } from "@/types/audit-alert";

const severityLabel = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Critica",
} as const;

export function AuditAlertCard({
  alert,
  updating,
  onFocusEvidence,
  onResolve,
  onDismiss,
  onApplyKnowledgeUpdate,
}: {
  readonly alert: AuditAlert;
  readonly updating: boolean;
  readonly onFocusEvidence: () => void;
  readonly onResolve: () => void;
  readonly onDismiss: () => void;
  readonly onApplyKnowledgeUpdate?: () => void;
}) {
  const conflict = alert.conflict;
  const canApplyKnowledgeUpdate = Boolean(
    conflict &&
      ["location", "status", "health_status"].includes(
        conflict.field.trim().toLowerCase().replace(/[\s-]+/g, "_"),
      ) &&
      alert.sourceChunkId,
  );

  return (
    <article className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
      <div className="flex w-full min-w-0 items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="min-w-0 flex-1 break-words text-xs font-semibold text-foreground">
              {alert.title}
            </p>
            <Badge
              variant="outline"
              className="h-auto shrink-0 border-amber-500/30 px-1.5 py-0 text-[9px] text-amber-700"
            >
              {severityLabel[alert.severity]}
            </Badge>
          </div>

          {conflict && (
            <div className="mt-2 grid gap-1 rounded-md border border-amber-500/15 bg-background/60 p-2 text-[10px]">
              <p className="font-semibold text-foreground">
                {conflict.entityName} - {conflict.field}
              </p>
              <p className="break-words text-muted-foreground">
                Establecido: {conflict.currentValue}
              </p>
              <p className="break-words text-muted-foreground">
                Detectado: {conflict.observedValue}
              </p>
            </div>
          )}

          {(alert.explanation || alert.description) && (
            <p className="mt-2 break-words text-[11px] text-muted-foreground">
              {alert.explanation ?? alert.description}
            </p>
          )}

          {conflict?.evidence[0] && (
            <p className="mt-2 break-words text-[10px] italic text-muted-foreground">
              &ldquo;{conflict.evidence[0]}&rdquo;
            </p>
          )}

          <div className="mt-3 grid w-full min-w-0 grid-cols-3 gap-1.5">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="h-auto min-h-7 min-w-0 w-full whitespace-normal px-1 py-1 text-[10px] leading-tight"
              disabled={updating}
              onClick={onFocusEvidence}
            >
              <FileText className="size-3.5" />
              {conflict?.evidence[0] ? "Ver evidencia" : "Abrir escena"}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="h-auto min-h-7 min-w-0 w-full whitespace-normal px-1 py-1 text-[10px] leading-tight"
              disabled={updating}
              onClick={onDismiss}
            >
              <X className="size-3.5" />
              {updating ? "Actualizando..." : "Descartar"}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="h-auto min-h-7 min-w-0 w-full whitespace-normal px-1 py-1 text-[10px] leading-tight"
              disabled={updating}
              onClick={onResolve}
            >
              <Check className="size-3.5" />
              {updating ? "Actualizando..." : "Marcar resuelta"}
            </Button>
          </div>
          {canApplyKnowledgeUpdate && onApplyKnowledgeUpdate && (
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
  );
}
