---
name: cb-evolve
description: Decide whether Context Bank content should be added, updated, removed, or left unchanged, then inspect the bank progressively with the cb CLI and apply exactly one file mutation at a time. Use when an agent is working in a connected Context Bank workspace and needs to maintain long-lived context without polluting it.
license: Apache-2.0
compatibility: Requires shell access, the cb CLI installed and configured, an active Context Bank repository, and an open project folder whose root contains `.cbx` for mutations.
metadata:
  version: "1.0.0"
  category: "context-bank"
  tags: ["context-bank", "memory", "governance", "mutation", "progressive-disclosure"]
---

# Context Bank Mutation

## Goal

Change the Context Bank only when doing so improves future retrieval and decision quality.

Do **not** treat the bank like a scratchpad. Prefer temporary reasoning in execution state. Promote information into long-lived context only when it is durable, reusable, and better than the current stored state.

## Core principles

1. **Discover progressively.** Start from the root `INDEX.md` using `cb content read INDEX.md`. Read only as much as needed.
2. **Classify before changing.** Decide whether the candidate belongs in `knowledge`, `operational`, `capability`, or `execution` context.
3. **Prefer precision over accumulation.** Store less, but store better.
4. **Prefer update over duplication.** If the same concept already exists, revise the authoritative file instead of adding a near-duplicate.
5. **Prefer deprecation or correction over silent drift.** Remove only when the file is truly obsolete or harmful if retained.
6. **Mutate one file at a time.** Never batch writes, edits, or removals.
7. **Record intent clearly.** Every mutation must include accurate `reason`, `trigger`, and `impact` metadata, and you can inspect the current updater identity with `cb system info`.

## When to use this skill

Use this skill when you need to decide whether Context Bank content should be:

- **added** because durable information is missing
- **updated** because an existing record is stale or incomplete
- **removed** because it is obsolete, misleading, or superseded
- **left unchanged** because the information is temporary, weak, redundant, speculative, or not worth long-term storage

Do **not** use this skill for ordinary task reasoning that belongs only in short-lived working memory.

## Decision standard

Only change the bank when the proposed new state is more useful, more true, and more governable than leaving it alone.

Use this test:

- **Truth:** Is the information well-supported?
- **Durability:** Will it likely matter again beyond the current task?
- **Reusability:** Will future agents benefit from retrieving it?
- **Specificity:** Is there a clear canonical place for it?
- **Non-duplication:** Does it improve or replace existing context rather than echo it?
- **Governance:** Can you justify the mutation in provenance metadata?

If the answer is weak or uncertain, do not mutate long-lived context.

## Context type rules

### `knowledge`
Use for durable facts, reference material, definitions, architecture records, and canonical documentation.

Choose this when the information is relatively stable and should be retrieved as truth-bearing context.

### `operational`
Use for policies, procedures, runbooks, heuristics, workflows, and how-the-team-works guidance.

Choose this when the information describes norms, rules, or repeated ways of operating.

### `capability`
Use for tool usage, reusable workflows, scripts, templates, prompt patterns, and instructions that help agents perform work.

Choose this when the information is a portable way of doing something.

### `execution`
Use for task-local notes, temporary state, working assumptions, handoffs, and runtime context.

Choose this by default when the information is likely to expire soon or only matters for the current task.

## Mutation rules

### Add
Add a new file when all of the following are true:

- the information is durable enough to keep
- no authoritative file already covers the same concept
- a new standalone record is clearer than forcing the content into an unrelated file

### Update
Update an existing file when all of the following are true:

- the concept already exists
- the stored version is stale, incomplete, or incorrect
- editing the authoritative file is better than creating a duplicate

### Remove
Remove a file only when all of the following are true:

- the file is obsolete, misleading, or harmful if retrieved
- its value is not primarily historical
- updating or deprecating in place would be worse than removing it

When history matters, prefer updating the file to clearly mark it as deprecated or superseded instead of deleting it.

### Do nothing
Choose no mutation when the information is:

- ephemeral
- speculative
- duplicated elsewhere
- too weakly supported
- not useful for future retrieval
- better kept in execution context only

## Discovery workflow

### 1. Verify the environment
Run:

```bash
cb --health
```

If the health check fails, stop and report the issue.

When provenance matters for the mutation, also run:

```bash
cb system info
```

Use this to inspect the current CLI installation's `name` and `id`. If the user wants a more human-friendly installation name before mutating, set it with:

```bash
cb system name <new-name>
```

### 2. Start from the nearest index
Read the top-level map first:

```bash
cb content read INDEX.md
```

Then inspect the next relevant folder using its local `INDEX.md` rather than reading many files blindly.

Useful commands:

```bash
cb content ls
cb content ls <path>
cb content read <path>/INDEX.md
cb content glob . "**/INDEX.md"
cb content glob <path> "**/*.md"
```

### 3. Narrow the search before reading deeply
Use `ls` to inspect one directory level at a time. Use `glob` when:

- you do not know the exact file path
- the concept may exist in multiple places
- you need candidate files before deciding which ones to read

Useful commands:

```bash
cb content ls
cb content ls <path>
cb content read <path>/INDEX.md
cb content glob . "**/INDEX.md"
cb content glob <path> "**/*.md"
cb content grep "<keyword>" --path "**/*.md"
```

Use `grep` when you know a keyword the authoritative file is likely to contain and `glob` has returned too many candidates.

Do not read large numbers of files without first using the indexes and directory listings to narrow scope.

### 4. Find the authoritative file
Before mutating, determine whether there is already a canonical file for the concept.

Look for signs such as:

- the folder index points to a specific file as canonical
- nearby files cover the same concept
- the concept clearly belongs inside an existing document rather than a new file

If an authoritative file exists, prefer `edit` over `write`.

## Mutation workflow

### 1. Decide the action
Choose exactly one of:

- no change
- write one new file
- edit one existing file
- remove one existing file

### 2. Identify the authority path
Mutating commands require an absolute `authority` path that contains the `.cbx` directory.

Use the root of the open project folder, not a guessed or derived alternate path.

In code harnesses, agents run with a specific folder open. For mutations, `authority`
should simply be the absolute path of that folder root.

The normal rule is:

- change to the root of the open folder if needed
- run `pwd`
- use that exact absolute path as `authority`

Do not invent labels, parent paths, or alternate workspace paths. If the open
folder root is correct, its `pwd` is the authority value to pass.

### 3. Perform exactly one file mutation

The CLI automatically records the current installation as `system_name` and `system_id` in mutation provenance. Use `cb system info` when you need to see which installation will be attached to the change before you write, edit, mkdir, or remove content.

`cb content write` remains text-only. Use it for Markdown and other UTF-8 text files. When the durable artifact is an image or other binary file, use `cb content file up` instead of trying to force that asset through `write`.

#### Cross-platform mutation pattern

The shell examples below are conceptual. The most reliable way to run
`cb content write`, `edit`, `mkdir`, `rm`, or `content file up/down` across Linux, Windows, and WSL is:

1. build the full payload as a real data structure in code
2. serialize it once with a JSON encoder such as `json.dumps(...)`
3. write that JSON into a temporary UTF-8 JSON file
4. invoke `cb content ... --file <payload.json>`

Prefer that pattern over ad hoc shell one-liners with nested quotes or giant
inline JSON arguments. It avoids:

- PowerShell or `cmd` splitting the JSON into multiple arguments
- broken escaping of inner quotes
- invisible encoding issues such as UTF-8 BOM causing parse failures near line 1

If a subprocess cannot find `cb`, use the explicit launcher path that works in
that environment instead of assuming `PATH` is the same as your interactive shell.

Portable example:

