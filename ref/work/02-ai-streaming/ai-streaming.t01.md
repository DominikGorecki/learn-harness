# Ticket: ai-streaming.T01 - Shared AI operation ownership and activity contracts
Status: Done

## Source

- Spec: [Shared Pi streaming](ai-streaming.spec.md), R02, R09, R11 and the interfaces/ownership sections.
- Product scope: [PRD 01](../../prds/01-project-setup-and-outline.md); this bundle adds streaming, not teaching features.
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md).
- Patterns: [architecture](../../patterns-architecture.md), [IPC/security](../../patterns-ipc-security.md), [renderer](../../patterns-renderer.md), [documentation](../../patterns-documentation.md).
- ADRs: [0002](../../ADRs/ADR-0002-sandboxed-capability-ipc.md), [0010](../../ADRs/ADR-0010-bounded-pi-outline-generation.md), [0012](../../ADRs/ADR-0012-generation-recovery-and-navigation.md), [0015](../../ADRs/ADR-0015-explicit-model-access-verification.md), [0016](../../ADRs/ADR-0016-requested-extra-model-choices.md), [0019](../../ADRs/ADR-0019-topic-edits-and-project-file-access.md).

## Goal

Establish one application-wide, main-composed ownership mechanism and a bounded public activity contract that every producer can use without depending on React or privileged core imports.

## Scope

### In scope

Pure core coordinator/ports, shared preview-only DTOs and runtime validators, named authorized activity IPC/preload methods, main composition, deterministic lifecycle tests and the foundational durable decision.

### Out of scope

Provider transport, producer migration, panel rendering, persisted transcripts, generic inference capabilities and changes to existing outline acceptance/storage.

## Dependencies

- Depends on: none.
- Unblocks: [ai-streaming.T02](ai-streaming.t02.md), [ai-streaming.T03](ai-streaming.t03.md).
- External prerequisites: none. Existing flow-reference and automatic-commit work is unrelated and must be preserved.

## Implementation plan

1. Recheck the ADR index. The spec's candidate 0021 is now occupied by the automatic-commit decision; **0022 is the current streaming candidate**, subject to another check at implementation. Author the streaming decision before introducing durable deviations. Explicitly amend only ADR-0010's elapsed deadlines and ADR-0015/0016's direct-main/30-second diagnostic transport. Preserve endpoint, secrecy, verification and publication rules. Update both indexes and constrained focused patterns together; distinguish adopted integration rules from producers/UI still awaiting migration. Create the canonical `ref/patterns-ai.md` route with that status distinction; T07 completes runtime guidance.
2. Add a platform-independent coordinator under `src/core` with injected monotonic time/IDs and a private lease handle for authorized domain owners. Admission claims synchronously before authorization/preparation yields; competing starts return BUSY without executing their task. Support same-target diagnostic reuse without creating a second operation. No queue.
3. Define five operation kinds and discriminated `none`, `text`, `outline`, `topic`, `model-test-evidence` previews in shared. Keep partial fields separate from `LearningOutline`/`SavedOutline`. Bind run/project/stable-topic identity, turn/candidate revision, elapsed/last-byte age, activity, cancellation availability and safe outcome. Large accepted/unsaved results remain domain-owned.
4. Enforce immutable snapshots, monotonic sequence/revision, stale/duplicate/cancelled-update rejection, 64 KiB UTF-8 preview, 40 activity entries with 256-character labels, 96 KiB serialized progress frames, cumulative omitted count and abbreviation flag. Coalesce latest previews every 100 ms, at most 10 Hz/250 ms reference latency; starts, phases and terminal events bypass batching. Slow/throwing subscribers cannot block network consumers or change result acceptance. Clear pending updates on settlement.
5. Define cancellation as an awaited owner action. Keep the lease during validation/publication, reject cancellation after saving begins, and release exactly once on domain settlement, including failure, unsaved and needs-details. A retained terminal display does not own admission. Handle teardown without resurrecting runs.
6. Add named `getAiActivity`, `onAiActivityChanged`/unsubscribe and strictly parsed `cancelAiOperation({ operationId })` capabilities. Main validates live owning sender/frame/origin/entry and binds launch metadata; preload strips Electron event objects. No caller-controlled task, model, URL, path, prompt or timeout. Existing cancellation wrappers are migrated by T03/T04.

## Patterns to apply

