# Pentair OpsMind

Pentair OpsMind is a polished SRE operations console for simulated Pentair infrastructure. It combines synthetic telemetry, incident triage, grounded AI diagnosis, approval-gated remediation, deployment policy checks, audit governance, runbook context, postmortem drafting, and AI quality signals in one operator experience.

## Product boundary

This project is intentionally isolated from Pentair production systems. It does not connect to real pumps, sensors, treatment systems, logs, clusters, deployment registries, or corporate data. All infrastructure names, metrics, alerts, manifests, and incident evidence are synthetic and exist only to demonstrate an operational workflow safely.

The most important safety rule is enforced at the interaction boundary: AI can propose an action, but it cannot execute an action. The operator must explicitly approve or reject every proposal. Decisions are represented as audit events with actor, decision, action, and timestamp fields. The server-side approval helper also rejects a second decision on an already-decided action.

## Architecture

The project uses the managed full-stack scaffold with React, TypeScript, Tailwind, Express, tRPC, Vitest, and Manus OAuth. The dashboard currently uses a synthetic in-memory simulation for the command-center experience. The server exposes typed procedures for incident analysis and postmortem drafting; those procedures call the server-side LLM helper and fall back to an evidence-backed local response if the model is unavailable.

The visual system uses a deep slate control-room canvas, restrained surface layers, Manrope for product typography, DM Mono for operational values, and a single aqua signature accent. Severity colors are reserved for operational meaning: red for critical, amber for high-risk, aqua for informational/medium, and green for healthy or approved states.

## Demo script

Start at the infrastructure pulse and explain that the three systems represent telemetry ingress, pump orchestration, and the water-treatment API. Select `INC-2481`, run the AI diagnosis, and point to the evidence citations: connection-pool saturation, rollout progression, and retry-budget burn. Open the proposed-action cards and show that the system cannot stage a remediation until a human decision is recorded. Then open Deployment Safety to explain immutable image tags, resource limits, and replica policy. Finally, generate a postmortem draft and review the audit and quality tabs.

## Extension points

The next production-hardening step would be to move synthetic entities into dedicated database tables for infrastructure components, metric samples, incidents, logs, deployments, runbooks, action proposals, audit events, and evaluation runs. A real ingestion adapter could then be added behind an explicit environment boundary, with tenant-scoped authorization and secret management. The AI layer should retain structured JSON outputs, source identifiers, model/version metadata, latency, and token-cost estimates for offline evaluation.

## Verification

The repository includes Vitest coverage for deployment policy validation, approval transitions, audit-event creation, and the scaffold authentication procedure. Run `pnpm check` for TypeScript validation and `pnpm test` for the automated suite.

> Portfolio disclaimer: this is a simulated SRE product for demonstration and interview discussion, not a production Pentair control system.


## AquaGuard Release Plane

AquaGuard is the advanced release-management surface for this project. It simulates a Pentair-style internal platform that governs a `sensor-gateway` release from build through progressive delivery. The console presents a release dossier, synthetic SBOM/provenance evidence, policy findings, a 5% → 25% → 50% → 100% rollout ladder, correlated metrics/logs/traces, SLO gates, AI release reasoning, a hard human approval gate, and an audit timeline.

The key safety property is deliberate: the simulator never connects to a real Kubernetes cluster and never mutates a production system. Promotion freezes when synthetic SLO thresholds breach. Rollback requires an operator rationale and explicit approval. The pure release-plane controls in `server/releasePlane.ts` cover provenance verification, policy evaluation, SLO gating, rollout transitions, and destructive-action authorization; `server/releasePlane.test.ts` protects those contracts.

### Recommended demo sequence

Open the release plane and present release `1842` for `sensor-gateway v2.18.4`. Start with the dossier: show the pinned image digest, provenance attestation, SBOM result, and the memory-baseline warning. Walk through the pipeline until the 25% canary. Explain the correlated telemetry breach and the frozen promotion state. Open the Evidence Dossier, enter a meaningful operator rationale, and approve the simulated rollback. Finish on the audit stream and release comparison view.

### Interview positioning

Describe AquaGuard as a platform-engineering product rather than a dashboard: “It provides a paved release path with security evidence, policy gates, observable progressive delivery, SLO-based decisions, and human-controlled remediation. The design treats automation as a proposal engine until the operator approves a destructive action.”


### Operator runbook

When a canary gate freezes, first confirm the release ID, environment boundary, image digest, provenance result, and policy findings. Next compare candidate telemetry with the last healthy version: p95 latency, error rate, retry-budget burn, and availability. Run the release advisor to produce a structured evidence-backed recommendation. If rollback is safer, enter a rationale that names the breached SLO and approve the simulated rollback. If rejecting rollback, explain the compensating control and record the decision. Never represent a simulator event as a production action.

### Release-quality metrics

AquaGuard exposes a release-quality vocabulary that can be wired to real telemetry later: promotion-block accuracy measures whether unsafe candidates were stopped; gate latency measures breach-to-freeze time; provenance coverage measures releases with verifiable build evidence; rollback readiness measures whether a last-known-good artifact and runbook are available; and policy drift measures how often service manifests diverge from the approved baseline. These metrics are intentionally separated from raw uptime so the platform can measure the quality of the delivery control loop itself.
