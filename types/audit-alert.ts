export type AuditAlertStatus =
  | "ACTIVE"
  | "RESOLVED"
  | "DISMISSED"
  | "OBSOLETE";

export type AuditAlertResolution = "RESOLVED" | "DISMISSED";

export type AuditAlertConflict = {
  entityId: string;
  entityName: string;
  field: string;
  currentValue: string;
  observedValue: string;
  evidence: string[];
};

export type AuditAlert = {
  id: string;
  projectId: string;
  sceneId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  title: string;
  description: string | null;
  explanation: string | null;
  confidence: number;
  status: AuditAlertStatus;
  createdAt: string;
  conflict: AuditAlertConflict | null;
};
