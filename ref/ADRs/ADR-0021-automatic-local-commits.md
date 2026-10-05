# ADR-0021: Automatic local commits for completed changes

- Status: Accepted
- Date: 2026-10-05
- Scope: contributor workflow and local Git history; no application runtime, Git hook or CI behavior change.

## Context

The user requested that changes automatically be committed to the active branch. Existing skills can default to suggesting a commit or requesting separate commit authorization. A project-wide rule makes completion consistent while preserving unrelated work in the shared checkout.

## Decision

Treat the user's request as standing authorization to commit each completed, validated change locally on the branch active at task start. Include documentation, specs, tickets and reviewed flow references as well as code. Explicit user instructions to leave work uncommitted take precedence. This project instruction overrides skill defaults requiring separate commit authorization; it does not expand the authorized task beyond its requested artifacts or behavior.

Record branch, HEAD and existing changes before editing; recheck before committing and reconcile unexpected changes. Stage and commit only task-owned files or hunks, preserving unrelated staged, unstaged and untracked work. Required validation still applies. Documentation-only changes require diff review, affected relative-link verification and `git diff --check`. Coordinators own commits for delegated work. Verify the resulting commit and final status, then report its branch, SHA and validation evidence.

Do not create or switch branches, amend existing commits, rewrite history or push under this standing authorization. Resolve a detached HEAD or changed destination before committing. If validation or committing is blocked, preserve the work and report the exact blocker and uncommitted changes. Read-only tasks need no empty commit.

## Consequences

Completed agent work becomes reviewable in local branch history without repeated commit confirmation. Selective staging and scoped commits require care when files contain unrelated changes or the index already has work. A failed gate or commit leaves the task unfinished and must be reported. No background watcher commits arbitrary edits, and the flow reporter and CI retain their existing artifact-only behavior.

Current rules: [agent entry point](../../AGENTS.md), [development/testing](../patterns-development-testing.md#automatic-local-commits), [documentation](../patterns-documentation.md), [flows](../patterns-flow.md), [pattern index](../patterns.md).
