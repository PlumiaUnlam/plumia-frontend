export type AuditAlertStatus =
  | "ACTIVE"
  | "RESOLVED"
  | "DISMISSED"
  | "OBSOLETE";

export type AuditAlertResolution = "RESOLVED" | "DISMISSED";

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
  conflict: AuditAlertConflict | null;
};
