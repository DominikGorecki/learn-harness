# Ticket: illustrated-topic-content.T07 — Integrate chapter generation and rich offline topic reading
Status: Open

## Source

- Spec: [Illustrated topic content](illustrated-topic-content.spec.md)
- Scope: explicit whole-spec implementation request; [product context](../../../docs/overview.md).
- Guidance: [AGENTS.md](../../../AGENTS.md), [README](../../../README.md), [pattern index](../../patterns.md), [ADR index](../../ADRs/INDEX.md).

## Goal

Integrate chapter generation and rich offline topic reading, delivering the scoped observable behaviors below.

## Scope

In scope: src/renderer topic-content/TopicView/App/workspace hooks and safe rich-text renderer; affected navigation mementos; focused tests/desktop topic-content/reading/history and flow catalog/references.

Out of scope: unrelated work, TTS, Socratic runtime, OpenRouter text inference, automatic web research, arbitrary models/endpoints and cloud/background jobs. Preserve existing source content and process security.

## Dependencies

- Depends on: [T02](illustrated-topic-content.t02.md), [T05](illustrated-topic-content.t05.md).
- Unblocks: T08, T09.
- External prerequisites: no live credentials needed for deterministic implementation; required live/native qualification remains separately recorded and never assumed.

## Implementation plan

- Add Generate Content, deliberate text-only path, estimate/model context and continued/replacement/save recovery commands to current topic destination.
- Use shared central reading recipe for TOC, rich inert prose, code/tables/notation, local images/alt/captions, sources and secondary Topic plan disclosure.
- Resolve current content with stable project/topic identity, staleness/missing media/read-only recovery and safe Back/Forward/scroll/focus restoration.

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

- [ ] Generated chapter is readable offline with meaningful images and complete objective structure; no render path executes model HTML or fetches remote images.
- [ ] Reading/navigation creates no inference; missing/deleted topics/assets and read-only state remain truthful.
- [ ] Light/Dark, narrow/zoom, keyboard and history recovery have passing reviewed Playwright captures and backend byte assertions.

## Manual verification

Review the delivered behavior against acceptance using actual output and affected registered screenshots. UI review includes both themes, keyboard, reduced motion, minimum layout and 200% zoom. Fixtures prove local process/storage behavior; live account access, pedagogical quality and native OS/screen-reader qualification require separate actual evidence. Do not perform paid calls without explicit authorization.

## Completion evidence

Pending coordinator acceptance. Worker role: frontend/reader; planned model: gpt-6.1-sol; reasoning: medium. Primary owns statuses, staging, commits and bundle closure. No nested agents unless the primary assigns them.

## Notes

- Requirements covered: R01, R04, R08, R12, R14, R15, R16, R17, R26, R32, R35.
- Assumptions: the source spec's bounded defaults apply; no additional product blocker.
