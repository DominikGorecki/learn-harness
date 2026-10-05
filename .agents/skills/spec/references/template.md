# Spec: <Spec Title>

Status: <Draft or Ready for implementation>
Date: <YYYY-MM-DD>
Source: <request, context brief, or PRD>
Goal: <observable learner or developer outcome>

Use `ref/work/NN-<slug>/<slug>.spec.md`. Links in the generated artifact resolve from its bundle, not from this template. Preserve existing bundle statuses and names. Consult `AGENTS.md`, `README.md`, patterns, accepted ADRs, product scope, and actual source/tests before completing it.

## Summary

- <what is being built and why>

## Problem / Context

- <current state, gap, affected users/systems>

## Goals

- <goal>

## Non-goals (Strict)

- <explicitly out of scope>

## Scope

### In scope

- <item>

### Out of scope

- <item>

## Requirements (Functional)

| ID | Testable requirement | Verification path |
| --- | --- | --- |
| R01 | <observable requirement> | <focused unit/desktop test, visual review, or external gate> |

## Requirements (Non-functional)

- Performance: <requirements or Not applicable>
- Reliability: <requirements or Not applicable>
- Security / Privacy: <requirements or Not applicable>
- Observability: <requirements or Not applicable>

## Proposed Solution

- <ownership across src/core, src/shared, src/main, src/preload, src/renderer; data flow, lifecycle, and cancellation; preserve privileged import and IPC boundaries>

## Interfaces / APIs / Contracts

- <commands, endpoints, schemas, events, UI contracts, or Not applicable>

## Data Model / Storage

- <portable .edu state versus profile-owned credentials/locations; schemas, save conflicts, source preservation, migration and recovery, or Not applicable>

## Auth / Authorization

- <auth/session/permissions impact, or Not applicable>

## UX / Workflows

- <learner flows, Light/Dark appearance, keyboard/focus, cancellation/retry and recovery; follow design system, UX, and renderer patterns, or Not applicable>

## Work Breakdown (Ticket Seed)

- <ordered implementation phases>

## Testing Plan

- Unit tests: <focused behavior/error coverage under tests/unit>
- Code gate: <npm run check for code changes>
- Desktop gate: <npm run test:desktop for process/bridge/startup or user-flow changes>
- Manual verification: <actual visual, keyboard, accessibility and recovery evidence>
- External gates: <live-account and native-platform evidence, or Not applicable>
- Evidence records: <validation.md for actual commands/outcomes; acceptance.md when a milestone audit is needed. Distinguish fixtures, desktop runs, packaging and live inference.>

## Acceptance Criteria

- [ ] <observable criterion and linked requirement IDs; evidence needed>

Do not equate a completed outline with mastery or a fixture response with live provider access.

## Rollout / Migration Plan

- <plan or Not applicable>

## Risks and Alternatives

- Risks: <items>
- Alternatives considered: <items>

## Patterns and Standards Alignment

- Patterns applied: <relevant ref/patterns-*.md and accepted ADRs>
- Deviations: <reason, closest compliant option, next numbered ADR candidate and required index/pattern updates>

## Open Questions

- Q1: <material question, owner, implementation consequence, or None>
- Readiness: <ready for tickets or blocked; assumptions and explicitly deferred scope>
