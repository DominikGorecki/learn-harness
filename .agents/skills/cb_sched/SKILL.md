---
name: cb-sched
description: Inspect scheduler jobs and timelines, create or update jobs from JSON payloads, and manage the host-global scheduler daemon with `cb sched ...` commands.
license: Apache-2.0
compatibility: Requires shell access, the cb CLI installed and configured, and an active Context Bank repository. Job and timeline commands operate on the active bank, while daemon commands inspect or control the host-global scheduler service.
metadata:
  version: "1.0.0"
  category: "context-bank"
  tags: ["context-bank", "scheduler", "automation", "jobs", "timeline", "daemon"]
---

# Context Bank Scheduler Operations

## Goal

Use `cb sched ...` to inspect scheduler state, review recent runs and misfires, create or update jobs from structured payloads, and manage the host-global scheduler daemon safely.

This skill is for operational scheduler work exposed through the CLI. It is not the portal or web UI workflow.

## When to use this skill

Use this skill when you need to:

- list scheduler jobs for the active bank
- inspect one job in detail
- create a new scheduler job from a JSON payload
- update an existing scheduler job from a JSON payload
- archive a job
- review grouped run history or grouped misfire history
- check whether the scheduler daemon is running on the current machine
- start or restart the host-global daemon

## Core principles

1. **Verify the environment first.** Start with `cb --health`.
2. **Remember the scope.** `list`, `get`, `add`, `update`, `remove`, `runs`, and `misfires` operate on the active bank. `status`, `start`, and `restart` are host-global daemon commands.
3. **List before guessing.** Use `cb sched list` to discover canonical `job_id` values before requesting one directly.
4. **Prefer file-backed payloads for writes.** `add` and `update` accept inline JSON, but `--file` is more reliable and easier to review.
5. **Use JSON output when you need the full record.** Plain-text views are concise; `--json` exposes the full job or timeline payload.
6. **Treat remove as archive, not hard delete.** `cb sched remove` archives the job instead of erasing history.

## Workflow

### 1. Verify the environment

Run:

```bash
cb --health
```

If this fails, stop and fix the CLI or active repository configuration first.

If you need to switch which bank the scheduler commands operate on, change the active bank before continuing:

```bash
cb bank list
cb bank activate --name <bank_name>
```

### 2. List jobs in the active bank

Start with:

```bash
cb sched list
```

Useful variants:

```bash
cb sched list --json
cb sched list --type cron
cb sched list --type interval
cb sched list --archived
```

Use `list` to discover `job_id`, see trigger types, and confirm whether a job is archived.

### 3. Inspect one job

To inspect a single job:

```bash
cb sched get <job_id>
cb sched get <job_id> --json
```

Use `--json` when you need fields that are not shown in the plain-text summary, such as:

- `execution`
- `connection_lease`
- `misfire_grace_time_seconds`
- `notifications_enabled`

### 4. Create a job from JSON

`cb sched add` accepts either inline JSON or a file payload.

Inline example:

```bash
cb sched add '{
  "title": "Daily status summary",
  "trigger_type": "cron",
  "trigger": {
    "hour": "9",
    "minute": "0"
  },
  "execution": {
    "provider": "codex",
    "agent_name": "codex",
    "model": "gpt-5.4",
    "prompt": "Summarize the current bank state."
  },
  "notifications_enabled": true
}'
```

Preferred file-backed example:

```bash
cb sched add --file scheduler-job.json
```

Typical payload fields:

- `title`
- `summary`
- `trigger_type`: `date`, `interval`, or `cron`
- `trigger`
- `execution`
- `connection_lease`
- `misfire_grace_time_seconds`
- `notifications_enabled`

Use a real JSON file for anything more than a tiny payload. That makes review, reuse, and shell portability much easier.

### 5. Update an existing job

Update one job with:

```bash
cb sched update <job_id> --file scheduler-job-update.json
cb sched update <job_id> '{"title":"Updated title", ... }'
```

If the payload includes `job_id`, it must match the command argument:

```bash
cb sched update <job_id> --file scheduler-job-update.json
```

Use this to change schedule details, execution settings, or `notifications_enabled` for an existing job.

### 6. Archive a job

To archive a job:

```bash
cb sched remove <job_id>
```

This archives the job. It does not mean “delete every trace of it.”

To inspect archived jobs later:

```bash
cb sched list --archived
```

### 7. Review recent scheduler activity

Grouped run history:

```bash
cb sched runs
cb sched runs --offset 0 --take 25
cb sched runs --json
```

Grouped misfire history:

```bash
cb sched misfires
cb sched misfires --offset 0 --take 25
cb sched misfires --json
```

Use `runs` when you want recent grouped execution outcomes. Use `misfires` when you specifically want missed-run history.

### 8. Check or control the scheduler daemon

These commands are host-global rather than bank-specific.

Check status:

```bash
cb sched status
cb sched status --json
```

Start the daemon when it is not already running:

```bash
cb sched start
```

Restart the daemon:

```bash
cb sched restart
```

Use `status --json` when you need structured fields such as:

- `state`
- `pid`
- `started_at`
- `last_heartbeat`
- `service_scope`
- `metadata_path`
- `log_path`

## Query patterns

### "What jobs exist for this bank?"

```bash
cb sched list
```

If you need the complete job objects:

```bash
cb sched list --json
```

### "Show me the full configuration for one job"

```bash
cb sched get <job_id> --json
```

### "Create a cron or interval job from a reviewed payload"

```bash
cb sched add --file scheduler-job.json
```

### "Turn job notifications on or off from the CLI"

Edit the payload so it includes the desired `notifications_enabled` value, then update the job:

```bash
cb sched update <job_id> --file scheduler-job-update.json
```

### "Show recent runs or misfires"

```bash
cb sched runs --json
cb sched misfires --json
```

### "The scheduler seems stalled on this machine"

```bash
cb sched status
cb sched restart
```

## Anti-patterns

- Running `cb sched get <job_id>` before confirming the correct `job_id` with `cb sched list`
- Treating daemon commands as bank-scoped when they are host-global
- Stuffing large JSON payloads into shell one-liners when `--file` would be clearer
- Using plain-text output when you actually need fields such as `notifications_enabled` or full execution settings
- Assuming `remove` is destructive deletion instead of archive behavior

## Error handling

- **No active repository**: run `cb --health` and confirm a bank is active
- **Job not found**: re-run `cb sched list` and confirm the exact `job_id`
- **Payload validation failed**: inspect `trigger_type`, `trigger`, `execution`, and JSON structure
- **Payload `job_id` mismatch**: make sure the `job_id` inside the JSON matches the `cb sched update <job_id>` argument
- **Daemon not running**: use `cb sched status` to confirm, then `cb sched start`

## Output expectations

When using this skill, summarize:

- which bank or host scope you operated on
- which `cb sched ...` commands you ran
- the relevant `job_id` or daemon state
- any payload fields that matter to the outcome, such as `trigger_type` or `notifications_enabled`
