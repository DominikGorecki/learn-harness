---
name: spec
description: Write a Learning Studio implementation spec under ref/work, grounded in this Electron project's accepted decisions, learning requirements, and verification gates. Use when a change needs a durable plan before tickets or code.
metadata:
  collection: "spec skills"
  version: "2.0.0-project.1"
  project: "edu-harness"
---

# Spec

Create one implementable spec. Invocation authorizes the planning artifact; ticket generation, implementation, and commits are separate stages unless the user explicitly includes them.

## Learning Studio project contract

- Read `AGENTS.md`, `README.md`, `ref/patterns.md`, selected focused patterns, `ref/ADRs/INDEX.md`, and relevant accepted decisions. Read `docs/overview.md` and PRD 01 for scope/status, then inspect source/tests and acceptance/validation records; historical plans are not current implementation authority.
- Use `ref/work/NN-<slug>/<slug>.spec.md`, matching the existing `01-project-setup-and-outline` bundle. Allocate numbers across all existing immediate children, including completed/archived names. Tickets share the bundle as `<slug>.tNN.md`. Do not use `docs/work` or rename bundles with `__DONE` by default.
- Preserve descriptive statuses in existing bundles. A new spec is `Draft` while material blockers remain and `Ready for implementation` when implementable. Readiness is not completion. Actual acceptance evidence belongs in `validation.md` and, where needed, `acceptance.md`; external gates remain explicit.
- Define ownership across core learning behavior/ports, shared serializable contracts/validation, main privileged adapters/authorization, preload named capabilities, and renderer React. Preserve the import boundaries in `AGENTS.md`, context isolation, sandboxing, and validated IPC.
- Learner metadata belongs in `.edu`; recent locations and protected credentials belong in the application profile. Preserve original learning sources. Outline creation does not prove mastery; fixtures do not prove live-provider success.
- For UI scope, read design system, UX, and renderer rules plus ADR-0007/ADR-0013. Follow the supplied ChatGPT Light/Dark standard without inferring extra capabilities from screenshots.
- Map requirements to `tests/unit`, relevant `tests/desktop`, visual review, and external live/platform evidence. Plan `npm run check` for code changes and `npm run test:desktop` for process/bridge/startup or user-flow changes. Use PowerShell on Windows; Xvfb is for headless Linux only.
- Durable deviations need the next numbered ADR and updates to both indexes and constrained focused patterns. Identify that work in the spec; a proposal does not amend accepted rules.

## Procedure

1. Read a supplied input file fully, otherwise use the user request. Establish the target workspace and preserve unrelated artifacts and edits.
2. Read applicable agent instructions, documentation indexes, focused guidance, and relevant architecture decisions. Inspect current code, tests, interfaces, schemas, configs, and consumer surfaces that constrain the change. Follow the target project's architecture, tooling, and validation commands. If guidance is missing, state bounded assumptions; ask only when a material decision cannot be resolved from evidence.
3. Establish the beneficiary, observable outcome, strict non-goals, ownership, failure behavior, compatibility, applicable data/authority impacts, validation, and rollout. Keep accepted decisions, facts, assumptions, proposals, and open questions distinct. An unresolved product blocker prevents a ready implementation spec.
4. Apply the project artifact/status contract above unless the user selects another destination. Inspect the matching `ref/work` bundle and [the project spec template](references/template.md); preserve established records and numbering.
5. Choose a short lowercase hyphenated slug. For numbered bundles, inspect active and completed immediate child folders, allocate one more than the highest numeric prefix, start at `01`, and pad to at least two digits. Never reuse numbers or reserve a block. For any layout, check collisions before writing. Update an existing spec only when requested and unambiguous, preserving unrelated content. Editorial corrections may remain in completed artifacts; added implementation scope needs a new artifact or explicit reopening.
6. Use the project's stronger template when present, otherwise [the spec template](references/template.md). Include summary/context, goals and strict non-goals, scope, numbered testable functional requirements, applicable quality requirements, design and ownership, interfaces, data and authorization impacts, consumer workflow, work breakdown, tests, acceptance, rollout, risks/alternatives, pattern/decision alignment, assumptions, and open questions. Mark irrelevant areas as not applicable.
7. Re-read against the source and repository evidence. Every requirement needs a verification path; links must resolve from the actual artifact directory. Record relevant proposed documentation/ADR work without changing maintained architecture rules through planning alone. Do not generate tickets or implementation changes.

Specs and tickets share the same `ref/work` bundle. Whole-bundle implementation records closure in validation/acceptance documents after fresh integrated verification and preserves the directory name. A ticketless or externally blocked bundle is not complete. Do not rewrite historical statuses or rename bundles during spec authoring.

Finish with the actual spec path, readiness, evidence, assumptions, and remaining blockers. Suggest `spec-tickets` when ready; do not invoke it without authorization.
