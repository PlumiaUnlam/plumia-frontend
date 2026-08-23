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

export function updateAuditAlert(
  alertId: string,
  status: AuditAlertResolution,
): Promise<AuditAlert> {
  return api.patch<AuditAlert>(
    `/audit/alerts/${encodeURIComponent(alertId)}`,
    { status },
  );
}
