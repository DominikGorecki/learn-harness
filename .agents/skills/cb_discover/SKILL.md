---
name: cb-discover
description: Find relevant context and answer questions from a connected Context Bank using progressive disclosure. Use this skill when work is underway and you need related context, prior decisions, procedures, capabilities, or task-relevant information from the bank for a query, investigation, planning step, or execution task.
license: Apache-2.0
compatibility: Requires shell access, the cb CLI installed and configured, an active Context Bank repository, and a connected workspace that can inspect the bank through cb commands.
metadata:
  version: "1.0.0"
  category: "context-bank"
  tags: ["context-bank", "discovery", "retrieval", "progressive-disclosure", "search", "knowledge"]
---

# Context Bank Discovery

## Goal

Find the most relevant context in the Context Bank for the current task or question without reading the whole bank.

Use progressive disclosure. Use top level `INDEX.md` with `cb content read INDEX.md`. Then start from the nearest useful `INDEX.md`, narrow scope with directory inspection and globbing, then read only the files that are most likely to matter.

## When to use this skill

Use this skill when you need to:

- discover context related to work currently being done
- answer a question from the Context Bank
- find prior decisions, reference material, runbooks, workflows, tool guidance, or execution context
- identify which part of the bank is relevant before deeper work
- gather supporting context before planning, implementing, reviewing, or mutating bank content

Do **not** use this skill when the task is to change the bank itself. Use the mutation skill for add, update, or remove decisions.

## Core principles

1. **Start with the map.** Read `INDEX.md` before wandering.
2. **Discover progressively.** Use folder-level `INDEX.md` files to descend only where needed.
3. **Search before you skim broadly.** Prefer `ls` and `glob` to blind reading.
4. **Read for relevance, not completeness.** Pull in only the files needed to answer the current need.
5. **Prefer authoritative context.** Favor canonical files, indexes, and clearly designated guides over scattered mentions.
6. **Synthesize with provenance in mind.** Keep track of which files support the answer, and use `cb system info` when you need the current CLI installation's `name` and `id`.
7. **Stop when the answer is good enough.** Do not exhaustively traverse the bank unless the task truly requires it.

## Retrieval strategy

Use this sequence.

### 1. Verify the environment
Run:

```bash
cb --health
```

If this fails, stop and report that the Context Bank connection is not healthy.

If the task depends on identifying the current CLI installation, also run:

```bash
cb system info
```

Use this when the user asks which system is updating the bank, when you want the current installation's `name` and `id`, or when you need to compare the running system against commit provenance such as `system_name` and `system_id`.

### 2. Read the top-level map
Start here:

```bash
cb content read INDEX.md
```

Use the root index to understand the major sections, naming conventions, and likely locations for the requested context.

### 3. Form a retrieval hypothesis
Before reading more files, decide what kind of context you are looking for.

Typical buckets:

- **knowledge**: facts, definitions, architecture, reference material
- **operational**: policies, procedures, runbooks, team ways of working
- **capability**: tools, workflows, skills, templates, reusable methods
- **execution**: task-local notes, state, handoffs, temporary working context

Ask:

- What is the user really asking for?
- Which context type is most likely to contain the answer?
- Which folders are most likely to hold the canonical version?

### 4. Narrow scope with indexes and listings
Use directory listings to inspect one level at a time:

```bash
cb content ls
cb content ls <path>
cb content read <path>/INDEX.md
```

Read the next folder's `INDEX.md` before opening many files inside it.

### 5. Use glob when path is unknown
Use `glob` when:

- you do not know the exact folder
- the concept might appear in multiple places
- you need candidate files before deciding what to read
- the query is broad and needs fast narrowing

Examples:

```bash
cb content glob . "**/INDEX.md"
cb content glob . "**/*.md"
cb content glob <path> "**/*.md"
cb content glob . "**/*decision*.md"
cb content glob . "**/*policy*.md"
cb content glob . "**/*runbook*.md"
```

Treat `glob` as a candidate finder, not proof. Read the returned files selectively.

### 5a. Use grep when content matters, not just filename

Use `grep` when:

