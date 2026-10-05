# Ticket: ai-streaming.T05 - Approved workbench streaming panel for every AI start
Status: Open

## Source

- Spec: [Shared Pi streaming](ai-streaming.spec.md), R12–R14, R19–R20 and all settlement workflows.
- Approved design: [locked handoff](../../../docs/design/component-designs/01-generation-streaming/generation-streaming-selection.md), [unchanged final image](../../../docs/design/component-designs/01-generation-streaming/generation-streaming-final.png).
- Product scope: [PRD 01](../../prds/01-project-setup-and-outline.md).
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md).
- Patterns: [design system](../../patterns-design-system.md), [UX](../../patterns-ux.md), [renderer](../../patterns-renderer.md), [flows](../../patterns-flow.md), [IPC/security](../../patterns-ipc-security.md).
- ADRs: [0007](../../ADRs/ADR-0007-codex-inspired-design-and-ux.md), [0013](../../ADRs/ADR-0013-chatgpt-inspired-appearance.md), [0012](../../ADRs/ADR-0012-generation-recovery-and-navigation.md), [0019](../../ADRs/ADR-0019-topic-edits-and-project-file-access.md), [0020](../../ADRs/ADR-0020-playwright-flow-references.md), plus T01's streaming decision.

## Goal

Every accepted AI start immediately reveals the approved bottom panel, with connected activity icons and readable streaming feedback; saved content remains usable while competing AI actions are unavailable.

## Scope

### In scope

Global typed activity hook, workbench dock composition, all five producer transitions, recovery actions, global UI guards, theme/responsive/accessibility behavior and real Electron interaction/capture tests.

### Out of scope

Provider policy changes, persisted transcripts, raw replies/tool logs/private thinking, percentage/ETA, general outline-row redesign, queues or new tutoring features.

## Dependencies

- Depends on: [ai-streaming.T03](ai-streaming.t03.md), [ai-streaming.T04](ai-streaming.t04.md).
- Unblocks: [ai-streaming.T06](ai-streaming.t06.md).
- External prerequisites: none; design is locked, not awaiting another option selection.

## Implementation plan

1. Add a renderer global activity hook using T01's named query/subscription/unsubscribe. Reject stale initial queries, older revisions and late cancelled updates. Keep full unsaved results in domain state; subscription/coalescing is presentation only. Refactor `App.tsx`, existing `GenerationStatus`, project/account hooks and account/dialog consumers without importing core/main/preload implementation.
2. Place a stable dock within the main workspace **to the right of navigation**, near the lower 40–45% of available height. Keep saved document/dashboard above it with independent preview/document scrolling. Use narrower left timeline and wider right draft, subtle divider, operation/topic/model/request header, measured elapsed and Cancel. Connect green completed checks, purple current and hollow upcoming icons with thin lines; these are status indicators, not hyperlinks or fictional mandatory steps.
3. Render plaintext safe partial previews and accurate operation scope. Educational draft says “Draft preview · Not saved”; tests show evidence/status only. Active footer says “Other AI actions are paused.” Topic-only wording belongs only to topic rewrites. Show honest waiting/30-second hint, checking, saving, saved/verified, needs-details, cancelled/failure and unsaved/conflict outcomes. Terminal presentation is dismissible and does not keep AI admission locked.
4. Transition covering edit/account overlays immediately **after accepted admission**, focus the panel heading once and preserve input drafts. Rejected starts remain with their input/error. Update all five named start consumers, including dashboard diagnostics with no project. Later activity changes must not steal focus or hide progress above document scroll.
5. Disable competing AI buttons and submission shortcuts globally using authoritative activity plus local pending-start guards; main remains the enforcement layer. Preserve IME behavior, reading/disclosures and appearance settings. Ordinary settings dismissal does not cancel. Account-scoped calls survive dashboard/project navigation with discoverable global progress; project-scoped calls retain Stay here/Cancel and switch, waiting for cancellation/saving settlement.
6. Route Cancel through the owned ID, available through inference/validation and unavailable after publication begins. Keep saved work and request drafts on failure. Wire Retry save/Review conflict to existing storage-only routes; an unsaved result remains recoverable after another global operation replaces the panel. No partial preview receives a save action.
7. Use semantic Light/Dark tokens, minimum-window responsive stacking, existing drawer/bottom rail, 200% zoom, wrapping long inputs, selectable draft text and always-reachable controls. Preserve manual reading position; auto-follow only while at preview end. Use labelled controls, meaningful text/shape states, polite phase announcements (not character updates), visible focus and reduced motion. Do not add heavier cards around existing topic rows.

## Patterns to apply

React owns visual/focus/scroll state; backend snapshots determine acceptance, cancellation and save availability. Keep the typed sandboxed bridge and plaintext rendering. Theme state remains device-local presentation; streaming adds no `.edu` writes. Read relevant appearance/outline/topic/model-access/reading flow explanations and current captures before changing composition.

## Tests and verification

- Extend `tests/desktop/outline.spec.ts`, `outline-edit.spec.ts`, `topic-edit.spec.ts`, `model-test.spec.ts`, `recovery.spec.ts`, `reading.spec.ts`, `appearance.spec.ts` for accepted/rejected transitions, immediate waiting, structured preview, global disabled controls/shortcuts, cancellation/new-run ordering, saving guard, recoverable unsaved output, account navigation and preserved file bytes/request counts.
- Assert actual Electron focus/IME, saved and preview scroll behavior, stale subscription handling, theme switching during streaming, minimum viewport, 200% zoom, long request/title and reduced motion. Use existing unit harness for pure hook/state logic only where meaningful; do not substitute DOM simulation for real IPC journeys.
- Register stable checkpoints in `tests/flows/catalog.ts`; capture after assertions via shared flow fixture, review relevant passing Light/Dark/narrow/zoom PNGs, and update affected flow narratives. T06 owns the dedicated long-stream flow, not this ticket's essential interaction/security evidence.
- Gates: focused desktop checks, `npm run check`, `npm run test:desktop`, `npm run test:flows`. No-new-test exception not applicable. Record actual results and visual review in future bundle evidence.

## Acceptance criteria

- [ ] All five accepted start kinds show the locked bottom panel immediately, including account tests without a project.
- [ ] Connected timeline states and scope/terminal labels are truthful; partial output is readable and unsaveable.
- [ ] Other AI actions are disabled/guarded until settlement while saved reading and supported navigation remain usable.
- [ ] Drafts, storage recovery, cancellation/saving limits and focus continuity survive all tested outcomes.
- [ ] Both themes, narrow/zoomed layout, long content, manual scrolling and reduced motion are reviewed on actual Electron evidence.

## Manual verification

Compare isolated passing app captures with the locked final image, preserving existing surrounding outline styling. Keyboard through each start/cancel/recovery flow; select draft prose, scroll backwards while it grows and switch appearance. Check representative screen-reader announcements and contrast/focus in both themes. Record screen-reader/tool/OS and remaining native-platform limits; screenshots alone cannot certify accessibility or live inference.

## Completion evidence

Pending authorized implementation: all-producer panel evidence, reviewed captures, interaction checks, accessibility findings and explicit remaining external gates.

## Notes

- Requirements covered: primary R12, R13, R14, R19, R20; supporting R02, R07, R09, R11, R16, R17, R18, R23.
- Blockers: none. Backend acceptance remains authoritative; design approval is not runtime acceptance.
