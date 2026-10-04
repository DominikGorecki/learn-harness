# Ticket: project-setup-and-outline.T05 — Complete recovery, regeneration, and responsive interaction

Status: Open

## Source

- [Implementation spec](project-setup-and-outline.spec.md)
- [PRD](../../prds/01-project-setup-and-outline.md)
- [Project guidance](../../../AGENTS.md) and [patterns](../../patterns.md)
- Applicable ADRs: 0001–0007; add durable decisions as implemented.

## Goal and scope

Regeneration replacement semantics; generated-but-unsaved retention and retry; account/limit/model recovery; stale responses and project isolation; navigation cancellation choice; keyboard shortcuts/overlay focus; long-content/zoom/reduced-motion polish.

## Dependencies

- Depends on: T01 through T04.
- Unblocks: T06.

## Implementation plan

1. Review the entire PRD recovery matrix against working code and close every remaining behavior gap.
2. Implement explicit regeneration with prior-result preservation and storage retry without inference.
3. Protect operation ownership across project navigation, model/account changes, cancellation races, and application shutdown.
4. Refine account/model menus, keyboard shortcuts, focus restoration, narrow navigation, document scrolling, and long text.
5. Review actual screenshots for all supported states and adjust layout/copy where it obstructs the task.

## Tests and verification

- Save fails after generation then retry succeeds without another provider call; regeneration failure preserves prior bytes.
- Cancel during read/stream/save, worker failure, network disconnect, unavailable allowance/model, and late result after project switch.
- Draft preservation through auth and navigation, Escape behavior, IME-safe submit shortcut, keyboard-only journey and reduced motion.
- Long outlines, long filenames/input, narrow window and 200% zoom with no inaccessible primary actions.
- Run `npm run check`; run the real desktop gate for process, bridge, or user-flow changes. Record exact results in [validation](validation.md).

## Acceptance criteria

- [ ] Every PRD recovery situation has a tested state and useful action that preserves learner work.
- [ ] Regeneration changes the saved result only after a complete valid replacement is saved.
- [ ] A result can never be committed to a different project or under a silently substituted model.
- [ ] The full supported journey is keyboard-accessible, responsive, and visually calm.
- [ ] No UI control implies an unimplemented capability.

## Traceability

AUTH-04 through AUTH-06; PROJ-05 through PROJ-07; MODEL-05 through MODEL-07; OUTLINE-07 through OUTLINE-11; AC-02, AC-10, AC-11, AC-12, AC-13.

## Completion evidence

Pending implementation. Keep this section current with commits, validation, and any external verification still required.
