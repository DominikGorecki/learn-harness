# Ticket: project-setup-and-outline.T03 — Generate and save a complete outline from learning intent

Status: Open

## Source

- [Implementation spec](project-setup-and-outline.spec.md)
- [PRD](../../prds/01-project-setup-and-outline.md)
- [Project guidance](../../../AGENTS.md) and [patterns](../../patterns.md)
- Applicable ADRs: 0001–0007; add durable decisions as implemented.

## Goal and scope

Learning outline contract and normalization; learning prompt; isolated Pi generation worker; namespaced educational completion/clarification tools; current model and plan-compatible transport; real progress/cancellation; atomic save; readable outline with lesson/module disclosure.

## Dependencies

- Depends on: T01, T02.
- Unblocks: T04, T05.

## Implementation plan

1. Define independently validated outline data and topic-appropriate method repertoire grounded in the Socratic document.
2. Implement the Pi Agent Core worker with bounded lifetime/turns, explicit model/token input, supported Responses payloads, and no coding shell/extensions.
3. Add core run ownership and process lifecycle, sanitized progress, completed-result validation, and project save.
4. Build the description-to-outline journey and document-like outline reader, preserving the previous result and input during a run.
5. Add deterministic protocol fixture support that exercises the real Pi transport/worker; reserve live plan proof for T06.

## Tests and verification

- Reject incomplete/duplicate/oversized outline shapes and invalid method/start/source references.
- Exercise actual Pi Responses requests against streamed local fixtures, including terminal completion, incomplete streams, tool completion, and cancellation.
- Verify worker cleanup, single-run guard, run/project/model correlation, and persistence after process restart.
- Desktop short phrase, detailed brief, generated lesson/module disclosure and saved result re-open.
- Run `npm run check`; run the real desktop gate for process, bridge, or user-flow changes. Record exact results in [validation](validation.md).

## Acceptance criteria

- [ ] A short topic or substantial brief drives the real Pi agent path and produces every required outline level.
- [ ] The selected account/project model is used without billing fallback or unsupported request controls.
- [ ] Only a complete validated result is marked saved after persistence; reopening spends no inference allowance.
- [ ] Cancellation terminates owned work and retains the prior outline and draft.
- [ ] The completed outline reads as an inviting learning document and exposes useful detail progressively.

## Traceability

OUTLINE-01, OUTLINE-03 through OUTLINE-08, OUTLINE-11; INPUT-01, INPUT-02, INPUT-08, INPUT-09; AC-05, AC-08, AC-09, initial AC-10.

## Completion evidence

Pending implementation. Keep this section current with commits, validation, and any external verification still required.
