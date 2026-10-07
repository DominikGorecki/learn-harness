# Ticket: main-workspace-design.T02 - Deliver the selected outline and saved-topic navigation journey
Status: Done

## Source

- Spec: [main-workspace-design.spec.md](main-workspace-design.spec.md)
- Design: [main-workspace-design.design.md](main-workspace-design.design.md)
- Product: [overview](../../../docs/overview.md), [PRD 01](../../prds/01-project-setup-and-outline.md)
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md), [patterns](../../patterns.md), [ADRs](../../ADRs/INDEX.md)

## Goal

Deliver the selected outline and saved-topic navigation journey.

## Scope

### In scope

Compose selected saved overview with full scope/outcomes/evidence and independent quiet open/edit groups. Add complete saved-topic reader from authoritative outline. Extend one navigation controller with stable topic identity, current-content resolution/canonical fallback and per-destination bounded restoration. Permit same-project saved reading during AI/Saving without backend selection, preserve cross-project guards. Disable proposed-topic reading for unsaved results. Preserve editor draft/recovery/locality contracts and focus restoration. Register real topic-reading flow and update affected old disclosure assertions equivalently.

### Out of scope

All strict spec exclusions: panel/dock/title redesign, schemas, new inference producers, tutoring, identity/profile migration, release signing/publishing.

## Dependencies

- Depends on: T01
- Unblocks: T04
- External prerequisite: bundle 03 runtime controller is present at starting HEAD d258a6d; retain its separately unresolved native qualifications.

## Implementation plan

Compose selected saved overview with full scope/outcomes/evidence and independent quiet open/edit groups. Add complete saved-topic reader from authoritative outline. Extend one navigation controller with stable topic identity, current-content resolution/canonical fallback and per-destination bounded restoration. Permit same-project saved reading during AI/Saving without backend selection, preserve cross-project guards. Disable proposed-topic reading for unsaved results. Preserve editor draft/recovery/locality contracts and focus restoration. Register real topic-reading flow and update affected old disclosure assertions equivalently.

## Patterns to apply

- Read design-system, UX, renderer, AI, flows, development/testing and distribution as applicable; ADR-0007/0013/0019/0020/0021/0022/0023/0024 retain unamended scope.
- Ownership: OutlineView.tsx; new TopicView.tsx; App.tsx; app/navigation; affected meaningful unit and desktop tests; tests/flows/catalog.ts; topic-reading flow; affected flow narratives.
- Renderer presentation/navigation stays unprivileged; main/build own bounded fixed icon resources. No core/shared/preload behavior changes expected.
- Preserve validated named IPC, sandboxing, .edu/profile separation, source locality, AI cancellation/save ownership and truthful authoritative status.
- Scope Light/Dark editorial/glass treatment to central content/header. Existing panels and overlays retain contracts; native qualification is distinct from fixture captures.

## Tests and verification

- npm run check; npm run test:desktop -- tests/desktop/topic-reading.spec.ts tests/desktop/navigation.spec.ts tests/desktop/reading.spec.ts tests/desktop/outline.spec.ts tests/desktop/outline-edit.spec.ts tests/desktop/topic-edit.spec.ts; real file/no-inference/AI ownership and long 40-topic/narrow200% assertions.
- Add meaningful behavior regressions at affected boundary; presentation-only primitives need no mirror tests.
- Use existing isolated Electron fixtures and configured flow reporter, never live private data.
- Evidence: primary records actual commands/outcomes in validation.md and requirement mapping in acceptance.md.

## Acceptance criteria

- [x] Recommended non-first topic opens, full topic content is readable offline and edit/open commands remain independent.
- [x] Accepted topic visits, traversal, branch/noop, current content, missing-topic fallback and view restoration use one controller.
- [x] Saved same-project reading preserves AI owner/Saving; cross-project guards and storage-only retry/locality remain.
- [x] Provisional navigation is disabled; real flows and long/keyboard/zoom/focus evidence pass.

## Manual verification

- Inspect actual both-theme relevant captures, keyboard/focus/selection, narrow/200%, reduced motion and opaque surfaces against selected reference.
- Preserve full data, visible labelled commands and usable reading/dock. Separate renderer automation from native screen-reader/window/taskbar qualification and live-provider evidence.

## Completion evidence

Accepted by coordinator on master after T01 commit 15802600833d551f31cf00466a7fd9b3a81b13f9. Worker topic_workspace used gpt-6.1-sol/high; workspace_audit reviewed navigation/AI race fixes read-only and workspace_foundation reviewed actual visual references. Primary inspected source, new files and actual topic/read-only/edit/Receiving/Saving images.

Worker and independent primary npm run check passed: 28 unit files, 324 passed/3 skipped, lint, flow integrity, both type scopes and build. Final frozen-source eight-flow desktop run passed 8/8 (topic-reading, navigation, reading, outline, outline-edit, topic-edit, recovery, model-test); post-capture test:flows and diff check passed. Forty-topic/offline content, non-first recommendation, current rename/deletion, independent mementos, delayed real-selection reply, disappearing editor topic and distinct unsaved candidate are covered.

Real Pi/bridge/file fixtures verify unchanged operation identity/request count/exact project bytes through saved reading during Receiving, Cancelling and held Saving. Minimum 600x480 at 200% retains a fully painted/hit-testable 32px central command; only scoped central header/action adaptation changed. Recovery from a saved topic awaits accepted overview navigation before focusing its retained input. The typed main-sent read-only presentation fixture proves renderer reading/disabled edits over real files, not native Windows ACL behavior.

Normal sandbox Vitest realpath EPERM was bypassed only through auto-reviewed command execution, without weakening app security. Native screen reader/ACL, IME/manual selection, other-host and live-provider qualifications remain unrun. Fixture wrappers/barriers/apps/profiles were released/cleaned. Shared validation records retain exact limits; final cumulative acceptance belongs to T04.

## Notes

- Requirements covered: R03, R04, R05, R06, R07, R08, R09, R10; R02, R11–R14, R16 (topic/outline evidence).
- No unresolved product decision; native/macOS/Linux/manual qualifications must be named honestly.
