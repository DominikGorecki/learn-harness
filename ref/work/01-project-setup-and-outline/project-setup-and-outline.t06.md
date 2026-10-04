# Ticket: project-setup-and-outline.T06 — Verify the complete product and document actual acceptance

Status: Open

## Source

- [Implementation spec](project-setup-and-outline.spec.md)
- [PRD](../../prds/01-project-setup-and-outline.md)
- [Project guidance](../../../AGENTS.md) and [patterns](../../patterns.md)
- Applicable ADRs: 0001–0007; add durable decisions as implemented.

## Goal and scope

Requirement-by-requirement audit; complete Linux desktop run; real eligible account/plan inference; representative outline quality review; Windows/macOS/Linux native evidence; worker/runtime packaging; screenshots; durable documentation and closure.

## Dependencies

- Depends on: T01 through T05.
- Unblocks: Goal completion only when every PRD gate is proven.

## Implementation plan

1. Audit every AUTH/PROJ/MODEL/INPUT/OUTLINE requirement and all acceptance criteria against current authoritative evidence.
2. Run required code and real desktop gates, package the local app, and exercise packaged runtime boundaries.
3. Perform a live user-authorized ChatGPT sign-in and saved outline; inspect coherence, source grounding, gap filling, and module usefulness.
4. Run native platform workflows where runners exist; record unavailable platform/account evidence explicitly and keep the goal active.
5. Update implemented patterns/ADRs, README, product status, and validation evidence; remove obsolete demo production paths and stale claims.
6. Commit each coherent validation fix and close the work bundle only when the entire requested scope is verified.

## Tests and verification

- npm run check; Linux xvfb-run -a npm run test:desktop; npm run package and a packaged app startup smoke.
- Native Windows/macOS desktop journeys and packaging using actual available runners.
- Actual ChatGPT plan authorization/model selection/outline inference, separate from mocked protocol checks.
- Human visual/semantic review of saved screenshots and representative real outlines.
- Run `npm run check`; run the real desktop gate for process, bridge, or user-flow changes. Record exact results in [validation](validation.md).

## Acceptance criteria

- [ ] Each PRD requirement maps to inspected evidence or an explicitly unresolved blocker; none is silently dropped.
- [ ] Real plan access and inference are demonstrated; browser sign-in or fixtures alone are insufficient.
- [ ] Target-platform claims match actual native execution evidence.
- [ ] Actual UI screenshots meet the design/UX requirements and output quality has been reviewed.
- [ ] Runtime code, documentation, and granular commit history are coherent; goal completion is claimed only with all gates satisfied.

## Traceability

All PRD requirements; AC-01 through AC-14 cumulatively.

## Completion evidence

Pending implementation. Keep this section current with commits, validation, and any external verification still required.

