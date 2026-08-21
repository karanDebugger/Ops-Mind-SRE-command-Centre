import { describe, expect, it } from "vitest";
import { auditEventForDecision, buildAuditTrail, transitionAction, validateDeploymentManifest } from "./ops";

describe("deployment safety policy", () => {
  it("flags mutable images and under-sized resources", () => {
    const results = validateDeploymentManifest({ image: "sensor-gateway:latest", memoryLimitMi: 256, replicas: 2 });
    expect(results.map(result => result.severity)).toEqual(["High", "Medium", "Pass"]);
  });

  it("passes a compliant manifest", () => {
    const results = validateDeploymentManifest({ image: "sensor-gateway:2.18.3", memoryLimitMi: 512, replicas: 3 });
    expect(results.every(result => result.severity === "Pass")).toBe(true);
  });
});

describe("approval gate", () => {
  it("allows only proposed actions to transition", () => {
    expect(transitionAction("proposed", "approve")).toBe("approved");
    expect(transitionAction("proposed", "reject")).toBe("rejected");
    expect(() => transitionAction("approved", "approve")).toThrow("Only proposed actions may be decided");
  });

  it("creates an auditable event for every human decision", () => {
    expect(auditEventForDecision("rollback", "approve", "operator", "Rollback is safer than live patching")).toEqual({
      type: "human_approval",
      action: "rollback",
      actor: "operator",
      rationale: "Rollback is safer than live patching",
      logged: true,
    });
  });

  it("retains the full AI-to-human-to-system audit sequence", () => {
    const events = buildAuditTrail({ suggestion: "pause rollout", decision: { action: "pause rollout", approved: true, actor: "operator", rationale: "Approved after checking evidence" }, systemAction: "rollout paused in simulator" });
    expect(events.map(event => event.type)).toEqual(["ai_suggestion", "human_approval", "system_action"]);
    expect(events.every(event => event.logged)).toBe(true);
  });
});
