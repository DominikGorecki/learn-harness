---
name: spec-slice
description: Divide a substantial Learning Studio request into observable learner or developer capabilities, then write linked project specs under ref/work. Use when several outcomes need a coverage plan, explicit dependencies, and separate specs before tickets or implementation.
metadata:
  collection: "spec skills"
  version: "2.0.0-project.1"
  project: "edu-harness"
---

# Spec Slice

Turn a substantial request into a linked set of implementable specs. A slice delivers an observable capability through the components it needs. Choose the fewest useful slices that preserve correct behavior.

## Learning Studio project contract

- Follow `AGENTS.md`, `README.md`, `ref/patterns.md`, relevant focused patterns, and accepted ADRs through `ref/ADRs/INDEX.md`. Use `.agents/skills/spec/SKILL.md` and its project template for every ready slice.
- Ground product scope in `docs/overview.md` and PRD 01, then verify behavior through source, tests, and applicable `ref/work` acceptance/validation records. Future tutoring, research, lesson authoring, or mastery tracking is not authorized merely because it appears in a product vision.
- Store the coordination plan at `ref/work/<task-slug>.slices.md` and specs at `ref/work/NN-<slice-slug>/<slice-slug>.spec.md`, unless the user selects another destination. Allocate one fresh number per ready spec across all existing bundle names; preserve existing paths and statuses. Keep completed bundles named as they are; do not add `__DONE` by default.
- Slice by observable outcomes such as opening a learning project, saving educational state, or recovering a cancelled operation. Include each outcome's necessary core/shared/main/preload/renderer behavior together rather than creating one spec per process layer. Keep cancellation, project identity, scoped reads/writes, and save ownership coherent.
- Preserve Electron sandboxing/context isolation and validated named IPC. `.edu` contains portable learning metadata; application-profile storage owns locations and credentials. Source material is preserved, fixtures are not live-provider evidence, and outlines are not mastery.
- For UI slices, read design system, UX, and renderer guidance and ADR-0007/ADR-0013. Plan actual Light/Dark, keyboard/focus, error/recovery, and visual evidence as relevant.
- Every slice carries its code gate (`npm run check`) and desktop gate (`npm run test:desktop` for process/bridge/startup or user-flow changes), with manual/live/native-platform evidence distinguished. Use Windows PowerShell locally; Xvfb applies only to headless Linux.
- Record needed durable decisions and coordinated ADR/index/pattern updates in the appropriate spec. Planning preserves accepted rules and does not change runtime code or the bank.

## Inputs, outputs, and authority

Input: a task or research file, or a substantial user request, plus the target project and any stated scope constraints.

Outputs:

- A coordination plan with source coverage, slice boundaries, dependencies, decisions, blockers, and actual spec links.
- One complete, reviewed implementation spec per ready slice within the requested scope.
- Explicit questions and affected slices where a material choice or evidence dependency prevents a complete spec.

By default, invocation authorizes the plan and slice specs. Ticket creation, implementation, and commits require separate authorization. Honor an explicit plan-only request.

Use the target project's documentation layout, architecture, spec template, naming, completion conventions, and quality gates. Discover these from project instructions and existing artifacts; do not impose a language, framework, directory structure, or universal API/web/persistence stack.

## 1. Ground the task and discover the project workflow

1. Read the supplied input in full. Establish the target workspace, revision and working-tree context when version control is available, and existing planning artifacts. Preserve unrelated work.
2. Read applicable agent instructions, documentation indexes, relevant focused guidance and architecture decisions when present. Inspect current code, tests, contracts, schemas, and user or consumer surfaces that constrain the task. Use the project's equivalents rather than assuming specific documentation paths. If guidance is missing, record that gap and bounded assumptions; ask only when it leaves a material decision unresolved.
3. Discover the project's spec-writing skill or workflow and load its instructions. Prefer a project-local workflow over a generic skill. Use an available portable `spec` skill when suitable, applying the target project's conventions. If none is available, use [standalone spec writing](references/spec-writing.md); do not require installation of another skill.
4. Apply the project artifact contract above and record actual plan/spec destinations. Inspect collisions before writing and choose a distinct slug rather than overwriting unrelated work. Honor explicit user destinations.
5. Check delivered behavior before marking an outcome already covered. A written spec, closed ticket, or completed-folder marker alone is insufficient evidence. Reuse relevant implemented contracts and record gaps that require extensions.
6. Identify the person, system, or consumer that benefits, their workflow, and the requested observable outcomes. Separate accepted requirements, research recommendations, implemented facts, proposed contracts, bounded design assumptions, and unresolved choices. A recommendation in a research document is not automatically an accepted product or architecture decision.
7. Ask only about material choices the project evidence and user context cannot settle. Explain which outcomes depend on each answer. Continue independent planning and ready specs while waiting; retain dependent work as blocked when an answer is required.

## 2. Define coherent vertical slices

For each candidate, state who can do or learn what after delivery. Include the minimal behavior, adapters, data, and presentation needed to demonstrate that outcome within the project's ownership boundaries. A library call, CLI, batch result, hardware interaction, or document artifact can be a complete surface; every slice does not need a UI or service.

