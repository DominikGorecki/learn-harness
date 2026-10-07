# Ticket: illustrated-topic-content.T06 — Build sectioned OpenRouter and Appearance settings
Status: Done — locally accepted; whole-bundle/live qualification pending

## Source

- Spec: [Illustrated topic content](illustrated-topic-content.spec.md)
- Scope: explicit whole-spec implementation request; [product context](../../../docs/overview.md).
- Guidance: [AGENTS.md](../../../AGENTS.md), [README](../../../README.md), [pattern index](../../patterns.md), [ADR index](../../ADRs/INDEX.md).

## Goal

Build sectioned OpenRouter and Appearance settings, delivering the scoped observable behaviors below.

## Scope

In scope: src/renderer settings components/CSS/hooks and App settings integration; focused tests/desktop appearance and OpenRouter settings; flow catalog/index/captures for owned settings journeys.

Out of scope: unrelated work, TTS, Socratic runtime, OpenRouter text inference, automatic web research, arbitrary models/endpoints and cloud/background jobs. Preserve existing source content and process security.

## Dependencies

- Depends on: [T03](illustrated-topic-content.t03.md), [T05](illustrated-topic-content.t05.md).
- Unblocks: T09.
- External prerequisites: no live credentials needed for deterministic implementation; required live/native qualification remains separately recorded and never assumed.

## Implementation plan

- Widen existing no-history Settings dialog into responsive category navigation and grouped OpenRouter/Appearance content.
- Wire one-way key setup, protection/status/recovery, fixed model selection/prices, local/provider-labelled usage, paginated filtered call history/details and explicit refresh.
- Preserve existing Light/Dark radio previews, session-only feedback, draft state, Escape/focus restoration and clear unsaved secrets on close/save.

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

- [x] OpenRouter controls use only typed named bridge methods and never display/store raw keys or raw provider messages.
- [x] History and labelled cost uncertainty remain usable across restart/filter/refresh failure.
- [x] Both themes, keyboard, 600-pixel/200% zoom and current appearance/no-history behavior have passing reviewed Playwright evidence.

## Manual verification

Review the delivered behavior against acceptance using actual output and affected registered screenshots. UI review includes both themes, keyboard, reduced motion, minimum layout and 200% zoom. Fixtures prove local process/storage behavior; live account access, pedagogical quality and native OS/screen-reader qualification require separate actual evidence. Do not perform paid calls without explicit authorization.

## Completion evidence

Worker: frontend/settings, `gpt-6.1-sol`, medium reasoning, against accepted prerequisites T03 `c8eb934880f44bbfddd103f9c677a4e483533fb4` and T05 `2b8afb5920be070f6a3197eaf1c099e5000b1f67` on `master`. Primary inspected actual source/test/flow changes and commissioned a read-only medium review; no remaining local blockers.

The wide native no-history Settings dialog exposes OpenRouter and Appearance with responsive categories, neutral grouped controls, three fixed models and unavailable-choice reasons, protected one-way key setup, cached quote basis/check time/staleness, exact UTC app costs and unresolved counts, separately labelled key-wide usage, and filtered bounded history/details. Session/revision/model/request guards preserve new drafts against late replies/native close events. Close/current acknowledged save clears the editable password; history failures clear stale rows and offer retry. Quote failures settle as unavailable. Estimate basis copy uses plain count/aspect ratio/supported settings without changing main pricing/routing.

Final `npm.cmd run check`: exit 0; 39 unit files, 456 passed / 3 skipped, lint/flow consistency/type scopes/build. The broad affected desktop gate produced exit 1 (10 passed / 4 failed), retaining successful actual longstream (200,507 ms receiving, 146 ms latest bridge, 57 frames), repair, Appearance/navigation and existing reading/outline/edit journeys. Failures were the quote-error first label, a shared helper assuming enabled action colors for correctly disabled material recovery, and persisted zoom selecting a native dashboard capture with unmasked paths. Production quote feedback, helper semantic-state assertions and fixture-only zoom normalization were corrected without weakening security or availability. `npm.cmd run test:desktop -- tests/desktop/openrouter-settings.spec.ts tests/desktop/materials.spec.ts tests/desktop/recovery.spec.ts tests/desktop/projects.spec.ts` then passed all five in 49.5 seconds; final narrative-only `npm.cmd run test:flows` passed.

Actual Electron assertions cover non-inference key validation/metadata requests, invalid replacement preserving credential bytes, model absence, failed pages/filters/retry, date/model/purpose/outcome filters, exact known cost versus unknown/discard/save-failed, stale metadata, held save acknowledgement and deferred native close across sessions, keyboard trap/trigger restoration, restart/removal retaining costs with zero startup HTTP, DTO/diagnostic secret exclusion and no history/AI activity from Settings. A real chapter image fixture proves provider mutation BUSY while Appearance remains usable, followed by awaited cancellation and successful removal. Historical image costs are explicitly synthetic records; no paid live calls.

Primary reviewed all six final Settings PNGs, normal/narrow Light/Dark Appearance, new material/recovery/project captures and relevant refreshed streaming/navigation/outline/edit/reading evidence. Configured reporter published the passing flows. No active sessions or owned fixture resources remain; private reference screenshot excluded. Reader/replacement integration, cumulative gates and live/editorial/native qualification remain separate pending work.

## Notes

- Requirements covered: R10, R21, R22, R23, R24, R25, R26, R29, R31, R33.
- Assumptions: the source spec's bounded defaults apply; no additional product blocker.