- Core owns policy/ports, shared owns serializable schemas, main owns composition/authorization, preload owns named wrappers. Renderer consumes shared types only; UI implementation waits for T05.
- Preserve sandbox/context isolation and profile-versus-`.edu` ownership. Activity is ephemeral and cannot be persisted as educational output.
- Owner-aware credential renewal is part of the lease contract: later producers must not deny their own authorization after admission. Feature busy flags may present state but cannot become competing admission authorities.

## Tests and verification

- New `tests/unit/ai-coordinator.test.ts` and `ai-activity.test.ts`: simultaneous starts before delayed authorization, same-target reuse, opposite-kind BUSY, all settlement paths, cancellation/publication races, exactly-once cleanup, revision ordering, immutable copies, byte/frame/history limits and burst/slow-subscriber behavior using injected clocks and domain fakes.
- Extend `tests/unit/capability.test.ts`: malformed/extra fields, no-input action rejection, stale IDs and unauthorized sender/frame/origin. Add real Electron bridge checks to an existing relevant desktop journey: initial empty snapshot, named subscription/unsubscribe and rejected forged/stale cancellation. Register any new journey under ADR-0020 rather than exposing test-only public APIs.
- Gates: focused unit/bridge checks, `npm run check`, `npm run test:desktop`; preserve configured flow reporter. Review ADR/pattern links and `git diff --check`.
- No-new-test exception: not applicable. Record actual commands/revision/environment in future bundle `validation.md`; record foundational evidence in `acceptance.md` without claiming producers/UI complete.

## Acceptance criteria

- [x] One lease owns admission; races and duplicates cannot execute competing tasks.
- [x] Correlated, bounded preview snapshots remain distinct from accepted output; lifecycle transitions cannot be lost behind coalescing.
- [x] Named capabilities pass real bridge and rejection tests with sandboxing intact.
- [x] Cancellation/settlement release only the correct owner and never revive late updates.
- [x] The new ADR/index/pattern changes identify scoped supersession and staged implementation honestly.

## Manual verification

Inspect the development bridge from an isolated Electron profile and confirm empty/settled activity queries and safe rejected cancellation. Review DTOs for privileged fields and coordinator imports for platform leakage. No new learner-facing panel is expected yet. Fixture/race evidence is not live-provider proof.

## Completion evidence

Accepted foundation on `master`, based on `db0b22d` plus this ticket's reviewed changes. Prerequisites: none. Worker `t01_coordinator` used GPT-6.1 Sol / high; independent `t01_review` used the same model/effort. The primary inspected the core/shared/IPC/preload diff, tests, ADR-0022, focused guidance and actual account/recovery PNGs before acceptance.

Delivered synchronous global admission and diagnostic reuse, immutable correlated partial DTOs, actual UTF-8/wire/history bounds, 100 ms preview coalescing, named authorized activity capabilities, awaited cancellation and domain settlement. Reviewed fixes permanently reject aborted progress and memoize cancellation before synchronous abort dispatch; regression tests cover cleanup failure and reentrant cancellation. ADR-0022 and both discovery indexes adopt the common route with transport/producer/UI migration explicitly pending.

- Focused `npm test -- tests/unit/ai-coordinator.test.ts tests/unit/ai-activity.test.ts tests/unit/capability.test.ts`: 29 passed, exit 0.
- `npm run check`: exit 0; lint, 219 passed / 3 skipped in 19 unit files, flow integrity, both TypeScript scopes and production build.
- `npm run test:desktop`: exit 0; 13 passed / 1 packaged-worker skipped, native Windows signed local fixtures, configured flow reporter intact. Real bridge checks cover empty query, event stripping/unsubscribe and forged/stale/malformed cancellation rejection.
- `npm run test:flows`, changed-guidance relative-link audit and `git diff --check`: passed. Reviewed account and three changed recovery captures; other refreshed images retained their prior bytes. The usage-recovery image's feedback lies above its viewport, a checkpoint limitation to address in T05/T06.

Validation used the normal host execution context without changing application sandboxing. No remaining owned Electron/Playwright processes were found. No live inference or packaged qualification ran here. Producers, transport, panel and full R01–R23 acceptance remain open in T02–T07; this ticket does not close the bundle. See [validation](validation.md) and [acceptance](acceptance.md).

## Notes

- Requirements covered: primary R02, R09, R11; supporting R01, R16, R18, R22.
- Blockers: none. New file/module names are implementation choices; specified semantics and bounds are not optional. Do not ship the bundle with unmigrated producers.
