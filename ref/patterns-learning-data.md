# Learning and data patterns

Governed by [ADR-0003](ADRs/ADR-0003-core-learning-services-and-demo-state.md).

## Current learning slice

`src/core/learning/courses.ts` owns three explicit sample definitions. Public course DTOs contain lesson text and choices, while answer keys and feedback stay in core. `createLearningService` lists courses, starts goal-labelled sessions, and evaluates one fixture question per session. IDs and timestamps come from injected functions.

The service rejects unavailable courses/sessions and answers outside the selected course. Incorrect choices can be retried. A correct answer completes the question; later submissions for that completed session do not alter its recorded answer. This is completion, not mastery or retention assessment.

## Storage ownership

`SessionRepository` is the state port. `src/main/adapters/memory-session-repository.ts` uses a Map and returns/stores copies so external mutation cannot change owned state. Progress survives renderer reloads and window reopen while the same main process lives, but disappears when the app quits. UI copy communicates that limit. Core state is authoritative; React keeps view snapshots and unsent drafts.

No database, cloud sync, account, credentials, or file import is present. Before persistence, define schema versions, migrations, failure recovery, backup/export, and privacy. Implement the new repository adapter without introducing storage imports in core or renderer. Storage technology is an open decision.

## Future tutoring

User goals currently label a selected fixture session; they do not generate a curriculum. Keep sample responses labelled. A future AI provider belongs behind a core port and Node adapter, with credentials outside renderer, explicit content consent, timeouts/cancellation, and evidence for learning claims. Keep imported/model text untrusted. Review [security patterns](patterns-ipc-security.md) before extending the data surface.
