import { describe, expect, it } from "vitest";
import { canExecuteDestructiveAction, createReleaseAuditSequence, evaluatePolicies, evaluateSloGate, nextRolloutStage, verifyProvenance } from "./releasePlane";

describe("AquaGuard release-plane controls", () => {
  it("verifies a clean release dossier", () => {
    expect(verifyProvenance({ digest: "sha256:91a8f2e217", sourceCommit: "91a8f2e", builder: "github-actions", provenanceDigest: "sha256:ab12cd34", sbomPackages: 142, criticalFindings: 0 }).verified).toBe(true);
  });

  it("blocks mutable images and privileged workloads", () => {
    const checks = evaluatePolicies({ imageTag: "sensor-gateway:latest", replicas: 1, memoryLimitMi: 256, privileged: true, hasOwnerLabel: false, environment: "prod", labels: {} });
    expect(checks.filter(check => check.status === "block").length).toBe(4);
  });

  it("freezes promotion when reliability thresholds breach", () => {
    const gate = evaluateSloGate({ p95LatencyMs: 2410, errorRate: 0.038, retryBurn: 11.4, availability: 0.9982 });
    expect(gate.allowed).toBe(false);
    expect(gate.breaches).toHaveLength(4);
  });

  it("advances through the controlled rollout ladder", () => {
    expect(nextRolloutStage(5, "promote")).toBe(25);
    expect(nextRolloutStage(25, "freeze")).toBe(25);
    expect(nextRolloutStage(25, "rollback")).toBe(0);
  });

  it("covers every release governance event type in the audit sequence", () => {
    const events = createReleaseAuditSequence({ releaseId: "1842", service: "sensor-gateway", version: "v2.18.4", commit: "91a8f2e", imageDigest: "sha256:91a8f2e217", environment: "north-plant", owner: "karan", rolloutStatus: "frozen" });
    expect(events.map(event => event.type)).toEqual(["ci", "policy", "telemetry", "ai", "human", "system"]);
    expect(events.find(event => event.type === "human")?.rationale).toContain("Pending");
  });

  it("requires approval and meaningful rationale for destructive actions", () => {
    expect(canExecuteDestructiveAction(false, "approved later")).toBe(false);
    expect(canExecuteDestructiveAction(true, "rollback because SLO breached")).toBe(true);
  });
});
