import { describe, expect, it } from "vitest";
import { appendAudit, applyFailureInjection, detectDrift, evaluateBurnRate, evaluatePolicyPack, isApprovalExpired, verifyAuditChain, type PlatformCluster, type PlatformRelease, type PlatformSlo } from "./platform";

describe("advanced platform control plane", () => {
  it("models the platform entities used by the control plane", () => {
    const cluster: PlatformCluster = { name: "north-plant-sim", environment: "north-plant-sim", region: "us-central", version: "1.30", namespaces: ["platform", "water-ops"] };
    const release: PlatformRelease = { id: "1842", service: "sensor-gateway", version: "v2.18.4", commit: "91a8f2e", imageDigest: "sha256:abc", environment: cluster.environment, rollout: 25, status: "frozen" };
    const slo: PlatformSlo = { id: "slo-1", name: "sensor availability", target: 99.9, window: "30d", errorBudgetMinutes: 43.2 };
    expect(cluster.namespaces).toContain("water-ops");
    expect(release.status).toBe("frozen");
    expect(slo.target).toBeGreaterThan(99);
  });

  it("expires stale high-risk approvals", () => {
    expect(isApprovalExpired(0, 15 * 60 * 1000 + 1)).toBe(true);
    expect(isApprovalExpired(0, 1000)).toBe(false);
  });
  it("detects GitOps drift in replicas and readiness", () => {
    const result = detectDrift({ replicas: 3, imageDigest: "sha256:abc", environment: "north-plant", policyVersion: "v4" }, { replicas: 3, imageDigest: "sha256:abc", environment: "north-plant", policyVersion: "v4", readyReplicas: 2, synced: false });
    expect(result.drifted).toBe(true);
    expect(result.differences.map(item => item.field)).toContain("readyReplicas");
  });

  it("freezes releases on fast, slow, or budget burn thresholds", () => {
    expect(evaluateBurnRate({ fastWindowRate: 18, slowWindowRate: 1.2, budgetRemaining: 80 }).allowed).toBe(false);
    expect(evaluateBurnRate({ fastWindowRate: 1, slowWindowRate: 1, budgetRemaining: 80 }).allowed).toBe(true);
  });

  it("turns injected pod crashes into observable workload degradation", () => {
    const workload = applyFailureInjection({ name: "sensor-gateway", namespace: "north-plant", replicas: 3, ready: 3, restarts: 0, state: "ready", imageDigest: "sha256:abc" }, { latencyMs: 0, errorRate: 0, dependencyTimeouts: 0, podCrashes: 2, cpuPressure: 0 });
    expect(workload.ready).toBe(1);
    expect(workload.state).toBe("crashed");
  });

  it("evaluates signed immutable artifacts and ownership labels", () => {
    const checks = evaluatePolicyPack({ environment: "north-plant", signed: false, imageDigest: "latest", replicas: 1, labels: {} });
    expect(checks.filter(check => check.status === "block")).toHaveLength(3);
  });

  it("verifies a tamper-evident audit chain", () => {
    let events = appendAudit([], "policy", "policy pack passed");
    events = appendAudit(events, "telemetry", "SLO gate evaluated");
    expect(verifyAuditChain(events)).toBe(true);
    expect(verifyAuditChain(events.map(event => event.index === 1 ? { ...event, message: "tampered" } : event))).toBe(false);
  });
});
