---
name: investigate
description: Investigate a question about an existing software project through its governing guidance, maintained documentation, implementation, and tests. Use for behavior diagnosis, suspected regressions, design concerns, or proposed changes when the user wants evidence before deciding what to do. Do not use as a substitute for an authorized implementation task.
metadata:
  version: "1.0.0"
  category: "investigation"
---

# Investigate

## Goal

Turn a supplied project question into a concise, evidence-backed understanding of
the current behavior and the intended contract. Start with system-level context
and governing guidance before tracing implementation details. This skill is
read-only. If the user also authorizes a change, hand the findings to the
project's implementation workflow.

## Input

Accept a question about observed behavior, a file or symbol, a workflow, a test
failure, a design concern, or a proposed change. Treat supplied paths, excerpts,
logs, and suspected causes as leads rather than verified facts.

Ask one concise question only when the prompt cannot identify a safe investigation
scope. Otherwise state any necessary working assumption in the report and proceed.

## Investigation steps

1. Identify the question to answer, claims to verify, affected user or operator,
   and decision the findings should inform.
2. Record the available baseline. In a Git repository, note the branch, revision,
   and pre-existing staged, unstaged, and untracked files. In another environment,
   record the relevant version and pre-existing state. Preserve that state and do
   not attribute it to the issue without evidence.
3. Establish high-level context before opening implementation details. Read the
   project's agent or contributor instructions, relevant architecture or pattern
   guidance, accepted decision records, and maintained documentation. Follow the
   project's own authority order when one is defined. Select only documents that
   govern the apparent surface, and identify ownership and system boundaries.
   If guidance is absent, say so rather than inventing a policy.
4. Build a small map of entry points, main components, persisted or external
   boundaries, visible outcomes, and tests likely to provide behavioral evidence.
   Do not assume the proposed cause is correct.
5. Trace the relevant implementation in both directions: callers and inputs
   upstream; state changes, persistence, errors, retries, authorization, public
   API or UI outcomes, and consumers downstream. Follow only paths needed for
   the question.
6. Search related symbols, states, schemas, routes, configuration, maintained
   documentation, and tests. Treat tests as evidence of intended or observed
   behavior, and identify gaps relevant to the question.
7. Compare observed behavior with governing guidance. Separate verified facts,
   inferences, contradictions, and unresolved questions. State whether the
   suspected issue is confirmed, disproved, partially supported, or uncertain.
8. Recommend the smallest useful next step. Use the project's established
   discovery, planning, or implementation workflow where applicable. Do not
   create follow-on artifacts or start implementation during this investigation.

Useful read-only commands in a Git repository include:

```bash
git status --short
git branch --show-current
git rev-parse --short HEAD
rg -n '<symbol-or-state>' <relevant-paths>
git diff -- <path>
git log -S'<symbol-or-state>' --oneline -- <path>
```

Use history only when it materially clarifies current intent. Run a focused
test or local command only when reading cannot establish a necessary fact and
the command is safe for the investigation. Report the exact command, its result,
and any state it produced; distinguish an environment failure from an
application failure.

## Boundaries

- Do not edit code, tests, documentation, configuration, work artifacts, or
  repository state. Do not create a spec, ticket, decision record, plan file,
  or implementation patch.
- Do not deploy, mutate live data, send external messages, make external
  changes, or perform destructive actions. Consult read-only external sources
  only when the user requests them, project evidence requires them, or governing
  tool policy requires verification.
- Follow the project's privacy, security, authorization, and architecture
  rules. Do not expose credentials, personal data, private content, prompts,
  or sensitive persisted data in the report.
- Keep the investigation focused. Flag adjacent concerns as follow-ups instead
  of expanding into an unrelated review or redesign.

## Output

Return an `Investigation` report proportionate to the prompt:

```md
## Investigation

### Scope and conclusion

<question, relevant context, and direct answer or confidence>

### Verified findings

- <fact with a precise source path or other evidence>

### Analysis

- <how the relevant flow and governing guidance explain the finding>

### Uncertainty, contradictions, and limits

- <unverified inference, conflict, missing evidence, or None>

### Recommended next step

- <None, focused follow-up, or the applicable project workflow>
```

For a simple question, keep these distinctions in a shorter report. Do not
claim a diagnosis, regression, or policy conflict without direct evidence.
