export type Scenario = "healthy" | "policy-blocked" | "slo-breach" | "drifted-cluster" | "provenance-failure";
export type PlatformEnvironment = "dev" | "staging" | "north-plant-sim";
export type PlatformCluster = { name: string; environment: PlatformEnvironment; region: string; version: string; namespaces: string[] };
export type PlatformNamespace = { name: string; labels: Record<string, string>; workloadCount: number };
export type PlatformService = { name: string; owner: string; tier: "critical" | "standard"; dependencies: string[]; sloId: string };
export type PlatformRelease = { id: string; service: string; version: string; commit: string; imageDigest: string; environment: PlatformEnvironment; rollout: number; status: "queued" | "running" | "frozen" | "approved" | "rolled-back" };
export type PlatformSlo = { id: string; name: string; target: number; window: string; errorBudgetMinutes: number };
export type ErrorBudget = { sloId: string; consumedPercent: number; remainingPercent: number; burnRate: number; status: "healthy" | "warning" | "exhausted" };
export type WorkloadState = "ready" | "degraded" | "crashed" | "pending";
export type PlatformWorkload = { name: string; namespace: string; replicas: number; ready: number; restarts: number; state: WorkloadState; imageDigest: string };
export type FailureInjection = { latencyMs: number; errorRate: number; dependencyTimeouts: number; podCrashes: number; cpuPressure: number };
export type DesiredState = { replicas: number; imageDigest: string; environment: string; policyVersion: string };
export type ObservedState = DesiredState & { readyReplicas: number; synced: boolean };
export type PlatformAudit = { index: number; type: string; message: string; previousHash: string; hash: string };

export function detectDrift(desired: DesiredState, observed: ObservedState) {
  const fields = ["replicas", "imageDigest", "environment", "policyVersion"] as const;
  const differences: Array<{ field: string; desired: string | number; observed: string | number }> = fields.filter(field => desired[field] !== observed[field]).map(field => ({ field, desired: desired[field], observed: observed[field] }));
  if (observed.readyReplicas !== desired.replicas) differences.push({ field: "readyReplicas", desired: desired.replicas, observed: observed.readyReplicas });
  return { drifted: differences.length > 0, differences };
}

export function evaluateBurnRate(input: { fastWindowRate: number; slowWindowRate: number; budgetRemaining: number }) {
  const breaches = [input.fastWindowRate > 14, input.slowWindowRate > 2, input.budgetRemaining < 25].filter(Boolean).length;
  return { allowed: breaches === 0, breaches, reason: breaches ? "Promotion frozen: error-budget burn exceeds multi-window policy" : "Within SLO burn-rate policy" };
}

export function applyFailureInjection(workload: PlatformWorkload, failure: FailureInjection): PlatformWorkload {
  const crashCount = Math.min(workload.replicas, failure.podCrashes);
  const ready = Math.max(0, workload.replicas - crashCount);
  return { ...workload, ready, restarts: workload.restarts + crashCount, state: crashCount > 0 ? "crashed" : failure.errorRate > 0.05 || failure.cpuPressure > 85 ? "degraded" : "ready" };
}

export function evaluatePolicyPack(input: { environment: string; signed: boolean; imageDigest: string; replicas: number; labels: Record<string, string> }) {
  return [
    { rule: "signed-artifact", status: input.signed ? "pass" : "block", detail: input.signed ? "Signature verified" : "Artifact signature missing" },
    { rule: "immutable-digest", status: input.imageDigest.startsWith("sha256:") ? "pass" : "block", detail: "Mutable image references are forbidden" },
    { rule: "replica-floor", status: input.replicas >= 3 ? "pass" : "block", detail: "North Plant requires three replicas" },
    { rule: "service-owner", status: input.labels["platform.owner"] ? "pass" : "warn", detail: "Every workload needs an accountable owner" },
  ] as const;
}

export function appendAudit(previous: PlatformAudit[], type: string, message: string): PlatformAudit[] {
  const previousHash = previous.at(-1)?.hash ?? "GENESIS";
  const index = previous.length;
  const hash = `${index}:${previousHash}:${type}:${message}`;
  return [...previous, { index, type, message, previousHash, hash }];
}

export function isApprovalExpired(createdAt: number, now: number, ttlMs = 15 * 60 * 1000) { return now - createdAt > ttlMs; }

export function verifyAuditChain(events: PlatformAudit[]) {
  return events.every((event, index) => event.index === index && event.previousHash === (index === 0 ? "GENESIS" : events[index - 1]?.hash) && event.hash === `${event.index}:${event.previousHash}:${event.type}:${event.message}`);
}