```python
import json
import subprocess
import tempfile
from pathlib import Path

payload = {
    "path": "03-capability-context/tools/example.md",
    "content": "# Example\n",
    "context_type": "capability",
    "reason": "record a reusable workflow",
    "trigger": "validated implementation work",
    "impact": "future agents can retrieve the pattern",
    "authority": "/absolute/path/to/open-folder-root",
}

with tempfile.TemporaryDirectory() as tmp_dir:
    payload_path = Path(tmp_dir) / "content-write.json"
    payload_path.write_text(json.dumps(payload), encoding="utf-8")
    subprocess.run(
        ["/absolute/path/to/cb", "content", "write", "--file", str(payload_path)],
        check=True,
    )
```

Treat `cb content ...` like a small API:

- construct valid JSON in code
- write it to a temporary JSON file
- pass that file with `--file`
- set `authority` to the `pwd` of the open folder root

#### Upload a binary asset first when Markdown should reference it

Use this workflow for images, diagrams, PDFs, archives, or any other non-text asset that should live in the bank and later be referenced from Markdown.

1. upload the asset with `cb content file up --file <payload.json>`
2. re-read the relevant `INDEX.md` or target Markdown path if needed
3. write or edit exactly one Markdown file that references the uploaded bank-relative path

Treat the asset upload and the Markdown mutation as two separate steps. Do not batch them into one guessed shell command or one oversized plan.

##### Placement rule for images shown inline in Markdown

The web viewer renders Markdown `![alt](...)` images by resolving the `src` **relative to the Markdown file's own directory** and then fetching it through the `/content/raw` endpoint. For the image to appear inline, the upload `path` and the Markdown `src` must agree under that rule.

Follow this placement rule whenever the asset is an image that will be shown inline:

- Place the image in an `assets/` folder that sits in the **same directory as the referencing Markdown file**.
- Name that folder exactly `assets/`. Do not invent alternatives like `images/`, `media/`, or a shared top-level `assets/` folder unless the referencing Markdown also lives at that same level.
- In Markdown, reference the image with a sibling-relative path: `![alt](assets/<filename>)`. Do not use absolute URLs, leading `/`, or deep `../../` traversals for images you just uploaded.
- If multiple Markdown files in different folders need the same image, upload it once per folder (each next to its own `assets/`), or place it next to the highest common parent Markdown that actually references it. Do not rely on cross-folder relative paths.

Concrete example — Markdown at `02-operational-context/weekly-review/gmail-weekly-message-counts.md` references `assets/gmail-weekly-volume-chart.svg`:

- Upload `path` must be `02-operational-context/weekly-review/assets/gmail-weekly-volume-chart.svg`.
- Markdown body must contain `![Gmail weekly volume](assets/gmail-weekly-volume-chart.svg)`.
- The viewer resolves this to `/content/raw?path=02-operational-context%2Fweekly-review%2Fassets%2Fgmail-weekly-volume-chart.svg` and renders it inline.

If the Markdown file itself lives at the bank root (for example `INDEX.md`), the image belongs in a root-level `assets/` folder and is still referenced as `assets/<filename>`.

Recommended upload payload shape for an inline-rendered image:

```json
{
  "path": "02-operational-context/weekly-review/assets/gmail-weekly-volume-chart.svg",
  "source_file": "/absolute/path/to/local/gmail-weekly-volume-chart.svg",
  "context_type": "operational",
  "reason": "store the chart referenced by the weekly review page",
  "trigger": "weekly review documentation update",
  "impact": "future agents and the web viewer can retrieve the chart alongside its narrative",
  "authority": "/absolute/path/to/open-folder-root"
}
```

Run it as:

```bash
cb content file up --file /tmp/content-file-up.json
```

Then create or edit the Markdown separately with a normal text mutation such as:

```markdown
![Gmail weekly volume](assets/gmail-weekly-volume-chart.svg)
```

For non-image binaries that are only linked (not inline-rendered) — PDFs, archives, datasets — the sibling `assets/` folder is still the preferred layout, but the strict placement rule above exists specifically so that Markdown image rendering in the web viewer works without extra configuration.

The same `cb content file up/down` command shape works in both local and remote mode. In remote mode, `source_file` and `destination_file` still refer to paths on the machine running the CLI.

#### Create a file

```bash
# payload: /tmp/content-write.json
cb content write --file /tmp/content-write.json
```

