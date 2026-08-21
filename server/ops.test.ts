import { describe, expect, it } from "vitest";
import { auditEventForDecision, transitionAction, validateDeploymentManifest } from "./ops";

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
    expect(auditEventForDecision("rollback", "approve", "operator")).toEqual({
      type: "human_approval",
      action: "rollback",
      actor: "operator",
      logged: true,
    });
  });
});
