# Ticket: main-workspace-design.T04 - Publish the main-workspace contract and integrated acceptance evidence
Status: Open

## Source

- Spec: [main-workspace-design.spec.md](main-workspace-design.spec.md)
- Design: [main-workspace-design.design.md](main-workspace-design.design.md)
- Product: [overview](../../../docs/overview.md), [PRD 01](../../prds/01-project-setup-and-outline.md)
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md), [patterns](../../patterns.md), [ADRs](../../ADRs/INDEX.md)

## Goal

Publish the main-workspace contract and integrated acceptance evidence.

## Scope

### In scope

Finalize canonical actual tokens/primitives/page inventory/logo paths/export rules and future-feature checklist. Update discovery/product status and constrained guidance without overwriting historical limits. Run fresh cumulative gates, inspect actual theme/state/narrow/dock/focus captures and measure contrast. Map all requirements/acceptance criteria to source/evidence and record native/manual/live limitations. Repair gaps before closure.

### Out of scope

All strict spec exclusions: panel/dock/title redesign, schemas, new inference producers, tutoring, identity/profile migration, release signing/publishing.

## Dependencies

- Depends on: T01, T02, T03
- Unblocks: None
- External prerequisite: bundle 03 runtime controller is present at starting HEAD d258a6d; retain its separately unresolved native qualifications.

## Implementation plan

Finalize canonical actual tokens/primitives/page inventory/logo paths/export rules and future-feature checklist. Update discovery/product status and constrained guidance without overwriting historical limits. Run fresh cumulative gates, inspect actual theme/state/narrow/dock/focus captures and measure contrast. Map all requirements/acceptance criteria to source/evidence and record native/manual/live limitations. Repair gaps before closure.

## Patterns to apply

- Read design-system, UX, renderer, AI, flows, development/testing and distribution as applicable; ADR-0007/0013/0019/0020/0021/0022/0023/0024 retain unamended scope.
- Ownership: ref/patterns-main-workspace.md; constrained UX/renderer/docs/distribution/flows/design guidance; AGENTS.md; README.md; docs/overview.md; PRD01; changed flow narratives and evidence; bundle validation/acceptance/spec verification (coordinator owns).
- Renderer presentation/navigation stays unprivileged; main/build own bounded fixed icon resources. No core/shared/preload behavior changes expected.
- Preserve validated named IPC, sandboxing, .edu/profile separation, source locality, AI cancellation/save ownership and truthful authoritative status.
- Scope Light/Dark editorial/glass treatment to central content/header. Existing panels and overlays retain contracts; native qualification is distinct from fixture captures.

## Tests and verification

- npm run check; npm run test:desktop; npm run test:flows; npm run package and test:packaged fresh where final resource changes warrant; documentation links/diff check; visual/contrast/keyboard/fallback review.
- Add meaningful behavior regressions at affected boundary; presentation-only primitives need no mirror tests.
- Use existing isolated Electron fixtures and configured flow reporter, never live private data.
- Evidence: primary records actual commands/outcomes in validation.md and requirement mapping in acceptance.md.

## Acceptance criteria

- [ ] Canonical main-only look and feel and actual consumer inventory guide every future central page.
- [ ] Every R01–R18 has implementation and reviewed evidence; generated concepts remain distinct.
- [ ] Fresh code/full desktop/flow and affected packaging gates pass, with truthful external qualifications.
- [ ] Shared records/statuses and scoped local ticket/verification commits are complete.

## Manual verification

- Inspect actual both-theme relevant captures, keyboard/focus/selection, narrow/200%, reduced motion and opaque surfaces against selected reference.
- Preserve full data, visible labelled commands and usable reading/dock. Separate renderer automation from native screen-reader/window/taskbar qualification and live-provider evidence.

## Completion evidence

Pending coordinator acceptance and commit. Delegated workers return exact files/checks; primary owns status/evidence/staging/commits.

## Notes

- Requirements covered: R15, R16; cumulative R01–R18.
- No unresolved product decision; native/macOS/Linux/manual qualifications must be named honestly.

