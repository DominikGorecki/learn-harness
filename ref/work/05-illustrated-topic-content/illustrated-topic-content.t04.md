# Ticket: illustrated-topic-content.T04 — Implement sanctioned Pi-compatible OpenRouter image worker
Status: Open

## Source

- Spec: [Illustrated topic content](illustrated-topic-content.spec.md)
- Scope: explicit whole-spec implementation request; [product context](../../../docs/overview.md).
- Guidance: [AGENTS.md](../../../AGENTS.md), [README](../../../README.md), [pattern index](../../patterns.md), [ADR index](../../ADRs/INDEX.md).

## Goal

Implement sanctioned Pi-compatible OpenRouter image worker, delivering the scoped observable behaviors below.

## Scope

In scope: src/main/generation image adapter/profiles, worker-entry/client/protocol/lifecycle as needed; build/packaged skill or worker resources; focused unit/desktop worker fixtures.

Out of scope: unrelated work, TTS, Socratic runtime, OpenRouter text inference, automatic web research, arbitrary models/endpoints and cloud/background jobs. Preserve existing source content and process security.

## Dependencies

- Depends on: [T01](illustrated-topic-content.t01.md), [T03](illustrated-topic-content.t03.md).
- Unblocks: T05, T08.
- External prerequisites: no live credentials needed for deterministic implementation; required live/native qualification remains separately recorded and never assumed.

## Implementation plan

- Register app-owned Pi image implementation using dedicated OpenRouter Image API and allowlisted capability-checked options.
- Implement correlated worker-to-main intent acknowledgement, bounded private raster transfer/decode, explicit credentials, abort handling, zero retries and safe cost/protocol evidence.
- Add fixed-image profile and chapter-media integration hooks with first-response/byte-idle liveness, independent worker health, actual-exit cleanup and public metadata-only previews.

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

- [ ] Image transport cannot dispatch without main intent acknowledgement and cannot expose bytes/credentials through public activity.
- [ ] Cancellation, late results, malformed/oversized media and provider errors settle safely and release only after actual worker exit.
- [ ] Model/settings route exactly as configured; buffered waits and receiving behave truthfully beyond former elapsed deadlines.

## Manual verification

Review the delivered behavior against acceptance using actual output and affected registered screenshots. UI review includes both themes, keyboard, reduced motion, minimum layout and 200% zoom. Fixtures prove local process/storage behavior; live account access, pedagogical quality and native OS/screen-reader qualification require separate actual evidence. Do not perform paid calls without explicit authorization.

## Completion evidence

Pending coordinator acceptance. Worker role: utility/transport; planned model: gpt-6.1-sol; reasoning: high. Primary owns statuses, staging, commits and bundle closure. No nested agents unless the primary assigns them.

## Notes

- Requirements covered: R09, R10, R11, R12, R13, R27, R28, R30, R31, R32, R34.
- Assumptions: the source spec's bounded defaults apply; no additional product blocker.
