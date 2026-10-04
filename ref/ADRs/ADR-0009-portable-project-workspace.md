# ADR-0009: Portable project state and a real project workspace

Status: Accepted — 2026-10-04

## Context

PRD 01 replaces the demonstration course/session flow with learner-owned folders, per-project model choices, and educational outlines. Opening a folder must not rewrite its contents or trigger inference. Saved content remains readable independently of account access and application-local recent locations.

## Decision

Retire the fixture course runtime and its in-memory repository. Preserve ADR-0003 as historical evidence; its platform-independent core boundary remains valid. `WorkspaceService` owns asynchronous use cases behind storage and registry ports.

Store portable metadata in one versioned `.edu/project.json`: identity, revision, model preference, brief, and optional validated outline with source coverage. Opening only reads; explicit model/brief/result saves create metadata. The profile stores recent locations separately. Credentials remain outside projects under ADR-0008.

Use same-directory atomic replacement, optimistic content-digest checks, and bounded validated reads. Reject symlinked metadata and changed roots. Preserve corrupt, unsupported, externally changed, or unavailable content and expose recovery instead of resetting it. Relinking verifies known portable identity.

The renderer uses named project capabilities, backend snapshots, and project-keyed drafts. Native selection belongs in main. The neutral workspace implements ADR-0007 with a dashboard, compact navigation, large goal composer, model select, and readable outline disclosures. Narrow windows use modal navigation. Real account/storage results determine availability and save indicators.

## Consequences

Projects can move and retain educational state; recent locations are machine-local. Read-only and missing folders remain visible. A completed project save and a failed recent-list update have separate outcomes.

Atomic replacement and digest checks protect against ordinary interrupted writes and detected external changes; they do not establish distributed multi-writer locking. Generation and worker lifecycle are subsequent tickets. Fixture tests establish local protocol/desktop behavior, not live provider access or native Windows/macOS evidence.
