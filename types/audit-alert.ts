export type AuditAlertStatus =
  | "ACTIVE"
  | "RESOLVED"
  | "DISMISSED"
  | "OBSOLETE";

export type AuditAlertUpdateStatus = "ACTIVE" | "RESOLVED" | "DISMISSED";
export type AuditAlertResolution = Exclude<AuditAlertUpdateStatus, "ACTIVE">;

export type AuditAlertConflict = {
  entityId: string | null;
  entityName: string;
  field: string;
  currentValue: string;
  observedValue: string;
  evidence: string[];
  supportingEvidence?: Array<{
    side: "first" | "second";
    quote: string;
    sceneId?: string;
  }>;
  relationship?: {
    relationshipId: string | null;
    sourceEntityId: string | null;
    sourceEntityName: string;
    targetEntityId: string | null;
    targetEntityName: string;
    relationType: string;
  } | null;
};

export type AuditAlert = {
  id: string;
  projectId: string;
  sceneId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  ruleCode: string | null;
  sourceChunkId: string | null;
  sourceChunkHash: string | null;
  title: string;
  description: string | null;
  explanation: string | null;
  confidence: number;
  status: AuditAlertStatus;
  createdAt: string;
  resolvedAt: string | null;
  conflict: AuditAlertConflict | null;
};
