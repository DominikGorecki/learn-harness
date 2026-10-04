# Ticket: project-setup-and-outline.T02 — Open and persist learning projects in a polished desktop workspace

Status: Open

## Source

- [Implementation spec](project-setup-and-outline.spec.md)
- [PRD](../../prds/01-project-setup-and-outline.md)
- [Project guidance](../../../AGENTS.md) and [patterns](../../patterns.md)
- Applicable ADRs: 0001–0007; add durable decisions as implemented.

## Goal and scope

Versioned profile registry and .edu state; native folder selection; deduplication; reopen/relink; corruption/read-only states; per-project model preference; neutral Codex-inspired dashboard and setup composer; draft preservation and responsive navigation.

## Dependencies

- Depends on: T01 for the connected model surface.
- Unblocks: T03.

## Implementation plan

1. Define project handles/snapshots and validated versioned storage documents; put domain use cases behind async ports.
2. Implement bounded filesystem access and atomic .edu saves with revision checks; opening alone creates no educational files.
3. Add native selection/relink and authorized project capabilities; persist dashboard locations independently of portable project state.
4. Replace primary demo navigation with real project rows, a focused empty state, large topic composer, account control, and model selection.
5. Review screenshots and keyboard/zoom behavior while integrating the actual project backend.

## Tests and verification

- Empty/project folder open, duplicate/restart registry behavior, separate model preferences, corruption/unknown version and missing folder recovery.
- Atomic-save failure, external edit rejection, .edu symlink rejection, read-only state, and moved project identity.
- Desktop open/cancel/reopen, no inference/no .edu on open, model selection, draft navigation, narrow layout and focus.
- Run `npm run check`; run the real desktop gate for process, bridge, or user-flow changes. Record exact results in [validation](validation.md).

## Acceptance criteria

- [ ] A selected ordinary folder opens and appears exactly once in the persisted dashboard.
- [ ] Opening alone creates no .edu and makes no inference request; saved outlines remain readable without account access.
- [ ] Model preferences persist separately in two projects and missing models require deliberate resolution.
- [ ] Invalid or unavailable project state is preserved and recoverable through the UI.
- [ ] Dashboard/setup are visually coherent under ADR-0007 and use real backend state.

## Traceability

PROJ-01 through PROJ-08; MODEL-01 through MODEL-07; INPUT-01, INPUT-02; AC-03, AC-04 and project portions of AC-09, AC-11, AC-12, AC-13.

## Completion evidence

Pending implementation. Keep this section current with commits, validation, and any external verification still required.
