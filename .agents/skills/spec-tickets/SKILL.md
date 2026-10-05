---
name: spec-tickets
description: Turn a ready Learning Studio spec into dependency-aware tickets beside it in ref/work, with Electron ownership, requirement coverage, and project validation gates. Use for ticket authoring before implementation.
metadata:
  collection: "spec skills"
  version: "2.0.0-project.1"
  project: "edu-harness"
---

# Spec tickets

Turn one ready spec into the fewest coherent tickets that can be implemented and accepted one at a time; aim for 1–8 unless the source justifies more. Invocation authorizes ticket artifacts, not implementation or commits.

## Learning Studio project contract

- Read the supplied spec and `.agents/skills/spec/SKILL.md`, then `AGENTS.md`, `README.md`, the pattern/ADR indexes and relevant focused guidance/accepted decisions. Check product scope against `docs/overview.md`, PRD 01, and current source/tests; a historical spec does not override later accepted decisions.
- Keep tickets at `ref/work/NN-<slug>/<slug>.tNN.md`, beside `<slug>.spec.md`. Preserve bundle names, source slugs, descriptive statuses, and stable ticket IDs. New tickets start `Status: Open`; do not move work to `docs/work` or add `__DONE` by default.
- Specify responsibilities across `src/core`, `src/shared`, `src/main`, `src/preload`, and `src/renderer` while respecting the import boundaries in `AGENTS.md`. Keep named IPC validation, sandboxing, credential secrecy, profile storage, and portable `.edu` state intact.
- A ticket spanning a user flow must cover its required process contracts, error/recovery behavior, and cancellation/save ownership. Do not postpone essential security or tests to a final catch-all ticket.
- For UI work, include relevant design system, UX, renderer, and ADR-0007/ADR-0013 constraints, with Light/Dark and keyboard/focus evidence. Draft screenshot examples do not authorize new features.
- Plan `npm run check` for code changes and `npm run test:desktop` for process/bridge/startup or user-flow changes; add focused `tests/unit`/`tests/desktop` cases or a justified no-new-test exception for low-impact prose/presentation changes. Identify needed manual, live-account, packaging, and native-platform evidence separately.
- Track actual command/results in bundle `validation.md` and milestone requirement evidence in `acceptance.md` when needed. Separate locally implemented work from remaining external acceptance; neither fixtures nor an outline establish live inference or mastery.
- Include necessary ADR/index/pattern maintenance for a new durable decision. This ticket-writing stage proposes that work without changing accepted guidance, implementing code, committing, or writing to the Context Bank.

## Procedure

1. Read the named spec fully. Infer a target only from one unambiguous active candidate. Locate moved artifacts using their stable identity. Do not add work to a completed artifact unless the user reopens it under the project's lifecycle; added scope usually needs a new spec.
2. Read applicable agent instructions, documentation indexes, focused patterns and relevant architecture decisions. Inspect actual code, tests, ownership, interfaces, and validation commands. Use the target project's boundaries, language, tooling, work layout, status and completion conventions.
3. Split by meaningful observable outcome and dependency, including migrations, public contracts, rollout risk, or shared invariants where relevant. Give each ticket its own automated or otherwise justified verification. Avoid copied spec headings, circular dependencies, and a final catch-all testing ticket.
4. Write tickets alongside the source spec unless local rules specify another location. Preserve its slug. If no convention exists, use `<slug>.t01.md`, `<slug>.t02.md`, etc., with dense initial numbering. Inspect existing tickets before writing; preserve accepted work, append only when requested, and never overwrite unrelated work or silently renumber ticket identities.
5. Use the local stronger template when present, otherwise [the ticket template](references/template.md). By default start with the heading and exact `Status: Open` line. Include source links, goal, strict scope, concrete implementation steps, ownership/patterns, automated tests or a justified exception, acceptance criteria, manual verification, requirements covered, assumptions and blockers.
6. In `Dependencies`, give explicit `Depends on` IDs or links and external prerequisites; `Unblocks` is only a consistency hint. Use unique IDs and a stable topological order. All references must resolve; no ticket can silently assume a blocked product choice or unspecified upstream contract.
7. Map every spec requirement to the ticket set without unnecessary duplication. Verify acyclic dependencies, compatible shared contracts, each ticket's validation path, actual relative links, and active lifecycle state. Reserve Done for acceptance with completion evidence.

Follow the `ref/work` bundle rules above. The bundle remains incomplete while tickets, relevant prerequisites, or mandatory acceptance gates are unresolved. `spec-implement` owns fresh whole-spec verification and evidence-based closure; statuses alone do not prove completion.

Finish with ticket paths, dependencies, requirement coverage, and blockers. Suggest `spec-implement` for the whole bundle or `spec-implement-ticket` for a named ticket as separately authorized next stages.
