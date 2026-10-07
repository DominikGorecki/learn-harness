# Ticket: main-workspace-design.T01 - Build the scoped editorial workspace and migrate central forms
Status: Done

## Source

- Spec: [main-workspace-design.spec.md](main-workspace-design.spec.md)
- Design: [main-workspace-design.design.md](main-workspace-design.design.md)
- Product: [overview](../../../docs/overview.md), [PRD 01](../../prds/01-project-setup-and-outline.md)
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md), [patterns](../../patterns.md), [ADRs](../../ADRs/INDEX.md)

## Goal

Build the scoped editorial workspace and migrate central forms.

## Scope

### In scope

Create scoped page/header/context/action/row/document primitives and opaque Light/Dark glass tokens. Migrate empty/populated dashboard, setup/refinement, contextual header and loading/recovery/message states. Adopt ADR-0025 scoped exception and initial canonical standard. Preserve sidebar/title strip/dialog/dock styling and contracts.

### Out of scope

All strict spec exclusions: panel/dock/title redesign, schemas, new inference producers, tutoring, identity/profile migration, release signing/publishing.

## Dependencies

- Depends on: None
- Unblocks: T02, T03, T04
- External prerequisite: bundle 03 runtime controller is present at starting HEAD d258a6d; retain its separately unresolved native qualifications.

## Implementation plan

Create scoped page/header/context/action/row/document primitives and opaque Light/Dark glass tokens. Migrate empty/populated dashboard, setup/refinement, contextual header and loading/recovery/message states. Adopt ADR-0025 scoped exception and initial canonical standard. Preserve sidebar/title strip/dialog/dock styling and contracts.

## Patterns to apply

- Read design-system, UX, renderer, AI, flows, development/testing and distribution as applicable; ADR-0007/0013/0019/0020/0021/0022/0023/0024 retain unamended scope.
- Ownership: src/renderer/src/components/Workspace.tsx; src/renderer/src/workspace.css; src/renderer/src/app/App.tsx (central boundaries/recovery only); Dashboard.tsx; ProjectSetup.tsx; relevant focused desktop assertions; ADR-0025; initial patterns-main-workspace/design-system and indexes.
- Renderer presentation/navigation stays unprivileged; main/build own bounded fixed icon resources. No core/shared/preload behavior changes expected.
- Preserve validated named IPC, sandboxing, .edu/profile separation, source locality, AI cancellation/save ownership and truthful authoritative status.
- Scope Light/Dark editorial/glass treatment to central content/header. Existing panels and overlays retain contracts; native qualification is distinct from fixture captures.

## Tests and verification

- npm run check; npm run test:desktop -- tests/desktop/projects.spec.ts tests/desktop/appearance.spec.ts; inspect real both-theme central and unchanged-panel captures.
- Add meaningful behavior regressions at affected boundary; presentation-only primitives need no mirror tests.
- Use existing isolated Electron fixtures and configured flow reporter, never live private data.
- Evidence: primary records actual commands/outcomes in validation.md and requirement mapping in acceptance.md.

## Acceptance criteria

- [x] Every non-outline central surface uses shared page vocabulary with complete states.
- [x] No new global styles leak into sidebar, overlays or AI panel.
- [x] Long/narrow/zoomed forms retain reachable controls and unchanged drafts/model/goal contracts.
- [x] Both-theme captures and initial canonical decision/token boundary are reviewed.

## Manual verification

- Inspect actual both-theme relevant captures, keyboard/focus/selection, narrow/200%, reduced motion and opaque surfaces against selected reference.
- Preserve full data, visible labelled commands and usable reading/dock. Separate renderer automation from native screen-reader/window/taskbar qualification and live-provider evidence.

## Completion evidence

Implemented by workspace_foundation (gpt-6.1-sol, high), accepted after primary source/ADR/selector review, independent npm run check and all nine actual projects/appearance PNG reviews. Shared primitives and scoped opaque tokens migrate dashboard/setup/refinement/loading/recovery/header without panel/dock/navigation changes. Focused projects+appearance desktop passes 2/2; code gate passes 28 files/321 tests, 3 pre-existing skips. Both-theme contrast, gradient-disabled opaque fallback and 200% hit targets pass. Details/limits are in validation.md. No prerequisite commits; starting master d258a6d.

## Notes

- Requirements covered: R01, R02, R11, R12, R13, R14 (shared foundation).
- No unresolved product decision; native/macOS/Linux/manual qualifications must be named honestly.

