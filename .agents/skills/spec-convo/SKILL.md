---
name: spec-convo
description: Discuss a proposed Learning Studio change through repository-grounded decisions, then prepare a readiness-gated brief for this project's spec skill. Use before writing a spec when product scope, Electron ownership, recovery behavior, or acceptance evidence needs discussion.
metadata:
  collection: "spec skills"
  version: "1.1.0-project.1"
  project: "edu-harness"
  category: "planning"
  tags: "spec,conversation,discovery,decision-tree,project-guidance"
---

# Spec conversation

## Learning Studio project contract

This is the project-local conversation stage for the TypeScript/Electron learning workspace. Explicit user instructions and `AGENTS.md` govern scope; the bank supplied this workflow, not implementation authority.

- Read `.agents/skills/spec/SKILL.md` for the downstream spec contract. Discover the project through `AGENTS.md` then `README.md`, `ref/patterns.md`, relevant focused patterns, and `ref/ADRs/INDEX.md`; open accepted decisions relevant to the proposed change.
- Compare the proposal with `docs/overview.md` and `ref/prds/01-project-setup-and-outline.md`. Consult actual source/tests and applicable `ref/work` acceptance/validation records before calling a feature implemented. Historical PRDs/specs can lag accepted decisions.
- For UI proposals, read design system, UX, and renderer patterns and ADR-0007/ADR-0013. Use the supplied ChatGPT Light/Dark direction; visual examples do not authorize new product capabilities.
- Identify affected owners among `src/core`, `src/shared`, `src/main`, `src/preload`, and `src/renderer`. Preserve sandboxing, context isolation, named validated IPC, portable `.edu` learning state, and profile-owned locations/credentials.
- Gather learner-visible behavior, failure/recovery states, cancellation/ownership, and evidence requirements. Outline generation does not establish mastery; protocol fixtures do not establish live-account success.
- Record future work destinations as `ref/work/NN-<slug>/`, with `<slug>.spec.md`, `<slug>.tNN.md`, `validation.md`, and `acceptance.md` where needed. This conversation itself writes none of them.
- Plan `npm run check` for code changes and `npm run test:desktop` for process/bridge/startup or user-flow changes. Record Windows/Linux/macOS and fixture/live-provider evidence separately. This Windows workspace uses PowerShell; Xvfb is only a headless Linux option.

Keep routine details inferable from project evidence out of the user's question queue. Carry proposed durable decisions into the brief for the spec stage's ADR plan; do not change ADRs during conversation.

## Goal

Reach shared understanding of a proposed project change before invoking the project's spec-writing skill.

Resolve material decisions in dependency order, verify factual claims against available project evidence, and produce a concise readiness-gated context brief. This skill does not write the spec, code, tickets, ADRs, or other durable project artifacts unless the user changes the task.

## Discovery Order

1. Find the project spec skill.
   - Prefer an explicitly provided skill path or skill mention.
   - Otherwise use this project's `.agents/skills/spec/SKILL.md`.
   - If multiple candidates exist, prefer the one closest to the active project root. Ask the user to choose only when the evidence remains genuinely ambiguous.
   - If no spec skill can be found, use available project planning instructions or a clearly labeled generic spec-preparation brief; ask only when a missing contract prevents a material decision.
2. Read the spec skill first.
   - Treat it as the primary source for the information this conversation must gather and the gate the eventual spec must satisfy.
   - Do not replace a project-specific contract with a generic template.
3. Read the smallest useful set of project guidance.
   - Start with the project guidance or pattern index named by the repository or spec skill.
   - Read focused pattern files, ADRs, architecture notes, and current repository surfaces only when they constrain the emerging idea or help ask a better next question.
   - Keep early inspection lightweight, but verify any factual claim that a material decision depends on.
4. If guidance is absent, state the gap and proceed with explicit bounded assumptions; ask for a reference only when its absence prevents a material decision.

## Decision-Tree Model

Treat discovery as a decision tree rather than a flat checklist.

1. Establish the destination: the desired outcome, affected user or operator, and the spec or decision this conversation should make possible.
2. Build a lightweight decision map in working state from the destination, the discovered spec contract, and project constraints.
3. Note dependencies between branches. A downstream question is not ready while its prerequisite remains unsettled.
4. Identify the current frontier: the material decisions that can be answered now without guessing about unresolved branches.
5. Ask from the frontier, incorporate the user's answer, and recompute the map. An answer may settle, split, reorder, or eliminate later branches.
6. Stop expanding when remaining branches are immaterial to an implementable spec, explicitly deferred to an owner, or outside the agreed scope.

Do not create a separate decision-map file during discovery. Capture the settled, deferred, and ruled-out branches in the final Spec Context Brief.

## Question Discipline

- Default to one high-value question per turn. Ask 2 or 3 only when they are independent frontier decisions that can be answered together without hidden dependencies.
- For every decision question, explain briefly why it matters, give a recommended answer, and identify the main tradeoff or consequence. Recommendations are advice; wait for the user's decision.
- Ask the user for product intent, preferences, authority, and decisions. Find environment and repository facts yourself through available files and tools.
- Use the harness's interactive choice tool for bounded decisions when available. Use normal chat when examples, prose, or nuance are needed.
- If an answer changes earlier scope or assumptions, surface that change and revisit the affected branch instead of continuing from a stale map.
- Record a deferred decision with its owner and the consequence of leaving it open. Do not silently choose it to make the brief look complete.
- Invoke the spec-writing workflow only when shared understanding is confirmed and the user has authorized that stage; reuse authorization already given.

