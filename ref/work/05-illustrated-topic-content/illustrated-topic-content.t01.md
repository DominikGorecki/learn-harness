# Ticket: illustrated-topic-content.T01 — Define chapter and provider contracts and durable decisions
Status: Done — contract foundation accepted; runtime delivered by dependent tickets

## Source

- Spec: [Illustrated topic content](illustrated-topic-content.spec.md)
- Scope: explicit whole-spec implementation request; [product context](../../../docs/overview.md).
- Guidance: [AGENTS.md](../../../AGENTS.md), [README](../../../README.md), [pattern index](../../patterns.md), [ADR index](../../ADRs/INDEX.md).

## Goal

Define chapter and provider contracts and durable decisions, delivering the scoped observable behaviors below.

## Scope

In scope: src/shared/topic-content.ts, src/shared/openrouter.ts, src/shared/ai/activity.ts and its exhaustive consumers/parsers as necessary; focused tests/unit; ADR-0026, both indexes and constrained patterns.

Out of scope: unrelated work, TTS, Socratic runtime, OpenRouter text inference, automatic web research, arbitrary models/endpoints and cloud/background jobs. Preserve existing source content and process security.

## Dependencies

- Depends on: none.
- Unblocks: T02, T03, T04.
- External prerequisites: no live credentials needed for deterministic implementation; required live/native qualification remains separately recorded and never assumed.

## Implementation plan

- Define strict serializable chapter plans, manifests, checkpoints, candidates, provider status/pricing and safe call-ledger schemas with named bounded policy constants.
- Define narrow capability request parsers and core ports; retain current bridge compatibility until concrete handlers arrive. Extend AI kinds/previews/outcomes safely with strict selected-topic projection.
- Write the next ADR and focused guidance extension for portable chapter publication, media profiles, independent provider credentials and durable accounting; distinguish implemented contract foundation from pending runtime.

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

- [x] All proposed DTOs reject unknown fields, traversal, oversized data, invalid model IDs and mismatched topic/media identities.
- [x] New AI contracts preserve existing five-producer validation, bounds and batching tests.
- [x] ADR/index/pattern updates explicitly govern the new capabilities without claiming unimplemented behavior.

## Manual verification

Review the delivered behavior against acceptance using actual output and affected registered screenshots. UI review includes both themes, keyboard, reduced motion, minimum layout and 200% zoom. Fixtures prove local process/storage behavior; live account access, pedagogical quality and native OS/screen-reader qualification require separate actual evidence. Do not perform paid calls without explicit authorization.

## Completion evidence

Accepted after primary inspection of the actual strict contracts, ports, AI/coordinator consumers, tests and ADR/pattern diff. Worker: `/root/contracts`, domain/contracts, `gpt-6.1-sol`, high reasoning. No prerequisites; starting branch `master`, HEAD `5c8ff9bb95a29373a5961f1194be3ba4c8436802`.

`npm.cmd run check` passed (345 unit tests passed / 3 skipped, lint, flow audit, type scopes and bundles). Final parser changes passed 57 focused tests across eight files and both type scopes. Coordinator ran `npm.cmd run test:desktop -- tests/desktop/model-test.spec.ts tests/desktop/ai-streaming.spec.ts`: all three passed, including 200.5 seconds of actual fixture receiving, repair and model-access restart. Light/Dark streaming and Saving captures were visually reviewed. Bundle relative links resolve; staged whitespace is checked before commit. No live calls or owned worker processes remain. Chapter/provider runtime acceptance remains with dependent tickets and is not claimed here.

## Notes

- Requirements covered: R02, R05, R07, R10, R11, R12, R23, R31, R32, R34.
- Assumptions: the source spec's bounded defaults apply; no additional product blocker.