- you know a keyword or pattern the target file likely contains
- glob returns too many candidates to read selectively
- the filename alone cannot identify the relevant file

Examples:

```bash
cb content grep "deployment policy"
cb content grep "ADR-\d+" --path "**/*.md"
cb content grep "rollback" --path "operational/**"
```

Treat `grep` results the same as `glob` results: candidate file paths that still require selective reading to confirm relevance.

### 6. Read candidate files selectively
For each candidate, ask:

- Does this file appear canonical or incidental?
- Does the folder index point to it?
- Is it directly relevant to the query?
- Does it answer the question or just point somewhere else?

Then read only the most promising files:

```bash
cb content read <path>
```

If a file only partially answers the question, use it to refine the next search step rather than reading many unrelated files.

### 7. Synthesize and answer
Once you have enough evidence, answer using the bank's actual structure and contents.

Your answer should:

- name the most relevant files or folders
- distinguish authoritative context from supporting context
- summarize the result clearly
- note uncertainty when the bank is incomplete or ambiguous

## Query patterns

### Direct question
Example: “What is our deployment policy?”

Approach:
- read root `INDEX.md`
- identify likely operational folders
- read their `INDEX.md`
- use `glob` for terms like `policy`, `deploy`, `release` if needed
- read the most authoritative matching files

### Work-context discovery
Example: “I’m implementing X, what context from the bank might help?”

Approach:
- identify the work type: feature, bug, migration, review, strategy, onboarding, etc.
- search for architecture, patterns, runbooks, workflows, tools, and recent execution context that could constrain or guide the work
- return the most relevant files grouped by why they matter

### Topic exploration
Example: “Find everything relevant to model routing.”

Approach:
- start with likely folders from the indexes
- use `glob` for topic terms and synonyms
- read only the strongest candidates
- organize findings by context type or subtopic rather than dumping raw matches

### Unknown location
Example: “I think there was a guide on this somewhere.”

Approach:
- use `glob` broadly for likely keywords
- inspect nearby `INDEX.md` files for canonical placement
- prefer the file that the surrounding folder structure suggests is authoritative

## How to think about relevance

Rank likely sources in this order unless the bank structure suggests otherwise:

1. a folder `INDEX.md` that explicitly points to the canonical file
2. a clearly named canonical document in the expected context area
3. a capability or operational guide that directly addresses the task
4. execution context that is recent and task-specific
5. incidental mentions scattered across unrelated files

Prefer one strong source and two supporting sources over ten weak matches.

## Output expectations

When using this skill, produce a concise retrieval summary before or alongside the answer:

- **query:** what you looked for
- **likely context type:** knowledge | operational | capability | execution | mixed
- **searched areas:** folders or patterns inspected
- **key findings:** the most relevant files or conclusions
- **gaps:** what remains uncertain or was not found

If the user asked for related context rather than a single answer, group the findings by why they are useful.

Example grouping:

- **constraints:** policies, architecture, rules
- **how to do the work:** workflows, runbooks, capability guides
- **task-local state:** execution notes, handoffs, recent artifacts

## Stopping rule

Stop searching when one of these is true:

- you found the canonical answer
- you found enough context to move the work forward confidently
- additional files are likely redundant
- the bank does not appear to contain the requested information

Do not keep exploring just because more files exist.

## Anti-patterns

Avoid these mistakes:

- reading the entire bank from the top down
- opening many files before checking the relevant `INDEX.md`
- treating glob or grep matches as authoritative without reading them
- over-weighting execution context when the question calls for stable knowledge or operational guidance
- returning a raw list of file names with no synthesis
- inventing missing context when the bank is silent or ambiguous

## Escalation rule

If the structure is unclear, do not guess. Read the next relevant `INDEX.md`, inspect the folder with `cb content ls`, use `cb content glob` to find candidates by filename, or use `cb content grep` to find candidates by content when you know a keyword the target file is likely to contain.

If the bank appears incomplete and the task depends on missing information, say so plainly.

## Relationship to mutation

This skill is for finding and using context.

If discovery reveals that the bank is missing important durable context, contains stale guidance, or has misleading duplication, finish the retrieval task first and then hand off to the mutation skill if a bank change is needed.