## Evidence And Domain Discipline

- Keep verified facts, user-approved decisions, working assumptions, and open questions distinct.
- Check claims about current behavior against relevant guidance, code, tests, schemas, and observed behavior. If the evidence conflicts with the user's description, surface the contradiction and determine which source defines the intended state.
- Challenge vague or overloaded domain terms. Propose precise wording and test it against existing project language before treating it as canonical in the brief.
- Use concrete scenarios and edge cases when they reveal hidden boundaries, ownership, failure modes, data lifecycle, or authorization rules.
- Treat accepted project decisions as constraints unless the user explicitly wants to reconsider them. Make deviations and their consequences visible.
- Record possible documentation or ADR follow-up in the brief, but do not mutate those artifacts during discovery.

## What To Gather

Shape the decision tree around the discovered project spec skill. Most conversations need enough detail about:

- desired outcome and affected user or operator
- goals, non-goals, scope, and explicit exclusions
- workflows, inputs, sources, outputs, and failure behavior
- affected components and ownership boundaries
- data, API, UI, auth, infrastructure, migration, or transformation concerns as relevant
- developer workflow, validation, observability, and acceptance evidence
- security, privacy, portability, rollout, and operational constraints
- alternatives, material risks, contradictions, and unresolved decisions
- documentation, pattern, or ADR follow-up candidates

Adapt the branches to the project's domain. Do not interrogate every generic topic when the proposed change cannot affect it.

## Starting From Little Context

If the user provides no seed idea, ask up to three independent starter questions about:

- what the next project increment should accomplish
- which user, operator, or system is affected
- which project area, workflow, source, screen, API, dataset, or integration is involved

Offer compact choices for bounded decisions, but do not invent alternatives that project evidence has already ruled out.

## Handling Missing Guidance

If a missing planning reference leaves a material decision unresolved, ask for that reference and carry the blocker in the brief. Do not block ordinary conversation merely because an optional project document is absent.

If the user chooses to continue without project-specific guidance, label that limitation in `Assumptions`, `Evidence Consulted`, and `Readiness` rather than presenting generic guidance as project-approved.

## Progress And Stopping Rule

- Summarize settled decisions and the remaining frontier when the map changes materially, the user asks for status, or discovery is about to pause. Do not dump the full map after every answer.
- Discovery is complete when every material branch is settled, explicitly deferred with an owner and consequence, or ruled out of scope, and the user confirms the shared understanding.
- Discovery may pause on a blocker. Produce the brief with readiness `No` and identify the exact blocked branch.
- A clear proposal may finish quickly. Do not manufacture questions to prolong the interview; do not stop merely because the conversation has become long.

## Readiness Gate

Before proposing the spec handoff, verify that:

- the destination, affected user or operator, goals, and strict non-goals are explicit;
- the material decision tree has no silently assumed branch;
- likely affected surfaces and ownership boundaries are identified;
- validation expectations, acceptance evidence, and material risks are recorded;
- contradictions in consulted evidence are resolved or explicitly carried forward;
- every unresolved material decision has an owner and an implementation consequence;
- the user has confirmed the shared understanding.

## Spec Context Brief

When discovery is ready or must pause on a material blocker, produce:

```md
# Spec Context Brief: <title>

## Slug

<slug candidate>

## Summary

<desired outcome, affected user or operator, and why it matters>

## Goals

- <goal>

## Non-goals

- <strict non-goal>

## Proposed Workflow or Approach

- <behavior or data flow at the level currently agreed>

## Likely Affected Areas

- <surface, owner, and supporting project path>

## Validation Expectations

- <test, check, observation, or acceptance evidence>

## Assumptions

- <working assumption or None>

## Confirmed Decisions

- <user-approved decision and consequence or None>

## Decision Map

- Settled: <material branch and decision>
- Deferred: <branch, owner, and consequence or None>
- Ruled out: <branch and reason or None>

## Evidence Consulted

- <guidance, code, test, behavior, or other source>

## Contradictions and Follow-up

- Evidence conflict: <resolved conflict or None>
- Documentation or ADR candidate: <candidate or None>

## Open Questions

- <question, owner, and consequence or None>

## Readiness

- Ready for the project spec skill: <Yes or No>
- Remaining blocker: <blocker or None>
```

Honor existing authorization to hand off to the discovered `spec` workflow; otherwise propose that next stage using this brief. A conversation-only request remains read-only.

## Handoff Discipline

When the user confirms readiness, pass the actual Spec Context Brief, evidence paths, confirmed decisions, and unresolved branches to the project spec skill. The spec skill remains responsible for its full required reading, deeper repository inspection, durable artifact creation, and validation.

Do not substitute an informal chat summary for the brief, imply that deferred decisions were approved, or let the handoff erase contradictions and evidence gaps.
