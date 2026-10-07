# Ticket: illustrated-topic-content.T03 — Add protected OpenRouter settings and durable request accounting
Status: Done

## Source

- Spec: [Illustrated topic content](illustrated-topic-content.spec.md)
- Scope: explicit whole-spec implementation request; [product context](../../../docs/overview.md).
- Guidance: [AGENTS.md](../../../AGENTS.md), [README](../../../README.md), [pattern index](../../patterns.md), [ADR index](../../ADRs/INDEX.md).

## Goal

Add protected OpenRouter settings and durable request accounting, delivering the scoped observable behaviors below.

## Scope

In scope: src/main/openrouter/* or auth/provider-specific modules; src/core provider ports as needed; shared openrouter contracts refinement; focused tests/unit.

Out of scope: unrelated work, TTS, Socratic runtime, OpenRouter text inference, automatic web research, arbitrary models/endpoints and cloud/background jobs. Preserve existing source content and process security.

## Dependencies

- Depends on: [T01](illustrated-topic-content.t01.md).
- Unblocks: T04, T05, T06.
- External prerequisites: no live credentials needed for deterministic implementation; required live/native qualification remains separately recorded and never assumed.

## Implementation plan

- Implement independent protected ordinary-key persistence, validation-before-replacement, fixed model settings and 24-hour metadata/capability/pricing cache.
- Build an app-controlled audited gateway and durable intent/terminal/reconciliation ledger with exact USD arithmetic, indexes/cursors, safe rows, key epochs and unknown-cost preservation.
- Provide bounded metadata refresh, endpoint-compatible estimates and optional known-ID reconciliation; no management keys, environment fallback, raw payload retention or automatic paid retries.

## Patterns to apply

Read the focused patterns relevant to owned files through the index and their accepted ADRs. ADR-0026 (once accepted in T01) extends chapter/media/accounting authority only. Core owns learning behavior and ports; shared owns validated DTOs; main owns privileged storage/network/lifecycle and authorized IPC; preload exposes named methods; renderer uses React and typed bridge. Portable .edu state excludes profile credentials/locations/ledger. All inference uses shared admission, sanctioned utility/Pi transport, independent domain acceptance and awaited cleanup.

UI work must read design-system, UX, renderer, main-workspace and ADR-0007/0013/0025, plus relevant existing flow explanations and selected screenshots. Use semantic Light/Dark tokens, quiet central reading/actions, keyboard/focus recovery and no-history dialogs. No computer use for frontend validation.

## Tests and verification

- Add focused meaningful unit tests for this ticket's acceptance and its malformed/hostile input, failure, cancellation or recovery boundaries.
- Add isolated Electron Playwright coverage for bridge/process/user-flow changes, using fixtures with actual saved-byte and request-count assertions and the configured flow reporter.
- Run `npm run check`; run affected `npm run test:desktop -- <owned/affected specs>` for process/bridge/user-flow changes. The coordinator additionally runs the full fresh desktop gate after integration. Package/ASAR checks apply when worker/build ownership changes.
- No-new-test exception: none for functional implementation; documentation-only maintenance uses link review and `git diff --check`.
- Coordinator records actual evidence in validation.md and acceptance.md. Workers return commands, exit outcomes, exact files and cleanup status without editing shared ticket/completion ledgers.

## Acceptance criteria

- [x] Every adapter dispatch requires a durable safe intent; preflight failure prevents dispatch and orphaned/terminal failures remain unresolved. Paid transport activation remains T04/T05.
- [x] Known costs aggregate once at retained precision, missing costs remain unknown and history survives restart/key removal.
- [x] Three fixed choices and non-inference validation/refresh work with fixture endpoints while secrets never enter public DTOs/logs.

## Manual verification

Review the delivered behavior against acceptance using actual output and affected registered screenshots. UI review includes both themes, keyboard, reduced motion, minimum layout and 200% zoom. Fixtures prove local process/storage behavior; live account access, pedagogical quality and native OS/screen-reader qualification require separate actual evidence. Do not perform paid calls without explicit authorization.

## Completion evidence

Accepted main provider/accounting adapter. Worker: `/root/contracts`, `gpt-6.1-sol`, high reasoning. Dependency: T01 commit `9946770a127f192df170b217ef9f13695cb0d761`; implementation/review on `master` at `1cfbd02669ca54be5036876e0bd3d6df1b6cf3dc` after accepted T02. Coordinator inspected all eight modules, shared refinements and actual fixture/tests, with a read-only `gpt-6.1-sol` medium reviewer.

Delivered protected independent ordinary-key persistence/validation, epoch-bound metadata cache, fixed catalog/endpoint capability projection, cached quotes, audited bounded non-inference HTTP, exact decimal accounting, restart/orphan/corruption handling, paged safe history and private image intent/checkpoint/terminal hooks. Review fixes include safe retained pricing, 60 KiB intent admission reserving terminal/history capacity within the unchanged 64 KiB frame, consumed-budget slot reservations and configuration exclusion across durable writes. Unsafe ledger labels/variants are projected without changing learner state or monetary evidence.

- Final focused three OpenRouter unit files: 41 passed, including real loopback HTTP and near-limit retained billing/history fixtures.
- Final `npm.cmd run check`: exit 0; lint, 36 unit files (408 passed / 3 skipped), flow audit, both type scopes and all production bundles. Initial lint/type-only fixture issues were corrected before this final stable pass.
- No runtime IPC/worker/renderer activation in T03, so no new desktop gate applies to this adapter-only ticket. Actual Electron settings/inference qualification remains T04–T06 and final integration. Local fixtures are not live provider evidence.
- No paid requests or private live credentials used. Test servers/temporary roots disposed; final worker return confirms cleanup. Primary owns local commit and whole-bundle acceptance.

## Notes

- Requirements covered: R09, R10, R23, R24, R25, R26, R27, R28, R29, R30, R31, R33, R34.
- Assumptions: the source spec's bounded defaults apply; no additional product blocker.
