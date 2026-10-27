import { api } from "@/services/api.service";
import type {
  AuditAlert,
  AuditAlertResolution,
  AuditAlertStatus,
} from "@/types/audit-alert";

export function getAuditAlerts(
  projectId: string,
  status: AuditAlertStatus = "ACTIVE",
): Promise<AuditAlert[]> {
  return api.get<AuditAlert[]>(
    `/audit/projects/${encodeURIComponent(projectId)}/alerts?status=${status}`,
  );
}

export async function getAuditAlertHistory(
  projectId: string,
): Promise<AuditAlert[]> {
  const [dismissed, resolved] = await Promise.all([
    getAuditAlerts(projectId, "DISMISSED"),
    getAuditAlerts(projectId, "RESOLVED"),
  ]);
  return [...dismissed, ...resolved].sort(
    (left, right) =>
      new Date(right.resolvedAt ?? right.createdAt).getTime() -
      new Date(left.resolvedAt ?? left.createdAt).getTime(),
  );
}

export function updateAuditAlert(
  alertId: string,
  status: AuditAlertResolution | "ACTIVE",
): Promise<AuditAlert> {
  return api.patch<AuditAlert>(
    `/audit/alerts/${encodeURIComponent(alertId)}`,
    { status },
  );
}

export function applyAuditAlertKnowledgeUpdate(
  alertId: string,
): Promise<AuditAlert> {
  return api.post<AuditAlert>(
    `/audit/alerts/${encodeURIComponent(alertId)}/apply-kb-update`,
    {},
  );
}
