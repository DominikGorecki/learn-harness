# Ticket: project-setup-and-outline.T04 — Understand folder material and fill learning gaps

Status: Implemented and locally validated

## Source

- [Implementation spec](project-setup-and-outline.spec.md)
- [PRD](../../prds/01-project-setup-and-outline.md)
- [Project guidance](../../../AGENTS.md) and [patterns](../../patterns.md)
- Applicable ADRs: 0001–0007; add durable decisions as implemented.

## Goal and scope

Bounded nested text/Markdown inventory; excluded/unsupported/unreadable coverage; Pi material list/read tools; actual source-read evidence; learner-directed interpretation; clarification on insufficient material; relevant foundations and gap filling.

## Dependencies

- Depends on: T03.
- Unblocks: T05, T06.

## Implementation plan

1. Implement a deterministic scoped source inventory excluding secrets, generated state, binary files, symlinks, and executable agent instructions.
2. Give the Pi worker only the allowed material snapshot and tools; track actual reads and expose real progress.
3. Require references to be grounded in material actually read, and record coverage limitations outside model claims.
4. Add empty/unsupported/ambiguous transitions back to the preserved composer and optional direction over folder content.
5. Present source context, scope assumptions, and additions clearly in the completed outline.

## Tests and verification

- Nested supported files, excluded directories/credentials, symlink escapes, binary and oversized inputs, bounded traversal and unreadable files.
- Untrusted source instructions cannot execute tools beyond the educational set or modify original files.
- Content-only outline, explicit goal overriding conflicting material, insufficient-context clarification, and invented-source rejection.
- Desktop material-led generation and coverage/clarification states through the real worker with protocol fixtures.
- Run `npm run check`; run the real desktop gate for process, bridge, or user-flow changes. Record exact results in [validation](validation.md).

## Acceptance criteria

- [x] A relevant folder produces an outline without requiring a written brief and includes reasoned missing foundations.
- [x] No content is sent on ordinary folder opening; only bounded permitted content is available to the generation run.
- [x] Coverage describes what was and was not inspected; generated source references are verified against actual reads.
- [x] Ambiguous/unsupported material returns a useful input request rather than a fabricated confident subject.
- [x] Original source files remain unchanged.

## Traceability

INPUT-03 through INPUT-10; OUTLINE-02, OUTLINE-04; AC-06, AC-07, AC-08 and material portions of AC-09.

## Completion evidence

Implemented bounded read-only snapshots, Pi list/read tools, actual-read source validation, source coverage, separate inferred briefs, and details requests for unsupported/ambiguous material. Unit tests and real Electron signed HTTP/SSE journeys cover scope, source preservation, content-only creation, explicit goal transmission, and recovery. See [validation](validation.md). Semantic curriculum quality remains a live-provider T06 evaluation.
