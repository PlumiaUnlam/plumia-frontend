"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";

import { useAuditAlertHistory } from "@/hooks/use-audit-alerts";
import { AuditAlertCard } from "@/components/wiki/audit-alert-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AuditAlert } from "@/types/audit-alert";

type HistoryStatusFilter = "ALL" | "DISMISSED" | "RESOLVED";
type HistorySeverityFilter = "ALL" | AuditAlert["severity"];

const severityLabels: Record<AuditAlert["severity"], string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export function AuditAlertHistoryDialog({
  projectId,
  open,
  onOpenChange,
  updatingAlertId,
  onRestore,
  onFocusEvidence,
}: {
  readonly projectId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly updatingAlertId: string | null;
  readonly onRestore: (alertId: string) => Promise<boolean>;
  readonly onFocusEvidence: (alert: AuditAlert, evidenceIndex?: number) => void;
}) {
  const { data: alerts = [], error, isLoading, mutate } = useAuditAlertHistory(
    projectId,
    open,
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<HistoryStatusFilter>("ALL");
  const [category, setCategory] = useState("ALL");
  const [severity, setSeverity] = useState<HistorySeverityFilter>("ALL");
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(alerts.map((alert) => alert.category))].sort(),
    [alerts],
  );
  const filteredAlerts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return alerts.filter((alert) => {
      const matchesStatus = status === "ALL" || alert.status === status;
      const matchesCategory = category === "ALL" || alert.category === category;
      const matchesSeverity = severity === "ALL" || alert.severity === severity;
      const searchableText = [
        alert.title,
        alert.description,
        alert.explanation,
        alert.conflict?.entityName,
        alert.conflict?.relationship?.sourceEntityName,
        alert.conflict?.relationship?.targetEntityName,
        alert.conflict?.field,
        alert.conflict?.currentValue,
        alert.conflict?.observedValue,
        ...(alert.conflict?.evidence ?? []),
        ...(alert.conflict?.supportingEvidence?.map((item) => item.quote) ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("es");
      return (
        matchesStatus &&
        matchesCategory &&
        matchesSeverity &&
        (!normalizedQuery || searchableText.includes(normalizedQuery))
      );
    });
  }, [alerts, category, query, severity, status]);

  const restoreAlert = async (alertId: string) => {
    if (await onRestore(alertId)) {
      setRestoreError(null);
      await mutate();
    } else {
      setRestoreError("No se pudo devolver la inconsistencia a pendientes.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="flex max-h-[min(90dvh,850px)] flex-col gap-0 overflow-hidden border-primary/20 bg-background p-0 shadow-2xl"
      >
        <DialogHeader className="shrink-0 border-b border-border bg-card px-5 py-5 pr-14 sm:px-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <AlertTriangle className="size-4" />
            </span>
            <Badge variant="outline">Historial</Badge>
          </div>
          <DialogTitle>Inconsistencias archivadas</DialogTitle>
          <DialogDescription>
            Revisa lo rechazado o marcado como resuelto. Puedes devolver cualquier alerta a pendientes.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="gap-3 bg-muted/20">
          <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-2.5 sm:col-span-2 lg:col-span-1">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar en el historial..."
                className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </label>
            <FilterSelect
              label="Estado"
              value={status}
              onChange={(value) => setStatus(value as HistoryStatusFilter)}
            >
              <option value="ALL">Todos</option>
              <option value="DISMISSED">Rechazadas</option>
              <option value="RESOLVED">Resueltas</option>
            </FilterSelect>
            <FilterSelect
              label="Tipo"
              value={category}
              onChange={setCategory}
            >
              <option value="ALL">Todos</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {categoryLabel(item)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Severidad"
              value={severity}
              onChange={(value) => setSeverity(value as HistorySeverityFilter)}
            >
              <option value="ALL">Todas</option>
              {Object.entries(severityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
            {restoreError && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                {restoreError}
              </p>
            )}
            {isLoading ? (
              <HistoryMessage>Cargando historial...</HistoryMessage>
            ) : error ? (
              <HistoryMessage>No se pudo cargar el historial.</HistoryMessage>
            ) : filteredAlerts.length === 0 ? (
              <HistoryMessage>
                {alerts.length
                  ? "No hay alertas que coincidan con esos filtros."
                  : "Todavía no hay inconsistencias archivadas."}
              </HistoryMessage>
            ) : (
              filteredAlerts.map((alert) => (
                <AuditAlertCard
                  key={alert.id}
                  alert={alert}
                  updating={updatingAlertId === alert.id}
                  historyMode
                  onRestore={() => void restoreAlert(alert.id)}
                  onFocusEvidence={(index) => onFocusEvidence(alert, index)}
                />
              ))
            )}
          </div>
        </DialogBody>

        <DialogFooter
          className="m-0 w-full shrink-0 rounded-b-xl border-border bg-muted px-5 py-3 sm:px-6"
          showCloseButton
        >
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-2.5">
      <span className="shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function HistoryMessage({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    CONTINUITY: "Continuidad",
    TIMELINE: "Línea temporal",
    CHARACTER: "Personajes",
    PLOT: "Trama",
    WORLDBUILDING: "Universo",
  };
  return labels[category] ?? category;
}
