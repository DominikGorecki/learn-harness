# Ticket: illustrated-topic-content.T09 — Verify integrated chapter and provider delivery
Status: Local integration repairs accepted — fresh primary cumulative gates and required live/editorial qualification pending

## Source

- Spec: [Illustrated topic content](illustrated-topic-content.spec.md)
- Scope: explicit whole-spec implementation request; [product context](../../../docs/overview.md).
- Guidance: [AGENTS.md](../../../AGENTS.md), [README](../../../README.md), [pattern index](../../patterns.md), [ADR index](../../ADRs/INDEX.md).

## Goal

Verify integrated chapter and provider delivery, delivering the scoped observable behaviors below.

## Scope

In scope: missing meaningful regression tests/flow references/packaged-worker profiles; maintained guidance and README/product scope; coordinator validation.md/acceptance.md/spec verification.

Out of scope: unrelated work, TTS, Socratic runtime, OpenRouter text inference, automatic web research, arbitrary models/endpoints and cloud/background jobs. Preserve existing source content and process security.

## Dependencies

- Depends on: [T06](illustrated-topic-content.t06.md), [T07](illustrated-topic-content.t07.md), [T08](illustrated-topic-content.t08.md).
- Unblocks: none.
- External prerequisites: no live credentials needed for deterministic implementation; required live/native qualification remains separately recorded and never assumed.

## Implementation plan

- Audit every requirement against cumulative delivered code, safe contracts and real process behavior; repair identified integration gaps without weakening gates.
- Repair truthful no-plan turn-budget settlement, independently verified checkpoint baseline status and recorded continuation-model labels. Add actual reader stale/corrupt/removed-anchor evidence and activate narrow supported non-inference cost reconciliation from request details.
- Run fresh npm run check, full test:desktop, package and test:packaged; review changed registered captures and packaged skills/worker assets.
- Record exact coverage and remaining live/native gates, update maintained implemented guidance; do not claim closed bundle until all mandatory acceptance evidence is satisfied.

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

- [ ] All mandatory local integrated gates pass and each requirement maps to actual delivered implementation and evidence.
- [ ] Assets/workers/skills load through packaged runtime; all changed flow links/captures are valid and reviewed.
- [ ] Live/provider/pedagogical and native-platform limits are individually explicit; no fixture is labelled live or mastery.

## Manual verification

Review the delivered behavior against acceptance using actual output and affected registered screenshots. UI review includes both themes, keyboard, reduced motion, minimum layout and 200% zoom. Fixtures prove local process/storage behavior; live account access, pedagogical quality and native OS/screen-reader qualification require separate actual evidence. Do not perform paid calls without explicit authorization.

## Completion evidence

The primary accepted the scoped local repairs after inspecting source/tests, actual flow manifests and refreshed visual references. Worker role: integration/review; model: gpt-6.1-sol; reasoning: high. Two read-only medium reviewers checked renderer ownership and backend baseline/ledger/lifecycle boundaries. Prerequisites T06/T07/T08 are accepted and committed; release HEAD was `5a6e93481738b6bd61482c62903e1759a74ff573` on original `master`. No nested agents were used.

- Implemented no-plan budget failure versus durable pause, independent read-only checkpoint baseline status/guards, recorded continuation-model labels and reachable strict non-inference cost reconciliation. Serialized paid-call billing/disposition updates preserve both through a held append; epoch checks reject removed/replaced connections. Exhausted image allowance does not prohibit a saved key's metadata check.
- Focused three-file tests: 71 passed. Final frozen `npm.cmd run check` (63640): exit 0; 42 unit files, 492 passed/3 skipped, lint/flow audit/types/build passed.
- Final `npm.cmd run test:desktop -- tests/desktop/topic-content-integration.spec.ts tests/desktop/openrouter-settings.spec.ts tests/desktop/topic-reading.spec.ts` (26018): exit 0; six passed in 1.2 minutes. Actual counts: no-plan 48+0, resume 48+2 using the recorded model, stale 48+0 text calls; zero image requests. Cost checks make six explicit generation-metadata GETs, zero image POSTs, and retain exact spend `0.123456789123456789` once, including a limited saved key. Reader history and corrupt-marker recovery preserve immutable originals with no inference.
- Earlier broader affected command (81107): exit 1; ten passed and one editor Escape focus assertion failed. Final topic-reading rerun passed with focus product code and expected-trigger assertion unchanged. This failure is retained in validation and must be covered again by the primary's full suite.
- Primary reviewed all 14 changed existing PNGs and the three actual nonvisual manifests; final integration test SHA256 is `7e47ca90caa7f1425b5da74036a7f29b58daa47e913cfd7063a6d8dfd44d238d`. Temporary fixture roots/providers were cleaned; sessions ended and Electron process count was zero. No paid/live/private credential access.

Primary owns the fresh full code/desktop/package/ASAR gates, final records, local commits and bundle closure. Those whole-spec checks and required live/editorial qualification remain unresolved at this implementation acceptance point.

## Notes

- Requirements covered: R01–R35.
- Assumptions: the source spec's bounded defaults apply; no additional product blocker.
