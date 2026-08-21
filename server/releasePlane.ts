export type PolicyCheck = { rule: string; status: "pass" | "warn" | "block"; detail: string };
export type ReleaseEvidence = { digest: string; sourceCommit: string; builder: string; provenanceDigest: string; sbomPackages: number; criticalFindings: number };
export type RolloutStage = 0 | 5 | 25 | 50 | 100;
export type SloSnapshot = { p95LatencyMs: number; errorRate: number; retryBurn: number; availability: number };
export type ReleaseDossier = { releaseId: string; service: string; version: string; commit: string; imageDigest: string; environment: "north-plant" | "staging"; owner: string; rolloutStatus: "queued" | "canary" | "frozen" | "promoted" | "rolled-back" };
export type ReleaseAuditEvent = { type: "ci" | "policy" | "telemetry" | "ai" | "human" | "system"; message: string; actor: string; rationale?: string };

export function createReleaseAuditSequence(dossier: ReleaseDossier): ReleaseAuditEvent[] {
  return [
    { type: "ci", message: `Release ${dossier.releaseId} built from ${dossier.commit}`, actor: "github-actions" },
    { type: "policy", message: "Policy and provenance checks evaluated", actor: "aquaguard-policy-engine" },
    { type: "telemetry", message: `Canary telemetry linked for ${dossier.service}`, actor: "otel-collector" },
    { type: "ai", message: "Release advisor generated a recommendation", actor: "aquaguard-advisor" },
    { type: "human", message: "Operator decision required before promotion or rollback", actor: dossier.owner, rationale: "Pending explicit operator rationale" },
    { type: "system", message: "No production mutation executed; simulator awaits approval", actor: "aquaguard-simulator" },
  ];
}

export function verifyProvenance(evidence: ReleaseEvidence) {
  const validDigest = /^sha256:[a-f0-9]{8,}/i.test(evidence.digest);
  const validProvenance = /^sha256:[a-f0-9]{8,}/i.test(evidence.provenanceDigest);
  const validCommit = /^[a-f0-9]{7,40}$/i.test(evidence.sourceCommit);
  const cleanSbom = evidence.sbomPackages > 0 && evidence.criticalFindings === 0;
  return { verified: validDigest && validProvenance && validCommit && cleanSbom, validDigest, validProvenance, validCommit, cleanSbom };
}

export function evaluatePolicies(input: { imageTag: string; replicas: number; memoryLimitMi: number; privileged: boolean; hasOwnerLabel: boolean; environment?: string; labels?: Record<string, string> }): PolicyCheck[] {
  return [
    { rule: "Immutable image", status: input.imageTag.includes("@sha256:") ? "pass" : "block", detail: input.imageTag.includes("@sha256:") ? "Digest pinned" : "Mutable tags are not allowed" },
    { rule: "Replica floor", status: input.replicas >= 3 ? "pass" : "block", detail: input.replicas >= 3 ? `${input.replicas} replicas configured` : "North Plant requires at least 3 replicas" },
    { rule: "Memory baseline", status: input.memoryLimitMi >= 512 ? "pass" : "warn", detail: input.memoryLimitMi >= 512 ? "Within baseline" : "Below North Plant baseline" },
    { rule: "Privileged container", status: input.privileged ? "block" : "pass", detail: input.privileged ? "Privileged mode is forbidden" : "Runs without elevated privileges" },
    { rule: "Ownership metadata", status: input.hasOwnerLabel && input.labels?.["app.kubernetes.io/part-of"] ? "pass" : "warn", detail: input.hasOwnerLabel ? "Owner and application labels present" : "Add owner and app.kubernetes.io/part-of labels" },
    { rule: "Environment boundary", status: input.environment === "north-plant" || input.environment === "staging" ? "pass" : "block", detail: input.environment ? `Approved environment: ${input.environment}` : "Unknown environment is blocked" },
  ];
}

export function evaluateSloGate(snapshot: SloSnapshot) {
  const breaches = [
    snapshot.p95LatencyMs > 1000 ? "p95 latency above 1000ms" : null,
    snapshot.errorRate > 0.02 ? "error rate above 2%" : null,
    snapshot.retryBurn > 10 ? "retry budget burn above 10x" : null,
    snapshot.availability < 0.999 ? "availability below 99.9%" : null,
  ].filter(Boolean) as string[];
  return { allowed: breaches.length === 0, breaches };
}

export function nextRolloutStage(current: RolloutStage, decision: "promote" | "freeze" | "rollback"): RolloutStage {
  if (decision === "rollback") return 0;
  if (decision === "freeze") return current;
  if (current === 0) return 5;
  if (current === 5) return 25;
  if (current === 25) return 50;
  return 100;
}

export function canExecuteDestructiveAction(approved: boolean, rationale: string) {
  return approved === true && rationale.trim().length >= 12;
}
