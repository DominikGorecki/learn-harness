# Ticket: ai-streaming.T03 - Outline streaming projection and domain settlement
Status: Done

## Source

- Spec: [Shared Pi streaming](ai-streaming.spec.md), R07–R10, R16–R18 and projection/storage sections.
- Product scope: [PRD 01](../../prds/01-project-setup-and-outline.md); existing scoped topic/file extension remains authoritative.
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md).
- Patterns: [architecture](../../patterns-architecture.md), [IPC/security](../../patterns-ipc-security.md), [learning/data](../../patterns-learning-data.md), [development/testing](../../patterns-development-testing.md), [flows](../../patterns-flow.md).
- ADRs: [0010](../../ADRs/ADR-0010-bounded-pi-outline-generation.md), [0012](../../ADRs/ADR-0012-generation-recovery-and-navigation.md), [0017](../../ADRs/ADR-0017-outline-rewrites-with-saved-context.md), [0019](../../ADRs/ADR-0019-topic-edits-and-project-file-access.md), plus T01's streaming decision.

## Goal

Creation, whole-outline rewriting and topic rewriting publish readable provisional drafts through the shared lifecycle while preserving validated acceptance, topic isolation and recoverable saves.

## Scope

### In scope

Pi event projection, all three educational producer adapters, owner-aware main authorization, GenerationService lease/settlement integration, compatible named cancellation/save routes and essential domain/process tests.

### Out of scope

Model-test migration, panel composition, new file authority, partial saves, changed learner metadata formats or replacing publication transactions.

## Dependencies

- Depends on: [ai-streaming.T01](ai-streaming.t01.md), [ai-streaming.T02](ai-streaming.t02.md).
- Unblocks: [ai-streaming.T04](ai-streaming.t04.md), [ai-streaming.T05](ai-streaming.t05.md).
- External prerequisites: none.

## Implementation plan

1. Update main composition and GenerationService ports so each educational start claims the shared lease before asynchronous authorization/project preparation. Make account authorization owner-aware; remove educational `onBusy`/`inferenceBusy` as an independent admission authority without breaking the diagnostic guards awaiting T04. Keep main model membership, credentials and authoritative outline/topic/file scope resolution.
2. Subscribe to Pi before prompting. Project text when useful and structured `submit_outline` partial arguments through immutable display-only copies. Capture candidate identity from turn/tool-call/revision; repairs replace earlier candidates. Main binds operation/project/topic identity to the owned launch, never provider text. Before the requested stable topic ID appears, show preparation rather than another lesson or guessed index.
3. Use only safe available heading/overview/objective/module prose fields. Missing, malformed or truncated partial fields can be omitted; do not feed partial data into the accepted-outline parser or persistence. Preview caps/batching from T01 cannot truncate the full accepted result. No private thinking, read-tool file contents/baselines or raw write payloads reach public snapshots.
4. Map actual request/tool/validation activity. A read completes only on successful read; omit it if no read occurred. Failed tool arguments show checking/repair, not success. Finish or discard pending previews before terminal state so late frames cannot overwrite it. Throwing preview subscribers must not alter acceptance.
5. Retain completed-stream gating, independent outline/source validation and worker/core/main topic localization before publication. HTTP 200, complete-looking partial arguments or deltas are insufficient. Keep project-wide reads, owned-folder writes, topic-plan mirror, baselines and transaction journal under ADR-0019.
6. Retain the lease through validation and publication. Await real worker/network cancellation before releasing it; forbid cancellation once saving begins. Route existing named `cancelOutline` through the owner while retaining run/project checks. Release exactly once on saved, unsaved, needs-details, failed or cancelled outcomes; success follows backend-confirmed save.
7. Keep full validated unsaved output/staged edits in GenerationService, independent of the single global presentation. Re-present it when returning after another allowed operation. Storage retry makes zero provider requests; confirmed conflicts localize only the selected topic on latest valid outline while preserving unrelated content and file baselines. Failures retain drafts and previous saved bytes. Shutdown aborts inference without resumable activity persistence.

## Patterns to apply

