# Assign models to tickets

Use the runtime's advertised models, reasoning settings, delegation API, and concurrency limits as authority. Honor explicit user model, cost, or latency constraints. No particular vendor, model ID, or tool parameter is a portable requirement.

For this project, choose expertise around actual responsibility: learning/domain ports in `src/core`, contracts/validation in `src/shared`, Electron lifecycle and privileged adapters in `src/main`, capability bridging in `src/preload`, React/Light-Dark interaction in `src/renderer`, and native packaging/test evidence. IPC authorization, account credentials, cancellation, save ownership and multi-process regressions merit stronger reasoning when uncertain. Documentation-only or well-defined presentation changes can use a lighter assignment. Runtime capability, not the application's learner model picker, determines worker models.

Use one mutating worker at a time in the shared project tree. Parallel implementations need isolated worktrees and serial integration. The coordinator retains ticket lifecycle records, shared validation/acceptance ledgers, and commits. Respect the advertised total concurrency, counting the coordinator and reviewers.

| Difficulty | Typical work | Starting assignment |
| --- | --- | --- |
| Routine | Bounded docs/configuration changes, clear existing-pattern edits | Efficient available model; low or medium supported effort |
| Standard | Features, API/CLI/UI behavior, packaging, regression coverage with clear contracts | General implementation model; medium supported effort |
| Difficult | Coupled boundaries, concurrency, lifecycle/recovery, migrations, authorization, demanding debugging | Strong reasoning model; high supported effort |
| Persistent difficult failures | Concrete evidence that the earlier assignment missed required behavior | Higher supported capability or effort, justified by the observed failure |

Assess uncertainty, novelty, interacting components, hidden state, reversibility, and how readily verification can establish correctness. Ticket size alone is insufficient. Select expertise separately from model tier: a domain, backend, frontend, data, packaging, or documentation worker can use any appropriate supported model.

Give a one-sentence assignment rationale. Match focused reviewer capability to the risk. The primary remains responsible for actual diff review, integrated checks and acceptance.

If explicit model overrides require a fresh or bounded context fork, supply the full handoff contract from `SKILL.md`. If overrides are unsupported, report the actual inherited model/effort and use it only when compatible with the user's constraints. Never claim an unselectable model was used, invent model IDs or API fields, change global configuration, or silently substitute a constrained choice.

Escalate from actual error evidence rather than defaulting every task to the strongest model. Preserve the current diff and failed checks for a replacement worker. Recheck availability on each run; runtime catalogs evolve.
