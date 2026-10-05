---
name: spec-implement-ticket
description: Implement one ready Learning Studio ticket under ref/work, preserving Electron boundaries and running the required code/desktop checks. Use for a named ticket, standalone or as a worker delegated by spec-implement.
metadata:
  collection: "spec skills"
  version: "2.0.0-project.1"
  project: "edu-harness"
---

# Implement a spec ticket

Complete exactly one named implementation ticket. Use the existing `ref/work/NN-<slug>/<slug>.tNN.md` identity and linked `<slug>.spec.md`. Preserve the bundle name and descriptive statuses. Do not create a `docs/work` wrapper, add `__DONE`, or treat a status line as proof of acceptance.

## Learning Studio execution contract

- Read `AGENTS.md`, `README.md`, the pattern/ADR indexes, relevant focused rules/accepted decisions, and the ticket/spec. Respect the product scope in `docs/overview.md` and PRD 01 while checking actual source/tests and current acceptance/validation records. Later accepted decisions can supersede historical plans.
- Preserve unrelated working-tree changes. Core owns learning behavior and ports; shared owns serializable contracts and request validation; main owns Electron/Node lifecycle, privileged adapters and authorization; preload exposes named methods; renderer uses React and the typed bridge. Keep forbidden imports, context isolation and sandboxing protected.
- Educational state stays portable in `.edu`; application-profile storage owns recent locations and protected credentials. Preserve source files, validate sender and mutation payloads, and maintain project/run identity through cancellation, late responses and save retries.
- For UI work, read design system, UX, renderer and ADR-0007/ADR-0013 first. Honor ChatGPT Light/Dark, focus/keyboard/recovery requirements, and actual visual evidence. Draft examples do not expand feature scope.
- Run `npm run check` for code changes; also run `npm run test:desktop` for process/bridge/startup or user-flow changes. Add focused unit/desktop regressions when meaningful. Do not create redundant tests for low-impact prose/cosmetic edits or weaken security for test startup. Packaging/runtime changes may also require `npm run package` then `npm run test:packaged` under the relevant patterns.
- Use Windows PowerShell here and inspect each check's exit status. Headless Linux uses Xvfb for desktop tests; a graphical/session restriction is an unrun gate. Claim a failure predates the ticket only with baseline evidence. Clean up only task-owned processes/files.
- In standalone mode, record actual commands/outcomes in the bundle's `validation.md`, preserve any existing `## Completion evidence` section, and update applicable `acceptance.md` requirements. State remaining live-account/native-platform/manual gates separately. Fixture success is not live inference; outline creation is not mastery.
- In delegated mode, the coordinator owns ticket statuses, completion records, shared `validation.md`/`acceptance.md`, staging, commits and bundle closure. Return exact changed/new files and evidence; do not mutate those shared records unless the coordinator explicitly assigns them.
- For a durable decision, implement its numbered ADR plus ADR-index, pattern-index and constrained focused-pattern updates together. Routine work within accepted boundaries needs no new ADR. Do not write to the bank for local changes.

## Procedure

When delegated by `spec-implement`, implement and validate the assigned ticket under the coordinator's file ownership and branch instructions, then return the full changed/new-file list and evidence. The primary agent owns staging, commits, `Status` and `Completion` edits, and bundle renaming; skip the standalone lifecycle actions below. Send material scope conflicts to the coordinator.

1. Read the ticket and linked source spec, then applicable agent instructions, documentation indexes, focused guidance and architecture decisions. Check that dependencies are complete and inspect the current code and worktree. If the supplied path is stale, locate the same artifact identity before editing; do not implement a ticket already marked `Status: Done`.
2. Implement the ticket within its scope. Follow the target project’s actual package ownership and dependency direction; keep reusable behavior separate from adapters where its architecture defines that boundary. Change adjacent files only when required for the ticket to work.
3. Add meaningful automated coverage at the layer where behavior can fail. If a ticket explicitly has no automated test, record why.
4. Run the ticket’s checks and all project-defined gates for every changed surface using its package manager and tooling. For changes spanning services or consumers, verify their interaction where required. If no validation standard exists, state and run a reasonable minimal set. Report unrelated baseline failures separately. Clean up only processes/resources started for this task. Fix failures caused by the ticket; identify unrelated pre-existing failures separately.
5. Recheck acceptance criteria and manual verification. Update focused patterns and ADR references if this work establishes or changes a durable rule. In standalone mode, once this ticket is fully accepted and validated, update its existing completion section or add `## Completion evidence`, then apply the project's accepted complete status. Preserve descriptive remaining gates and leave the required scope unresolved when incomplete. In delegated mode, return evidence for the coordinator's acceptance decision.
6. In standalone mode, inspect the bundle's other tickets before reporting overall state. Close only with at least one ticket, accepted evidence for every ticket, fresh integrated validation, and all mandatory spec acceptance gates satisfied. Record closure or remaining gates in `validation.md`/`acceptance.md` and preserve the folder name. Do not infer completion from ticket numbering or locally passing fixtures. In delegated mode, the coordinator alone makes this decision.

Finish with changed behavior, actual tests/commands and outcomes, ticket/bundle state, remaining gates, and a suggested message beginning `tNN:` in standalone mode or `TNN-` in delegated mode, using the real ticket ID. Do not commit unless the user or established project workflow authorizes it; delegated workers leave commits to the coordinator. Preserve the existing completion/status format and leave required work explicitly unresolved.