- Split by workflow step, supported variant, business rule, or increasing capability where that yields observable value. Reduce breadth while retaining the rules that give the result a coherent meaning.
- Keep coupled invariants together. Resources, authority, timing, information access, and state transitions that determine the same result need a coherent contract in the slice or a declared prerequisite.
- Treat a technical enabler as an explicit exception: justify its consumer, observable contract, and validation. Do not turn source chapter headings or a module list into a layer-by-layer roadmap.
- Include ordinary, boundary, and failure examples for every slice. Distinguish verifying implementation behavior from obtaining evidence for a domain or performance claim.
- Make important uncertainty visible. A bounded experimental capability can be specified with declared assumptions and limits; a later capability that depends on an unknown experimental result remains provisional.

For difficult boundaries, coupled rules, or research-heavy inputs, consult [slicing guidance](references/slicing.md).

## 3. Record coverage, readiness, and dependencies

Write or update the coordination plan before generating specs. Preserve existing slice IDs and unrelated content when resuming. Use a short task slug and keep separate tasks in separate plans.

The plan contains:

- Source paths or request identifiers and relevant sections; observed project revision and working-tree context when available; accepted scope, decisions, assumptions, and questions.
- A coverage table mapping every requested outcome to a slice, verified existing capability, explicit user exclusion, or blocked work. Retain the wider vision without turning unresolved future behavior into settled requirements.
- Stable slice IDs such as `S01`, with outcome, inclusions, strict exclusions, prerequisite IDs or existing contracts, readiness, and actual spec paths once available.
- A dependency graph or adjacency list, an order consistent with it, and concise per-slice briefs for spec writing.
- The chosen spec-writing workflow, artifact layout, and applicable naming, lifecycle, and verification conventions.

Use planning states `Ready`, `Specified`, `Blocked`, `Covered`, and `Excluded`. `Specified` means a spec was written and reviewed; it says nothing about implementation. `Covered` requires evidence of current behavior. `Excluded` requires an explicit user scope boundary. Keep these planning states separate from the project's implementation statuses.

Dependencies describe prerequisites between capabilities, not implementation tickets. Remove speculative ordering. Resolve cycles by revising contracts, merging coupled slices, or extracting a justified enabler. Every referenced slice ID must exist. Distinguish implemented contracts from proposed contracts in prerequisite specs.

A slice is ready when its outcome, boundary, inputs, outputs, invariants, required decisions, and verification can be stated without inventing a material answer. A defined proposed upstream contract can support a downstream spec; an unknown upstream research result cannot be treated as delivered evidence. Record each blocker, its affected slices, and the decision or evidence needed to clear it.

## 4. Write a complete spec for every ready slice

Process slices sequentially in dependency order. Apply the loaded spec-writing workflow, including its writing and review procedure, or the standalone guidance. A brief is not a replacement spec. Do not ask the user to invoke a second skill separately for each ready slice.

Give each spec-writing application this bounded input:

1. Original task path or request, relevant source sections, coordination plan, and stable slice ID.
2. Beneficiary and observable outcome, inclusions, strict exclusions, and acceptance examples.
3. Accepted decisions, labeled assumptions, open questions, and permitted claim level where relevant.
4. Existing code and contracts, relevant project guidance and decisions, and prerequisite spec links with the consumed interfaces and their implemented or proposed status.
5. Required invariants, failures, affected surfaces, validation, and conditions that would require revising the slice.

Follow the target project's artifact allocation rules. Reinspect active and completed artifacts before each new spec. If it uses numbered bundles, account for both active and completed numbers and allocate one fresh bundle at a time. Do not reserve a number block, reuse completed work for added scope, or run concurrent writers against a shared allocation directory.

In each spec, link back to the plan and source when a source file exists; otherwise identify the originating request. Identify prerequisite capabilities and make consumed interfaces and assumptions explicit. Review the spec before recording its actual path and changing the slice to `Specified`. Preserve all applicable sections required by the project's spec workflow.

Generate all ready specs within the requested scope. When an answer arrives or an upstream contract is clarified, re-evaluate affected slices and continue. If material blockers remain, retain them in the plan and report partial completion accurately.

On resume, verify that existing specs still match the task, decisions, and dependencies. Reuse matching artifacts; update active specs only where required and preserve unrelated edits. Follow the project's completed-artifact rules. Added implementation scope normally needs a new artifact or explicitly authorized reopening; editorial corrections follow local policy. Refresh plan links when artifacts move or are archived.

## 5. Review the complete set

Check source coverage, useful boundaries, acyclic dependencies, compatible shared contracts, explicit assumptions, and verification for every requirement. Downstream specs must not rely on excluded features or present proposed dependencies as implemented facts. Resolve overlapping ownership and conflicting acceptance examples across specs.

Verify actual links, naming and numbering where applicable, lifecycle markers, and the absence of tickets generated by this planning workflow. Keep shared contracts consistent with existing ownership and quality guidance. Spec writing does not itself change maintained architecture rules; include needed documentation or decision-record work in the appropriate specs.

Report the plan path, created or updated specs, dependency order, reused capabilities with evidence, and remaining blockers. Suggest the project's available ticket-generation workflow, or `spec-tickets` from this collection, as the next stage when applicable; do not invoke it without authorization.
