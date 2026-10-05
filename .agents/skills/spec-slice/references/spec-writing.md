# Standalone spec writing

Use this only when the target project has no available spec-writing skill or equivalent workflow. If one exists, apply its complete procedure and template instead.

## Write one implementable artifact

For the bounded slice supplied by the coordination plan:

1. Recheck the relevant source, project guidance, current behavior, and prerequisite contracts. Keep accepted decisions, assumptions, proposed interfaces, and unresolved choices distinct.
2. Choose a short lowercase hyphenated slug and use `ref/work/NN-<slice-slug>/<slice-slug>.spec.md`. Allocate one more than the highest number across all existing immediate bundles, starting at `01`; never reuse numbers or reserve a block. Preserve existing statuses and names rather than adding `__DONE`. Inspect the destination immediately before writing and choose a distinct slug for a collision.
3. Write enough detail for a reviewer to judge the outcome and an implementer to produce tickets without inventing material requirements. Use the content below, scaled to the slice and the project's template if one exists.
4. Re-read against the source and project evidence. Resolve contradictions and material omissions before marking the slice `Specified`.

## Required content

For Learning Studio, match the project spec template and `AGENTS.md` boundaries even if the local spec skill is temporarily unavailable. Inspect relevant focused patterns and accepted ADRs, preserve `.edu` versus application-profile ownership, and plan `npm run check` plus the applicable `npm run test:desktop` gate. Separate fixture, live-provider, visual, and native-platform evidence; planning or outline creation is not delivered learning mastery.

- **Summary and context:** beneficiary, current gap, observable outcome, stable slice ID, plan link, source references, and relevant evidence.
- **Goals, scope, and strict non-goals:** supported cases and exclusions, including features intentionally owned by other slices.
- **Functional requirements:** numbered, testable behavior for ordinary, boundary, and failure cases; inputs, outputs, transitions, and coupled invariants.
- **Quality requirements:** applicable reliability, performance, security, privacy, accessibility, compatibility, and observability needs. State meaningful limits rather than inventing numerical targets.
- **Proposed design and ownership:** components, flow, and responsibility boundaries consistent with the target project.
- **Interfaces and dependencies:** commands, schemas, events, APIs, files, or presentation contracts as applicable; consumed prerequisite interfaces and their implemented or proposed status.
- **Data, authority, and user workflow:** applicable storage, migration, retention, permissions, interactions, and failure recovery. Mark irrelevant areas as not applicable rather than forcing a stack.
- **Implementation outline:** enough ordered work to explain the proposed approach without creating tickets.
- **Validation and acceptance:** observable acceptance criteria, verification for each requirement, applicable project quality gates, and a clear distinction between behavioral checks and empirical evidence.
- **Rollout and recovery:** applicable compatibility, adoption, migration, rollback, or experiment-decision conditions.
- **Risks, alternatives, and alignment:** important trade-offs, relevant project rules and decisions, and documentation or architecture-decision work implementation may need.
- **Assumptions and questions:** permitted bounded assumptions and remaining questions. An unresolved material blocker prevents a complete ready spec.

## Review before completion

Check that the spec covers exactly this slice, consumes compatible prerequisite contracts, and never describes planned work as current behavior. Every requirement needs a verification path; uncertainty must be explicit and consistent with the allowed claim level.

Verify source and plan links from the actual artifact location. Check naming, lifecycle rules, and the absence of tickets or implementation edits introduced by spec writing. Report the actual spec path and any conditions that require reconsideration.
