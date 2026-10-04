# Learning and data patterns

Governed by [ADR-0003](ADRs/ADR-0003-core-learning-services-and-demo-state.md) and [ADR-0008](ADRs/ADR-0008-chatgpt-plan-connection-and-pi-foundation.md).

## Current learning slice

`src/core/learning/courses.ts` owns three explicit sample definitions. Public course DTOs contain lesson text and choices, while answer keys and feedback stay in core. `createLearningService` lists courses, starts goal-labelled sessions, and evaluates one fixture question per session. IDs and timestamps come from injected functions.

The service rejects unavailable courses/sessions and answers outside the selected course. Incorrect choices can be retried. A correct answer completes the question; later submissions for that completed session do not alter its recorded answer. This is completion, not mastery or retention assessment.

## Storage ownership

`SessionRepository` is the state port. `src/main/adapters/memory-session-repository.ts` uses a Map and returns/stores copies so external mutation cannot change owned state. Progress survives renderer reloads and window reopen while the same main process lives, but disappears when the app quits. UI copy communicates that limit. Core state is authoritative; React keeps view snapshots and unsent drafts.

No database, cloud sync, or project-file import is present yet. Account credentials are versioned and protected in the application profile, with an explicit memory-only fallback when protected OS storage is unavailable. They are never project content. The non-secret installation host ID persists separately. Project persistence remains pending; define schema versions, failure recovery, backup/export, and privacy before implementing it.

## Account and models

The ChatGPT connection supports browser sign-in, verified identity, separate plan permission, renewal, account-specific model discovery, and local sign-out with remote revocation attempted. Public account state includes safe profile information and model choices, never tokens. A failed model query must not appear as a verified empty catalogue. Preserve a previous usable connection if replacement sign-in fails or is cancelled. The application never falls back to ambient API keys.

## Future tutoring

User goals currently label a selected fixture session; they do not generate a curriculum. Keep sample responses labelled. A future AI provider belongs behind a core port and Node adapter, with credentials outside renderer, explicit content consent, timeouts/cancellation, and evidence for learning claims. Keep imported/model text untrusted. Review [security patterns](patterns-ipc-security.md) before extending the data surface.
