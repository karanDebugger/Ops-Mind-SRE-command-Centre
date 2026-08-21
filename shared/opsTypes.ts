export type InfrastructureKind = "pump" | "sensor" | "water-treatment";
export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "active" | "resolved";
export type AuditActor = "OpsMind AI" | "operator" | "telemetry" | "system";

export type InfrastructureComponent = { id: string; name: string; kind: InfrastructureKind; health: number; cpu: number; memory: number; network: number; latencyMs: number; throughputPerSecond: number };
export type IncidentRecord = { id: string; title: string; service: string; severity: IncidentSeverity; status: IncidentStatus; evidenceIds: string[] };
export type AuditRecord = { id: string; timestamp: number; actor: AuditActor; eventType: "ai_suggestion" | "human_approval" | "human_rejection" | "system_action"; action: string; rationale?: string };
export type EvaluationRecord = { incidentId: string; faithfulness: number; retrievalHitRate: number; latencyMs: number; estimatedTokenCostUsd: number };
