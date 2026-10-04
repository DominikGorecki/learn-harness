---
name: cb-connection
description: Inspect installed Context Bank connections, check lease state, run connector scripts, and install connector-provided skills into the active workspace harness.
license: Apache-2.0
compatibility: Requires shell access, the cb CLI installed and configured, an active Context Bank repository, and installed connections on the current machine. Skill installation also requires a connected workspace whose root contains `.cbx`.
metadata:
  version: "1.0.0"
  category: "context-bank"
  tags: ["context-bank", "connection", "connector", "lease", "skills", "harness"]
---

# Context Bank Connection Operations

## Goal

Work with already installed Context Bank connections safely and predictably.

Use this skill when you need to:

- see which connections are installed on the current machine
- inspect one connection's metadata, scripts, secret bindings, and lease summary
- check whether a connection currently has an active lease
- run `health.py` or another installed connector script
- copy one or all connector-provided skills into the current workspace's harness-specific skills directory

This skill is about **installed connections** exposed through `cb connection ...`.
It is not the raw-plugin installation workflow.

## Core principles

1. **Verify the CLI before relying on connector state.** Start with `cb --health`.
2. **List before guessing names.** Use `cb connection list` to discover the canonical installed connection name.
3. **Inspect before running.** Use `cb connection inspect <connection>` to see the scripts, bindings, and lease summary before invoking a script.
4. **Treat lease state as operational state.** If a connector requires secrets, `lease-status` tells you whether the current machine can run it right now.
5. **Install skills into the active harness only from a connected workspace.** `cb connection skills get ...` requires a `.cbx` workspace root so Context Bank knows where to place the skill files.

## Workflow

### 1. Verify the environment

Run:

```bash
cb --health
```

If this fails, stop and fix the CLI or repository configuration first.

### 2. List available installed connections

Use:

```bash
cb connection list
```

This prints one installed connection name per line, for example:

```text
notion_connector
slack_connector
```

Use the exact printed name in the remaining commands.

If the command prints `No installed connections.`, there is nothing to inspect or run yet on this machine.

### 3. Inspect one connection and check lease status

For the full summary, run:

```bash
cb connection inspect <connection_name>
```

Example:

```bash
cb connection inspect notion_connector
```

Use `inspect` when you need the full installed metadata. It returns YAML that includes:

- `name`
- `source_path`
- `installed_at`
- `description`
- `scripts`
- `secret_bindings`
- `skills_copied`
- `installed_path`
- `lease`

The `scripts` section tells you which script names are available, including whether `health.py` exists and what each script expects for input and output.

If you only need the operational lease state, run:

```bash
cb connection lease-status <connection_name>
```

Example:

```bash
cb connection lease-status notion_connector
```

Use `lease-status` when you want a smaller YAML payload focused on:

- `state`
- `lease_path`
- `leased_at`
- `expires_at`
- `secret_keys`

Typical states are:

- `active`: the lease exists and is still valid
- `missing`: no active lease file is present
- `expired`: the last known lease is no longer valid

When a connector has required secrets, an active lease is typically required before `cb connection run ...` can succeed.

### 4. Run `health.py` or another installed script

Most connectors expose a `health.py` script. Run it with:

```bash
cb connection run <connection_name> health.py
```

Example:

```bash
cb connection run notion_connector health.py
```

Use `inspect` first if you are not sure which script names are available.

To run any other script, use the same shape:

```bash
cb connection run <connection_name> <script_name>
```

Examples:

```bash
cb connection run notion_connector search_pages.py --input "roadmap"
cb connection run notion_connector read_page.py --input "https://www.notion.so/.../0123456789abcdef"
cb connection run notion_connector update_content.py --file payload.json
```

Input rules:

- use `--input` or `-i` for text input
- use `--file` or `-f` for UTF-8 file input
- do not pass both at the same time

Output behavior:

- text output is printed directly
- JSON output is printed as formatted JSON
- file output is written into the current working directory and the CLI prints the output path

Operational guidance:

- if the command says the connection does not have an active lease, run `cb connection lease-status <connection_name>` and fix the lease first
- if the command says the lease expired, refresh or recreate the lease before retrying
- if the command says the script is missing, re-check the `scripts` section from `cb connection inspect <connection_name>`

### 5. List connector-provided skills

Some installed connections ship reusable harness skills under their copied `skills/` folder.

To list those skill folders:

```bash
cb connection skills <connection_name>
```

Example:

```bash
cb connection skills notion_connector
```

This shows the skill folder name, frontmatter name, and description. Use this list when you want to install only one connector skill.

If the command prints `No connection skills available for <connection_name>.`, that installed connection does not currently expose any shipped skills.

### 6. Pull all connector skills for the active harness

This step must be run from inside a **connected workspace** whose root contains `.cbx`.

To install every available connector skill into the current harness:

```bash
cb connection skills get <connection_name> --all --type <harness>
```

Examples:

```bash
cb connection skills get notion_connector --all --type codex
cb connection skills get notion_connector --all --type claude
cb connection skills get notion_connector --all --type cursor
cb connection skills get notion_connector --all --type gemini
```

Harness destinations:

- `codex` installs into `.agents/skills`
- `claude` installs into `.claude/skills`
- `cursor` installs into `.cursor/skills`
- `gemini` installs into `.gemini/skills`

For a custom destination:

```bash
cb connection skills get notion_connector --all --type custom --path my/custom/skills
```

Use a relative `--path` to place the skills under the connected workspace, or an absolute path if your harness expects skills somewhere else.

### 7. Pull one connector skill instead of all of them

If you only want one skill folder:

```bash
cb connection skills get <connection_name> <skill_folder> --type <harness>
```

Example:

```bash
cb connection skills get notion_connector cb_notion_discover --type codex
```

Optional flags:

- `--rename` or `-r` to install the skill under a different snake_case folder name
- `--force` or `-f` to overwrite an existing destination folder

Example:

```bash
cb connection skills get notion_connector cb_notion_discover --type codex --rename my_notion_discover --force
```

## Query patterns

### "What connectors are available here?"

```bash
cb --health
cb connection list
```

### "What does this connection expose, and does it have a lease?"

```bash
cb connection inspect <connection_name>
cb connection lease-status <connection_name>
```

### "Run the connector health check"

```bash
cb connection run <connection_name> health.py
```

### "Run another script the connector ships"

```bash
cb connection inspect <connection_name>
cb connection run <connection_name> <script_name> --input "..."
```

### "Install every connector skill for my current harness"

```bash
cb connection skills get <connection_name> --all --type codex
```

Replace `codex` with the harness you are actually using.

## Anti-patterns

- guessing the connection name instead of using `cb connection list`
- running a script before checking `cb connection inspect <connection_name>`
- treating `inspect` and `lease-status` as interchangeable when you only need one view
- trying to install connector skills outside a connected workspace
- forgetting `--type` when using `cb connection skills get ...`
- using `--all` together with a specific skill folder name

## Output expectations

When using this skill, report:

- which connection name you operated on
- which command you used and why
- whether the lease was active, missing, or expired
- which script was run and what kind of output it returned
- which harness skills were installed, skipped, or unavailable
