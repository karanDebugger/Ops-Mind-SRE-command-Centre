export type PolicySeverity = "High" | "Medium" | "Pass";

export type PolicyResult = {
  rule: string;
  severity: PolicySeverity;
  message: string;
};

export function validateDeploymentManifest(manifest: { image: string; memoryLimitMi: number; replicas: number }): PolicyResult[] {
  return [
    {
      rule: "Immutable image tag",
      severity: manifest.image.endsWith(":latest") ? "High" : "Pass",
      message: manifest.image.endsWith(":latest") ? "Use a digest or semver tag for rollback safety." : "Image reference is immutable enough for the simulation.",
    },
    {
      rule: "Memory request / limit",
      severity: manifest.memoryLimitMi < 512 ? "Medium" : "Pass",
      message: manifest.memoryLimitMi < 512 ? "Limit is below the platform baseline of 512Mi." : "Memory limit meets the platform baseline.",
    },
    {
      rule: "Minimum replicas",
      severity: manifest.replicas < 2 ? "High" : "Pass",
      message: manifest.replicas < 2 ? "At least two replicas are required for service continuity." : "Meets availability policy.",
    },
  ];
}

export type ActionState = "proposed" | "approved" | "rejected";

export function transitionAction(current: ActionState, decision: "approve" | "reject"): ActionState {
  if (current !== "proposed") throw new Error("Only proposed actions may be decided.");
  return decision === "approve" ? "approved" : "rejected";
}

export function auditEventForDecision(action: string, decision: "approve" | "reject", actor: string, rationale = "") {
  return { type: decision === "approve" ? "human_approval" : "human_rejection", action, actor, rationale, logged: true } as const;
}

export function buildAuditTrail(input: { suggestion: string; decision?: { action: string; approved: boolean; actor: string; rationale?: string }; systemAction?: string }) {
  const events = [{ type: "ai_suggestion", action: input.suggestion, logged: true }];
  if (input.decision) events.push(auditEventForDecision(input.decision.action, input.decision.approved ? "approve" : "reject", input.decision.actor, input.decision.rationale));
  if (input.systemAction) events.push({ type: "system_action", action: input.systemAction, logged: true });
  return events;
}
