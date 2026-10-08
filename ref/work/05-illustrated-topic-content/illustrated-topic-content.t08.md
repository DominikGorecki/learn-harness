# Ticket: illustrated-topic-content.T08 — Regenerate individual images with editable prompts and safe acceptance
Status: Locally accepted — integrated Escape repair and cumulative/package gates passed; live qualification remains T09-owned

## Source

- Spec: [Illustrated topic content](illustrated-topic-content.spec.md)
- Scope: explicit whole-spec implementation request; [product context](../../../docs/overview.md).
- Guidance: [AGENTS.md](../../../AGENTS.md), [README](../../../README.md), [pattern index](../../patterns.md), [ADR index](../../ADRs/INDEX.md).

## Goal

Regenerate individual images with editable prompts and safe acceptance, delivering the scoped observable behaviors below.

## Scope

In scope: src/core/topic-content candidate behavior; main named candidate IPC and media handling; src/preload methods; renderer image regenerate dialog/controls; focused unit/desktop flow.

Out of scope: unrelated work, TTS, Socratic runtime, OpenRouter text inference, automatic web research, arbitrary models/endpoints and cloud/background jobs. Preserve existing source content and process security.

## Dependencies

- Depends on: [T02](illustrated-topic-content.t02.md), [T04](illustrated-topic-content.t04.md), [T05](illustrated-topic-content.t05.md), [T07](illustrated-topic-content.t07.md).
- Unblocks: T09.
- External prerequisites: no live credentials needed for deterministic implementation; required live/native qualification remains separately recorded and never assumed.

## Implementation plan

- Expose muted accessible regenerate overlays and prompt/model/estimate modal, invoking fixed-image profile through shared admission.
- Keep original and candidate distinct; allow prompt plus necessary caption/alt adjustment and explicit Use this image/Keep original.
- Publish accepted replacement atomically with baseline/retained-asset checks; implement cancellation/discard/restart/save retry with cost history independent of acceptance.

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

- [x] Each image can generate one explicit candidate and only acceptance changes its current asset/prompt/provenance.
- [x] Keep original/cancel/failure/close/conflict preserve original; retry save issues no paid request and ledger retains completed candidate costs.
- [x] Keyboard/touch/focus, Light/Dark and zoom comparison/recovery are covered by real bridge/storage assertions and reviewed flows. Integrated Escape repair passes on frozen source; native touch/accessibility qualification remains separate.

## Manual verification

Review the delivered behavior against acceptance using actual output and affected registered screenshots. UI review includes both themes, keyboard, reduced motion, minimum layout and 200% zoom. Fixtures prove local process/storage behavior; live account access, pedagogical quality and native OS/screen-reader qualification require separate actual evidence. Do not perform paid calls without explicit authorization.

## Completion evidence

Accepted by the primary against T02/T04/T05/T07 commits and original `master` HEAD `ad32e087bfd3e4352d5d57d980ec95660921e75f`. Worker: full-stack/image replacement, `gpt-6.1-sol`, high reasoning; focused read-only backend/renderer reviews used medium reasoning. Primary inspected the actual contracts, service/storage/runtime/bridge/UI/tests and final captures, and owns maintained guidance, records and Git.

- Final `npm.cmd run check` (41582): exit 0; 42 files, 486 passed / 3 skipped, lint, flow audit, both type scopes and build. Twelve replacement units include immutable attempt/candidate correlation, topic-scoped enumeration/removal, stale/read-only authority, exact save recovery, committed-publication restart, bounded page reservation and archive-before-discard crash recovery.
- Guarded visual/recovery `npm.cmd run test:desktop -- tests/desktop/image-regeneration.spec.ts --grep "candidate keeps|replacement faults"` (16845): exit 0, two passed in 1.7 minutes. The preceding three-flow command (42359) exited 1 because recovery tested BUSY before actual held metadata ownership; its replacement barrier test passed in 38.1 seconds. The focused passing recovery now waits for the actual held request and proves both global/provider exclusion. Earlier assertion/capture failures are recorded in [validation](validation.md); they are not passing-command claims.
- Affected `npm.cmd run test:desktop -- tests/desktop/topic-content.spec.ts tests/desktop/chapter-reader.spec.ts tests/desktop/topic-reading.spec.ts tests/desktop/reading.spec.ts tests/desktop/navigation.spec.ts` (98169): exit 0, all ten passed in 3.7 minutes.
- Actual loopback calls and saved-byte assertions establish one image/no text request, original/candidate separation, account-free restart/Use, unchanged prose/sources/project/other images, retained originals/version pointers, independent exact candidate costs, hostile capability denial, cancellation, missing-original repair and zero-HTTP candidate/publication Retry save. Write/exit barriers hold admission until both durable billing and actual utility cleanup finish.
- Primary reviewed six final dialog and one recovery capture plus changed reader/commands/navigation references. Final dialog pixel guards inspect each visible image inside the modal, selected-theme and enabled-action pixels, retaining the exact unmodified native frame. Independent PNG decoding confirms opaque RGB, manifest hashes and chart pixels in both themes/200% zoom. Fixtures establish local serving/layout and recovery, not live image quality or billing.

All validation processes and owned fixture resources settled/cleaned. No paid live request/private credential access. T09's fresh cumulative code/desktop/package gates and required live/editorial/native qualifications remain open; no bundle closure is claimed.

## Notes

### Integrated focus follow-up

The primary's full desktop command (41335) reopened focus acceptance. Actual diagnostics showed BODY retaining focus with the native window/document focused and the exact return trigger still connected, enabled and visible. The native image modal now closes synchronously before parent trigger restoration; owned cancellation and read-only candidate retention remain intact. Original focus/file assertions are unchanged, with bounded observation-only diagnostics added.

High-reasoning `gpt-6.1-sol` repair worker; primary reviewed actual source, diagnostics and native captures. Frozen `npm.cmd run check` (77810): exit 0, 492 passed/3 skipped across 42 files. The combined affected desktop command (72959) covered image regeneration, topic reading, navigation, chapter reader and topic-content integration: exit 0, ten passed in 2.6 minutes. Exact Escape trigger/document/native-focus evidence passed. Image test SHA256: `85e4e612416ecd7ccfaae674c64d0f65d3fa89e4fd3201de622f356a9de08b98`. Fresh whole-suite and consecutive package checks remain T09-owned; no live paid request occurred.

- Requirements covered: R11, R13, R18, R19, R20, R26, R27, R28, R31, R34.
- Assumptions: the source spec's bounded defaults apply; no additional product blocker.
