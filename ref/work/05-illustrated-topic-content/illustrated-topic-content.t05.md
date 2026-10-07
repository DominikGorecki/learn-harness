# Ticket: illustrated-topic-content.T05 — Generate checkpointed illustrated chapters through the shared AI lifecycle
Status: Open

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

- [ ] A deterministic multi-call chapter has all objectives and useful planned images, preserves outline/other files and reopens offline.
- [ ] Restart/cancel/budget pause/save failure/source conflicts preserve validated work and require explicit continuation; unresolved paid slots are never replayed silently.
- [ ] BUSY, key guards, current project/topic identity and all named bridge rejected inputs work through actual Electron.

## Manual verification

Review the delivered behavior against acceptance using actual output and affected registered screenshots. UI review includes both themes, keyboard, reduced motion, minimum layout and 200% zoom. Fixtures prove local process/storage behavior; live account access, pedagogical quality and native OS/screen-reader qualification require separate actual evidence. Do not perform paid calls without explicit authorization.

## Completion evidence

Pending coordinator acceptance. Worker role: domain/Electron integration; planned model: gpt-6.1-sol; reasoning: high. Primary owns statuses, staging, commits and bundle closure. No nested agents unless the primary assigns them.

## Notes

- Requirements covered: R01, R02, R03, R04, R05, R06, R07, R08, R09, R11, R12, R13, R14, R16, R27, R28, R31, R34, R35.
- Assumptions: the source spec's bounded defaults apply; no additional product blocker.
