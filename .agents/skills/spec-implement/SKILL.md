---
name: spec-implement
description: Implement a complete Learning Studio ref/work bundle, reusing existing tickets or first creating them with spec-tickets, then using scoped subagents, dependency scheduling, individual ticket commits, and coordinator-owned Electron integration/acceptance evidence. Use when the user requests whole-spec implementation.
metadata:
  collection: "spec skills"
  version: "2.0.0-project.2"
  project: "edu-harness"
---

# Implement a spec bundle

Take a source spec or project bundle such as `ref/work/NN-<slug>/` through ticket preparation, implementation and final verification. Reuse existing tickets; when none belong to the source spec, create them with `spec-tickets` before scheduling workers. The primary agent coordinates workers, accepts changes, commits to the branch active at invocation, and verifies the complete implementation. Installing or reading this skill does not execute that workflow.

Invoking this skill authorizes necessary ticket creation through `spec-tickets`, subagent assignments, model selection within available capabilities, scoped implementation, and local commits. Continue through ticket preparation and the whole bundle without asking again for routine stage transitions or ticket commits. Other external actions follow the user's existing authorization.

Use `ref/work/NN-<slug>/`, `<slug>.spec.md`, and `<slug>.tNN.md`, preserving existing descriptive statuses and bundle names. Identify membership through stable ticket IDs and source-spec links, not file ordering. Do not move artifacts to `docs/work` or add `__DONE` by default. The `TNN-` local ticket-commit convention below applies unless the user or project specifies another one.

## Learning Studio coordinator contract

- Discover through `AGENTS.md`, `README.md`, `ref/patterns.md`, relevant focused patterns and `ref/ADRs/INDEX.md`. Load `.agents/skills/spec-implement-ticket/SKILL.md` for workers. Compare the source spec with `docs/overview.md`, PRD 01, current source/tests, accepted decisions and applicable acceptance records; historical plans can lag later decisions.
- Preserve core/shared/main/preload/renderer ownership and import boundaries, validated named IPC, sandboxing and context isolation. Main owns privileged lifecycle/adapters; renderer stays behind the typed bridge. Portable `.edu` state is separate from profile-owned credentials/locations.
- Preserve project/run identity, bounded material scope, cancellation, save retry and source files across tickets. Coordinate changes to shared contracts before dependent implementation; acceptance of one process layer does not prove a complete learner flow.
- UI tickets follow design system, UX, renderer and ADR-0007/ADR-0013, including actual Light/Dark, keyboard/focus and recovery evidence. Screenshots of references do not establish delivered UI.
- For affected code run `npm run check`; run `npm run test:desktop` for process/bridge/startup or user-flow changes. Follow packaging patterns for `npm run package`/`npm run test:packaged` when relevant. Verify the cumulative behavior after all ticket commits; individual test passes do not replace the final integration gate.
- Use the actual Windows PowerShell environment and separate exit-status checks. Record unavailable graphical sessions/services/credentials as unrun gates. Xvfb applies only to headless Linux. Distinguish native Windows/macOS/Linux, protocol fixtures, live-account use, packaging and manual visual evidence.
- The coordinator owns ticket status/completion records and shared `validation.md`/`acceptance.md`, staging, local commits and closure. Workers return evidence and exact files; they may edit shared records only under explicit file ownership. Preserve unrelated staged/unstaged/untracked work and recheck branch/HEAD before each commit.
- Preserve accepted decisions unless explicitly reconsidered. New durable changes include a numbered ADR plus both indexes and constrained focused patterns. Do not update the Context Bank to document local work.
- Close only after all mandatory spec acceptance gates and fresh integrated validation pass. A locally implemented ticket may retain a descriptive pending-external-gate status; treat that required gate as unresolved. Preserve the bundle directory and record closure in its validation/acceptance documents. Outline generation is not mastery and fixture success is not live inference.

## 1. Discover the bundle and baseline

1. Resolve the supplied spec or directory by project naming and source links. Read its spec, any existing tickets and validation/acceptance records fully. If stale, locate the same identity. Verify recorded closure against evidence before reporting completed work; do not reopen accepted scope unless the user requests it.
2. Read applicable agent instructions, documentation indexes, implementation/testing guidance, relevant focused patterns and architecture decisions, and the companion [spec-implement-ticket](../spec-implement-ticket/SKILL.md). Resolve an available project-local copy when the harness uses a different skill location. The companion is required for delegated ticket work; if missing, obtain it from this collection before assigning workers. Inspect the implementation, tests, and package boundaries that affect the tickets.
3. Record the named active branch, starting HEAD, staged/unstaged changes, untracked files, and any existing validation failures that matter. Preserve unrelated work. Do not change branches or reset the workspace to simplify the task.
4. Check that Git commits and subagent tools are available. Inspect the runtime's advertised models, reasoning settings, and concurrency limit. Use supported choices; do not claim a requested model was used if the runtime could not select it. Report an actual missing capability and the needed alternative if delegation or commits cannot proceed.

