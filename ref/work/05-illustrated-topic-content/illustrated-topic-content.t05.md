# Ticket: illustrated-topic-content.T05 — Generate checkpointed illustrated chapters through the shared AI lifecycle
Status: Done — locally accepted; whole-bundle/live qualification pending

## Source

- Spec: [Illustrated topic content](illustrated-topic-content.spec.md)
- Scope: explicit whole-spec implementation request; [product context](../../../docs/overview.md).
- Guidance: [AGENTS.md](../../../AGENTS.md), [README](../../../README.md), [pattern index](../../patterns.md), [ADR index](../../ADRs/INDEX.md).

## Goal

Generate checkpointed illustrated chapters through the shared AI lifecycle, delivering the scoped observable behaviors below.

## Scope

In scope: src/core/topic-content/*; src/main/generation chapter engine and packaged educational image skill; src/main composition/IPC; src/preload; shared API/channel declarations; focused unit/desktop chapter fixtures.

Out of scope: unrelated work, TTS, Socratic runtime, OpenRouter text inference, automatic web research, arbitrary models/endpoints and cloud/background jobs. Preserve existing source content and process security.

## Dependencies

- Depends on: [T02](illustrated-topic-content.t02.md), [T03](illustrated-topic-content.t03.md), [T04](illustrated-topic-content.t04.md).
- Unblocks: T06, T07, T08.
- External prerequisites: no live credentials needed for deterministic implementation; required live/native qualification remains separately recorded and never assumed.

## Implementation plan

- Implement validated Pi plan/section/image stages, real source-read provenance, objective coverage, finite budgets and explicit checkpoint continuation without paid replay.
- Integrate shared coordinator admission, callbacks, cancellation, truthful preview, initial auto-publication, text-only/needs-images, replacement retention and storage-only retry.
- Expose named authorized chapter and provider capabilities/subscriptions through main/preload; wire media protocol authorization and all core/backend ownership guards.

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

- [x] A deterministic multi-call chapter has all objectives and useful planned images, preserves outline/other files and reopens offline.
- [x] Restart/cancel/budget pause/save failure/source conflicts preserve validated work and require explicit continuation; unresolved paid slots are never replayed silently.
- [x] BUSY, key guards, current project/topic identity and all named bridge rejected inputs work through actual Electron.

## Manual verification

Review the delivered behavior against acceptance using actual output and affected registered screenshots. UI review includes both themes, keyboard, reduced motion, minimum layout and 200% zoom. Fixtures prove local process/storage behavior; live account access, pedagogical quality and native OS/screen-reader qualification require separate actual evidence. Do not perform paid calls without explicit authorization.

## Completion evidence

Implemented core chapter orchestration, main-only repository/runtime/provider composition, named chapter/OpenRouter IPC and preload subscriptions, app-owned educational-image guidance and owning-window local raster serving. Chapter plans/sections/summaries are independently accepted and checkpointed; actual read evidence hashes raw source bytes. Finite activation counters, explicit Continue/uncertain image retry, text-only/needs-images, immutable replacement retention and exact storage-only Retry Save/Discard preserve accepted work and original project/source bytes.

Worker: domain/Electron integration, gpt-6.1-sol, high reasoning; scoped read-only review: gpt-6.1-sol, medium. Primary inspected actual new/modified source, tests, manifests and guidance. Prerequisites T02 1cfbd02669ca54be5036876e0bd3d6df1b6cf3dc, T03 c8eb934880f44bbfddd103f9c677a4e483533fb4 and T04 5a8af6b8ed27727c3e08cf7222fa544be42521d7 are accepted commits on master.

Concrete review fixes preserve source/manifest baselines, retire published runs, retain pending validated checkpoints/assets through failures/cancellation, reject unknown publication journals before inference, recover verified committed journals, archive discarded generated provenance, preserve copied published-call disposition and keep confirmed publication readable when ledger disposition fails. Storage-only admission holds global BUSY and shutdown without inference or new activity. Protocol serving validates both actual Chromium owning-frame request admission and runtime initiator/canonical current manifest identities under exact CSP.

Final stable-tree gates: `npm.cmd run check` passed (38 unit files, 453 passed / 3 skipped, lint/flow audit/type scopes/build); `npm.cmd run test:desktop -- tests/desktop/topic-content.spec.ts` passed four flows in 1.1 minutes; fresh `npm.cmd run package` then `npm.cmd run test:packaged` both passed, with one ASAR test in 4.0 seconds. Packaged outline, Sol/Luna diagnostics, chapter/guidance and image/Sharp profiles passed with actual PID absence. The four nonvisual chapter/media/recovery/barrier flow manifests and ASAR assertions were reviewed; they establish local process/storage evidence, not visual or live editorial qualification. Earlier fixture type/lint assertions and duplicate flow-reporter registration failures were corrected before these passing commands; no active sessions or owned fixture resources remain. No paid live/private credentials; Settings/reader/standalone replacement and mandatory live/editorial/native qualifications remain separate pending gates.

## Notes

After accepted runtime commit and T06 integration, primary found that empty/unknown or failed provider metadata caused the runtime to return no image session before reaching the existing stale-refresh policy. The accepted main-owned repair acquires provider ownership first, refreshes stale metadata once and pins prior compatible settings; incompatible changes and discovery failures dispatch no image request. Startup/reading/quotes and deliberate text-only paths remain HTTP-free. Cancellation holds configuration/global admission until bounded discovery drains, then performs no inference.

Follow-up worker: gpt-6.1-sol, high, against T06 HEAD `8d424f368fff3f687e4059dd9a920b0c6bc2526a`. Primary reviewed the actual helper, eight focused tests, fixture controls, Electron assertions and all five nonvisual manifests. Final stable `npm.cmd run check` passed: 40 unit files, 464 passed / 3 skipped, lint/flows/types/build. `npm.cmd run test:desktop -- tests/desktop/topic-content.spec.ts` passed five flows in 1.7 minutes, including eight isolated cache/key/cancel scenarios, exact metadata/image counts, accepted raster bytes, unchanged project bytes and existing lifecycle/media/recovery/barrier regressions. Initial sandboxed focused units hit Vite realpath EPERM before execution; approved retry passed. All sessions and owned resources cleaned up; no paid/live/private credentials. Packaging was not repeated because worker resources/native dependencies are unchanged; T09 still requires fresh cumulative packaging.

- Requirements covered: R01, R02, R03, R04, R05, R06, R07, R08, R09, R11, R12, R13, R14, R16, R27, R28, R31, R34, R35.
- Assumptions: the source spec's bounded defaults apply; no additional product blocker.
