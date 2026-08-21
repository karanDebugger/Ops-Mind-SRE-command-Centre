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