## 2. Reuse or create the tickets

1. Identify all tickets belonging to the resolved source spec by stable IDs and source links, including relocated tickets. Other specs' tickets in the same directory do not count. Inspect existing contents and lifecycle state before deciding tickets are absent.
2. If matching tickets exist, reuse them with their IDs, statuses, dependencies and completion evidence. Do not regenerate, overwrite, or renumber them. Validate their requirement coverage and readiness in the next section; a partial or blocked ticket set is not an empty one.
3. If no matching tickets exist, load the project-local [spec-tickets](../spec-tickets/SKILL.md) and follow its complete procedure and [ticket template](../spec-tickets/references/template.md) for the resolved spec. Ticket creation requires a ready source spec with bounded scope, concrete acceptance criteria and resolved blocking product decisions. Resolve material gaps from project evidence or a focused user decision; do not invent requirements to produce tickets. If the companion is unavailable, obtain it from this collection before proceeding.
4. Preserve the source slug and bundle path, and write the new tickets beside the spec using the project's conventions. Record every created file as coordinator-owned task work and include each ticket artifact in its eventual implementation commit. Inspect the generated tickets, requirement coverage, dependency references and validation paths before releasing any worker.
5. Continue directly into dependency validation and implementation under this invocation's authorization. The standalone `spec-tickets` stage's restriction on implementation/commits does not revoke the enclosing `spec-implement` authorization. Ticket-writing success alone does not complete this workflow.

## 3. Validate and schedule the dependency graph

1. Build a graph from each ticket's `Depends on` entries in its `Dependencies` section, resolving IDs, relative ticket links, and any explicit external prerequisites. `Unblocks` is a consistency hint, not another prerequisite list. Check unique ticket IDs, source-spec alignment, full requirement coverage, valid statuses, missing dependencies, cycles, and unresolved product blockers. Resolve structural errors or coverage gaps from source evidence or a focused user decision before scheduling affected work; preserve accepted tickets and do not rewrite dependencies merely to make a ticket ready. Never infer that a blocked prerequisite is satisfied from ticket numbering.
2. Treat a ticket marked completed (by default `Status: Done`) as a candidate completed dependency: verify its completion evidence, relevant implementation, and an existing commit reachable from the active branch. Reuse verified completed work. Reconcile missing evidence or uncommitted ticket work before releasing its dependents.
3. Produce a concise plan with ticket, prerequisites, difficulty, agent role, model, reasoning effort, likely file ownership, and validation. Read [model-routing.md](references/model-routing.md) for selection guidance. Explain each choice in one sentence.
4. Use a stable topological order, choosing the lowest ticket number, or stable local ticket ID when unnumbered, when several tickets are ready. A dependent becomes ready only after every prerequisite is accepted and committed on the active branch.
5. Use one mutating ticket worker at a time in a shared directory. Independent investigation and review agents may run concurrently. Parallel ticket implementations require independent graph nodes and isolated worktrees with clear ownership; integrate their full patches and new files serially, then validate on the active branch before committing. Respect the runtime's total agent limit, including the primary agent and reviewers.

Proceed with independent ready work while resolving a blocker elsewhere. Keep blocked tickets open and carry their exact remaining prerequisites in progress reports.

## 4. Delegate each ready ticket

Choose an agent role suited to the changed surface: domain/library, backend, frontend, CLI/packaging, data migration, infrastructure, or documentation. Spawn with the selected supported model and reasoning effort. If the runtime restricts model overrides for inherited context, use a supported fresh or bounded context handoff and provide the full contract below. Reuse an agent only when its model and role still fit; refresh its paths, branch revision, and dependency commits for the next ticket.

Every handoff must include:

- Working directory, active branch and current HEAD, exact spec/ticket paths, accepted decisions, and prerequisite commit IDs.
- The ticket outcome, acceptance criteria, relevant guidance and test commands, allowed files, existing user edits, and any shared-file conflicts.
- An explicit coordinator contract: follow `spec-implement-ticket` in delegated mode; implement this ticket only; return changes and evidence; the primary owns Git staging/commits, ticket statuses/completion records, shared validation/acceptance documents, and bundle closure. Do not create nested agents without the primary's assignment.
- Required return: all changed and new files, behavior delivered, tests and manual checks with outcomes, remaining concerns, process/resource cleanup, and a suggested `T##-<imperative message>` subject.

