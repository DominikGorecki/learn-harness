---
name: cb-history
description: Inspect how Context Bank content has changed over time and undo file-level commits. Use when a user asks what changed in a file or repo, wants to review commit history, or needs to revert a file to a previous state.
license: Apache-2.0
compatibility: Requires shell access, the cb CLI installed and configured, and an active Context Bank repository.
metadata:
  version: "1.0.0"
  category: "context-bank"
  tags: ["context-bank", "history", "undo", "revert", "changelog", "audit"]
---

# Context Bank History

## Goal

Answer questions about how Context Bank content has changed and, when requested, revert file-level changes by undoing one or more commits that touched a specific file.

## When to use this skill

Use this skill when:

- The user asks what changed in a file or across the repo
- The user wants to see recent commit history
- The user asks to undo or revert the last commit (or last N commits) to a specific file
- The user wants to compare current content against a previous version
- The user asks who changed a file or when it was last modified

Do **not** use this skill for general content discovery or mutation. Use the discovery skill to find context, and the mutation skill to make new changes.

## Core principles

1. **Start narrow.** Filter history to the relevant file or directory when the question is specific.
2. **Use structured output for programmatic needs.** Use `--json` when downstream processing is needed.
3. **Undo is file-scoped.** The undo operation reverts only the specified file, not the entire commit.
4. **Undo creates a new commit.** It does not rewrite history; it creates a forward commit that restores the file.
5. **Confirm before undoing multiple commits.** When the user asks to undo more than one commit, confirm the count before proceeding.

## Commands

### View repo-wide history

Show the 10 most recent commits across the entire bank:

```bash
cb history
```

### View history for a specific file

Show all commits that touched a specific file:

```bash
cb history <path>
```

### View history for a directory

Show all commits that touched files within a directory:

```bash
cb history <directory/>
```

### Limit the number of results

```bash
cb history -n 5
cb history <path> -n 3
```

### Include full diffs

Use verbose mode to see exactly what changed in each commit:

```bash
cb history -v
cb history <path> -v
cb history <path> -v -n 1
```

### JSON output

Get machine-readable output for further processing:

```bash
cb history -j
cb history <path> -j
```

### Undo the last commit to a file

Revert a file to its state before the most recent commit that touched it:

```bash
cb history <path> --undo 1
cb history <path> -u 1
```

### Undo multiple commits to a file

Revert a file past its last N commits:

```bash
cb history <path> --undo 3
cb history <path> -u 3
```

This restores the file to the state it was in before the last 3 commits that touched it. If the file did not exist before those commits, it is removed.

## Retrieval strategy

### 1. Verify the environment

```bash
cb --health
```

If this fails, stop and report that the Context Bank connection is not healthy.

### 2. Determine the scope

Ask:

- Is the user asking about a specific file, a directory, or the whole repo?
- Do they want to see what changed, or do they want to undo a change?

### 3. Choose the right command

| User intent | Command |
|---|---|
| "What changed recently?" | `cb history` |
| "What changed in this file?" | `cb history <path>` |
| "Show me the diff" | `cb history <path> -v -n 1` |
| "Undo the last change to X" | `cb history <path> -u 1` |
| "Revert X back 3 versions" | `cb history <path> -u 3` |

### 4. Inspect before undoing

Before running `--undo`, show the user what will be reverted:

```bash
cb history <path> -v -n <count>
```

This lets the user confirm they want to revert those specific changes.

### 5. Execute the undo

After confirmation:

```bash
cb history <path> -u <count>
```

Report the result: which commits were reverted and what state the file was restored to (or whether it was removed).

## Query patterns

### "What changed in this file?"

```bash
cb history <path>
```

Summarize the commits: dates, authors, and commit messages (structured YAML messages are parsed automatically).

### "What was the last change to this file?"

```bash
cb history <path> -v -n 1
```

Show the most recent commit with its full diff.

### "Undo the last change to this file"

```bash
# First, show what will be undone
cb history <path> -v -n 1

# Then undo
cb history <path> -u 1
```

### "Revert this file to how it was 3 commits ago"

```bash
# First, show the 3 commits that will be undone
cb history <path> -v -n 3

# Then undo all 3
cb history <path> -u 3
```

### "What changed in the repo today?"

```bash
cb history -n 20
```

Scan recent commits and filter by date in the output.

## Anti-patterns

- Running `--undo` without first showing the user what will be reverted
- Using `--undo` without a file path (it requires one)
- Undoing commits across the entire repo (undo is file-scoped only)
- Using this skill to make new content changes (use the mutation skill instead)
- Guessing commit counts without checking history first

## Error handling

- **"requires a file path"**: `--undo` was used without specifying a file. Add the file path argument.
- **"cannot undo N"**: There are fewer commits touching the file than requested. Check `cb history <path>` to see how many exist.
- **No active repo**: Run `cb --health` to verify the bank is configured and active.

## Output expectations

When answering history questions, provide:

- **scope:** file, directory, or repo-wide
- **commits found:** count and date range
- **key changes:** summary of what changed and why (using parsed YAML metadata when available)

When performing an undo, report:

- **file:** which file was reverted
- **commits undone:** which commit hashes were reverted
- **result:** restored to previous version or removed (if the file did not exist before)
