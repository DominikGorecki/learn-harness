# Ticket: <spec_slug>.T## - <Short Title>
Status: Open

Use `ref/work/NN-<spec_slug>/<spec_slug>.tNN.md`. Preserve existing bundle paths, ticket IDs and descriptive statuses. Links resolve from the generated ticket's directory.

## Source

- Spec: <path>
- Product/request scope: <relevant PRD, user request, or brief>
- Guidance: <AGENTS.md and README.md>
- Patterns: <relevant project pattern files>
- ADRs: <relevant ADRs or None>

## Goal

- <1 to 3 outcome bullets>

## Scope

### In scope

- <item>

### Out of scope

- <item>

## Dependencies

- Depends on: <none | T## | external>
- Unblocks: <T## list or none>

## Implementation plan

- <ordered concrete steps>

## Patterns to apply

- <pattern file/rule and how it applies>
- Ownership: <affected core/shared/main/preload/renderer responsibilities and allowed imports>
- Trust/data boundary: <validated named IPC, sandboxing, .edu versus profile state, source preservation, cancellation/save identity as relevant>
- UI constraints: <design system, UX, renderer, ADR-0007/ADR-0013 Light/Dark and focus/recovery, or unaffected>

## Tests and verification

- Add tests for: <cases>
- Suggested locations: <paths>
- Mocking/fakes needed: <items or none>
- Code gate: <npm run check for code changes>
- Desktop gate: <npm run test:desktop for process/bridge/startup or user-flow changes>
- No-new-test exception: <justification for low-impact prose/presentation changes, or not applicable>
- Evidence: <actual commands/results in validation.md; requirement/acceptance mapping in acceptance.md when needed>

## Acceptance criteria

- [ ] <criterion>

## Manual verification

- Steps: <steps>
- Expected result: <expected result>
- Evidence limits: <fixtures versus live account, local OS versus other native platforms, visuals versus functional tests>

## Completion evidence

<Filled by the authorized implementation owner: finished behavior, actual checks, requirement/acceptance coverage, and any remaining gates. An unchecked required gate prevents a full-completion claim.>

## Notes

- Requirements covered: <R# list>
- Assumptions/open questions: <items or none>