Workers send material questions and scope conflicts to the primary. Escalate the model or reassign the task when observed errors show that the chosen level is insufficient; give the replacement the current diff and failure evidence rather than restarting blindly.

## 5. Accept and commit one ticket at a time

For each worker result, the primary must:

1. Inspect the actual diff, including untracked files. Check the spec, dependency direction, tests, and every ticket acceptance criterion; a worker's completion message alone is insufficient.
2. Run or independently confirm the required ticket checks on the active branch with a stable working tree. Fix deficiencies directly or send a focused follow-up to the worker, then rerun the affected checks. Use the target project’s execution/dependency tools; validation comes from the ticket and current project guidance.
3. Update the ticket's existing completion format, preferably `## Completion evidence`, with outcome, actual worker/model/effort, dependency evidence and validation. Apply an accepted complete status only after its acceptance succeeds; retain descriptive remaining gates when incomplete. Record actual shared results in `validation.md`/`acceptance.md` and preserve the bundle name.
4. Verify the active branch and expected HEAD again. Reconcile any change outside the coordinator's recorded commits before writing a new commit; do not silently switch back or overwrite another actor's work. Select only this ticket's code, tests, documentation, and completion record for the commit. Preserve unrelated staged work with an explicit-path commit or equivalent selective method; never blanket-stage the repository or include unrelated hunks.
5. Commit with the exact subject shape `T##-<short imperative message>`, for example `T01-Implement validated configuration loading`. Inspect the resulting commit's files and record its SHA. Do not release dependents until the commit succeeds. Commit failures remain unfinished workflow work, even if the implementation checks passed.

Use the same sequence on resume. Consult completion records, code, and Git history to distinguish accepted/committed work from partial edits. Do not duplicate a completed ticket merely because the prior agent's working notes are unavailable.

## 6. Verify the whole implementation as the primary agent

After all ticket implementation commits are present, stop or wait for all mutating workers. The primary then performs a fresh review from the spec:

1. Map every functional requirement and acceptance criterion to the delivered code and verification evidence. Inspect the cumulative diff from the starting revision and interactions between tickets, not just individual reports.
2. Run the complete required gates for the surfaces changed across the bundle and the spec's manual, packaging, or cross-service checks. Follow the target project’s testing guidance and actual CI/package commands; deferred tooling is not a newly invented gate. Check docs, lockfiles, public commands/contracts, and retained safety limits as applicable.
3. Repair integration failures and spec gaps. Reopen an affected ticket when its acceptance no longer holds, add meaningful regression coverage, rerun the affected checks and necessary combined gates, and update its completion evidence. Commit follow-up repairs with the related `T##-<message>` prefix without rewriting previous ticket commits.
4. Use an additional agent for a focused review when the difficulty warrants it, but the primary must inspect the result, run the final checks, and own the acceptance decision. Resolve all required failures before claiming completion.
5. Update affected maintained guidance and follow the project’s architecture-decision workflow for a new durable decision when warranted. Use a local `adr` skill if available; do not require that skill in projects with another decision workflow. Stop processes and remove temporary resources started by this workflow, preserving pre-existing services and user files.

## 7. Record verification and close the bundle

1. Append `## Implementation verification` to the spec with the branch and starting revision, ticket/model/commit mapping, requirement evidence, final commands and outcomes, follow-up fixes, and material limits. Record existing commit SHAs; do not try to embed a commit's own future SHA in its contents.
2. Only after all ticket acceptance evidence and every mandatory whole-spec gate pass, record closure in `validation.md` and applicable `acceptance.md`. Keep the existing directory name and verify actual links. Missing external/live/native-platform evidence leaves the corresponding scope explicitly unresolved.
3. Commit the verification/closure records using `TNN-Verify <slug> and close work bundle`, with the last delivered ticket's actual number. This follows the individual implementation commits and is reported separately from repairs. Do not include unrelated changes.
4. Verify final branch/HEAD and worktree. A failed gate or commit leaves closure incomplete. Preserve unrelated baseline changes and report remaining task-owned work with the exact blocker.

Finish with delivered behavior, ticket/model assignments and commit SHAs, final verification results, the completed bundle path, and material limits. If blocked, state completed commits, open tickets, the exact blocker, and what would unlock it. Do not report a bundle complete from ticket statuses alone.
