import useSWR from "swr";

import { getAuditAlerts } from "@/services/audit-alerts.service";

export function useAuditAlerts(projectId: string) {
  return useSWR(
    projectId ? ["audit-alerts", projectId] : null,
    () => getAuditAlerts(projectId),
  );
}