#### Create a directory with an INDEX.md

Use this when the bank needs a new organizational folder. The `index` content should follow the standard INDEX.md pattern used by the initial templates (see `00-governance/INDEX.md`, `01-knowledge-context/INDEX.md`, etc.):

- A heading matching the folder's purpose
- A `## Purpose` section explaining what the folder is for
- A `## Scope` section with "Belongs here" and "Does not belong here" lists
- A guiding question or retrieval guidance section

```bash
# payload: /tmp/content-mkdir.json
cb content mkdir --file /tmp/content-mkdir.json
```

After creating the folder, update all parent INDEX.md files up the tree to reference the new folder. Use `cb content read` to read each parent INDEX.md, then `cb content edit` to add the new folder entry. Work from the newly created folder upward to the root INDEX.md.

#### Edit a file

```bash
# payload: /tmp/content-edit.json
cb content edit --file /tmp/content-edit.json
```

Use `replace_all: true` only when replacing every occurrence is clearly intended.

#### Remove a file

```bash
# payload: /tmp/content-rm.json
cb content rm --file /tmp/content-rm.json
```

#### Remove a directory and its contents

Use the `-rf` flag to remove an entire directory and everything inside it. The path must point to a directory, not a file.

```bash
cb content rm -rf --file /tmp/content-rm-directory.json
```

If you use direct shell invocation anyway:

- keep the inline JSON payload in one argument
- prefer simple payloads and careful quoting on native Linux
- be especially cautious on Windows shells, where quoting rules differ
- switch to code-built JSON immediately if the shell reports extra arguments,
  malformed JSON, or parse errors near the beginning of the payload

### 4. Reassess after each mutation
Because writes must happen one file at a time, re-read the relevant `INDEX.md` or file after the change when needed. Do not queue speculative follow-up mutations without rechecking the state.

## How to think about placement

Use this order:

1. Does this belong only to the current task? Put it in `execution` or leave it out of the bank.
2. Is it a stable fact or reference? Use `knowledge`.
3. Is it a norm, policy, workflow, or team operating rule? Use `operational`.
4. Is it a reusable method, skill, tool guide, or template? Use `capability`.

If a fact is temporary, local, or uncertain, do not promote it just because it sounds useful.

## Anti-patterns

Avoid these mistakes:

- creating long-lived files for one-off observations
- adding a new file when an existing canonical file should be edited
- deleting historical context that should be marked deprecated instead
- storing speculation as knowledge
- storing transient task notes in durable layers
- reading the entire bank when the indexes already narrow the search
- performing multiple writes without reassessing after each one

## Example decisions

### Example 1: Add
You discover a repeated agent workflow that is missing from the bank and will help future agents.

Decision:
- context type: `capability`
- action: `write`
- why: reusable method, not task-local, no canonical file exists yet

### Example 2: Update
You find a policy file that still references an old approval flow, and the folder index points to that file as authoritative.

Decision:
- context type: `operational`
- action: `edit`
- why: same concept already exists; correct the authoritative record

### Example 3: Remove
You find a tool guide for a retired tool that is now actively misleading, and there is no value in retaining it as live context.

Decision:
- context type: `capability`
- action: `rm`
- why: obsolete and harmful if retrieved

### Example 4: No change
A user mentions a one-time preference relevant only to the current task.

Decision:
- context type: `execution` at most
- action: no durable mutation
- why: not reusable enough for long-term context

## Output expectations

When using this skill, produce a brief mutation decision before changing anything:

- **action:** add | update | remove | none
- **context_type:** knowledge | operational | capability | execution
- **target:** candidate file path or `none`
- **why:** one to three sentences

Then, if mutating, execute exactly one `cb content write`, `cb content edit`, or `cb content rm` command.
If the workflow needs a binary asset plus a Markdown reference, do them as separate steps: `cb content file up` first, then one text mutation after reassessing.

## Escalation rule

If the bank structure is unclear, do not guess. Read the next relevant `INDEX.md`, inspect the folder with `cb content ls`, or use `cb content glob` to discover candidates before mutating.