Core owns acceptance/recovery and uses ports; main/worker own Pi and privileged project access; shared owns preview contracts. Existing named starts accept IDs/changes only. No renderer paths/saved JSON or generic tools. No persistence migration; partial drafts remain ephemeral and unsaveable. Existing UX recovery paths remain valid pending T05's presentation.

## Tests and verification

- Extend `tests/unit/pi-outline-engine.test.ts`, `generation-service.test.ts`, `topic-edit.test.ts` and project-storage tests; add a focused projection test module. Cases: structured-only output, missing/partial JSON, revisions/repair, unrelated-topic proposal, unknown topic ID, huge draft with untruncated valid final result, actual versus fictional reads, late/cancelled frames and slow subscriber isolation.
- Cover incomplete/failed/error-after-apparent-completion streams, cancellation in validation versus saving, unauthorized scope, unchanged files on failure, unsaved lease release, later-operation preservation, zero-inference storage retry, confirmed topic conflict and external file baseline refusal.
- Extend `tests/desktop/outline.spec.ts`, `outline-edit.spec.ts`, `topic-edit.spec.ts`, `recovery.spec.ts` as needed for real activity IPC, cancellation, saved bytes and storage recovery. Account diagnostics cannot yet claim migration; T04 closes that gap.
- Gates: focused unit/journeys, `npm run check`, `npm run test:desktop`. Maintain any changed flow catalog/narratives and review passing captures; do not replace references from failed runs. No-new-test exception not applicable. Record future bundle evidence.

## Acceptance criteria

- [x] All three educational starts publish bounded text/structured previews tied to their owned scope.
- [x] Repairs supersede provisional candidates; only a completed, validated result can publish files/outline.
- [x] Cancel waits for settlement, saving guards are retained, and terminal domain outcomes release the lease correctly.
- [x] Unsaved output survives global presentation replacement; save retry consumes no AI allowance.
- [x] Adversarial topic proposals and failed streams cannot change unrelated outline fields/folders or previous files.

## Manual verification

Exercise creation and both rewrite kinds against isolated structured-only/repair fixtures; inspect actual activity and byte-preserving cancellation/save failure. Reopen an unsaved project after another settled operation and retry storage. UI remains transitional until T05; fixture outlines are not evidence of live curriculum quality.

## Completion evidence

Accepted on `master` after T01 `53db6b2` and T02 `f20752c`. Worker `t01_coordinator`, GPT-6.1 Sol / high; independent read-only reviewer `t01_review`, same model/effort. Primary reviewed the actual source/tests and final diff; worker edits were frozen before acceptance records and commit.

All three educational starts now claim shared ownership before asynchronous preparation. Safe Pi projections copy tolerant text/structured fields, replace candidates, bind stable topic scope and report abbreviation without truncating accepted results. Main merges ordered progress and received-byte ages; failed reads and terminal validation/save histories are truthful. Exact cleanup promises, saving guards, stopped admission and drained retries preserve domain/publication ownership. Cancellation commits an already-renewed credential before preventing inference launch; shutdown defers account invalidation until owned cleanup. Unsaved results and staged topic edits/baselines survive a separate diagnostic lease and retry with no inference.

Final `npm run check` passed: 269 tests / 3 skips across 22 files, lint, flow consistency, both type scopes and production build. Corrected full `npm run test:desktop` passed: 13 tests / one expected packaged skip. Primary independently ran `npm run test:flows` and `git diff --check`, both exit 0, and opened the sole changed PNG (reading/long-outline-zoom). Worker reviewed twelve relevant captures; no streaming panel exists yet. Initial post-click cancellation assertions were corrected to poll actual settlement, and stale failed-flow metadata was refreshed by the passing rerun. Exact focused commands and failure chronology are in [validation](validation.md).

Diagnostic migration, approved panel, real timing/burst/packaged acceptance and final documentation remain T04–T07. No live-provider, new packaged-artifact or other-platform qualification is claimed by T03.

## Notes

- Requirements covered: primary R07, R08, R10, R16, R17, R18; supporting R01, R02, R06, R09, R11, R20.
- Blockers: none. Do not release a mixed producer/admission implementation before T04/T05 and integrated acceptance.
