import useSWR from "swr";

import {
  getAuditAlertHistory,
  getAuditAlerts,
} from "@/services/audit-alerts.service";

export function useAuditAlerts(projectId: string) {
  return useSWR(
    projectId ? ["audit-alerts", projectId] : null,
    () => getAuditAlerts(projectId),
  );
}

export function useAuditAlertHistory(projectId: string, enabled: boolean) {
  return useSWR(
    enabled && projectId ? ["audit-alert-history", projectId] : null,
    () => getAuditAlertHistory(projectId),
  );
}
