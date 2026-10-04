---
name: cb-ai-messages
description: Add curated user-facing Markdown app messages through `cb message add`, always with a small symbolic image produced by an image-generation model and surfaced on the dashboard and Messages page.
license: Apache-2.0
compatibility: Requires shell access, the cb CLI installed and configured, and an active Context Bank repository. Messages are appended to the active bank.
metadata:
  version: "1.0.0"
  category: "context-bank"
  tags: ["context-bank", "messages", "dashboard", "user-updates", "cli"]
---

# Context Bank App Messages

## Goal

Use `cb message add` to leave a concise, user-facing Markdown app message that
is worth surfacing on the dashboard and Messages page. Every message post must
include an image produced by an image-generation model.

This skill is for deliberate human-visible updates. It is not a scratchpad,
audit trail, long report channel, or replacement for normal Context Bank
content changes.

## When to add a message

Add a message when the user should see a short update outside the chat thread,
for example:

- a task needs user review or approval
- a long-running or background workflow reached a meaningful state
- a follow-up action is waiting on the user
- a completed operation has an important outcome the user may want to revisit
- an error needs attention but does not belong as a durable context mutation

Keep the title short and specific. Write the message body in readable Markdown
focused on what changed, what matters, and what the user can do next.

Always generate and include a small symbolic image that visually represents the
message. Treat the image as a required part of the message, not an enhancement
to skip when the text is already clear. "Generate" means produce the image with
an image-generation model from a natural-language prompt. The image should help
the user scan the message stream; it is not a place for screenshots full of tiny
text, sensitive content, or decorative noise.

## When not to add a message

Do not use app messages for:

- normal content changes that should be represented with `cb content ...`
- audit trails or command logs
- private secrets, tokens, passwords, credentials, or sensitive personal data
- large debug dumps, stack traces, transcripts, or long reports
- speculative thoughts or temporary reasoning
- status noise that the user does not need to see later

If the information is durable knowledge, update Context Bank content instead.
If it is only internal reasoning, keep it out of app messages.

## Verify the environment first

Start with:

```bash
cb --health
```

If the CLI is unhealthy, stop and report the problem instead of trying to append
a message.

Messages are written to the active bank. If there is no active bank, inspect and
activate one before continuing:

```bash
cb bank list
cb bank activate --name <bank_name>
```

If `cb message add` reports that no active Context Bank repository exists, do
not retry blindly. Ask the user which bank should receive the message or
activate the appropriate bank if that was already established.

## Preferred file-backed workflow

Prefer a JSON file and `cb message add --file` or `cb message add -f`.

Required fields:

- `title`: short message title
- `message`: Markdown message body
- `image_file`: local path to a small model-generated image file to attach to the message

Optional field:

- `created_at`: ISO 8601 timestamp with timezone

Omit `created_at` for normal messages. The CLI will generate the timestamp.
Only set `created_at` for deterministic tests, backfills, or portable workflows
where preserving an existing timestamp is required.

Use `image_file` with every normal message payload. Generate the image with an
image-generation model before writing the payload, then point `image_file` at
the local file. The path is read from the machine running the CLI. In remote
mode, the CLI uploads the image bytes to the host Context Bank API. Context Bank
stores the image under
`.cb/messages/images/` using a generated timestamp-and-hash filename, then
records the stored `image_path` in `.cb/messages.jsonl`.

## Image requirement

Before every `cb message add`, generate a compact image directly with an
image-generation model. Do not ask the user to provide an image. Choose a simple
visual metaphor from the message content and prompt the image model to create a
small symbolic PNG, JPEG, or WebP. Prefer a clean square or wide thumbnail that
remains legible at dashboard size.

Rules:

- Generate an image with an image-generation model for every message post.
- Use the file-backed workflow so `image_file` can be included.
- Keep the image symbolic and non-sensitive.
- Avoid screenshots full of tiny text, exact private data, credentials, or
  decorative noise.
- If the model-generated image fails validation, regenerate or fix it before posting.
- If image generation is genuinely unavailable, stop and report the blocker
  instead of silently posting a text-only message.

## Image generation method

For normal message posts, the image must be generated directly by an
image-generation model from a natural-language prompt.

Do not satisfy the image requirement by hand-authoring SVG, drawing with
Pillow/canvas/matplotlib, using screenshots, using stock icons, or procedurally
composing shapes in code.

Allowed post-processing is limited to transport and hygiene after the
model-generated image exists, such as resizing, format conversion, compression,
or filename normalization. Post-processing must not create the primary visual
content.

If direct image-model generation is unavailable or cannot produce a local
attachable image file, stop and report the blocker instead of falling back to
SVG, Pillow, canvas, matplotlib, stock icons, screenshots, or other procedural
generation.

After a message is appended, Context Bank automatically commits the
`.cb/messages.jsonl` update and any stored image using the same file-scoped YAML
commit envelope as `cb content ...` mutations. The CLI attaches the current
installation identity to that commit metadata.

Example payload:

```json
{
  "title": "Review needed",
  "message": "## Import completed\n\nThree records need **manual review** before publishing.",
  "image_file": "/tmp/context-bank-message-symbol.png"
}
```

Preferred command:

```bash
cb message add --file message.json
```

Short option:

```bash
cb message add -f message.json
```

Example with `created_at` for a deterministic test or backfill:

```json
{
  "title": "Backfilled message",
  "message": "This message records an event that happened earlier.",
  "created_at": "2026-04-24T14:30:45+00:00",
  "image_file": "/tmp/context-bank-message-symbol.png"
}
```

Example with a model-generated image:

```json
{
  "title": "Review needed",
  "message": "## Import completed\n\nThree records need **manual review** before publishing.",
  "image_file": "/tmp/context-bank-message-symbol.png"
}
```

## Safe temporary-file workflow

For one-off agent use, write the payload to a temporary file, run the command,
then remove the file:

```bash
tmp_file="$(mktemp)"
python3 - "$tmp_file" <<'PY'
import json
import sys

payload = {
    "title": "Review needed",
    "message": "## Import completed\n\nThree records need **manual review** before publishing.",
    "image_file": "/tmp/context-bank-message-symbol.png",
}
with open(sys.argv[1], "w", encoding="utf-8") as handle:
    json.dump(payload, handle)
PY
cb message add --file "$tmp_file"
rm -f "$tmp_file"
```

Before writing the temporary file, generate the image with an image-generation
model and make sure the payload does not contain secrets or unnecessarily long
text.

Use a compact PNG, JPEG, or WebP. Do not include the image bytes in the message
JSON yourself; the CLI handles byte transport.

## Inline fallback

Inline input does not support `image_file`, so do not use inline flags for
normal message posts. Use them only when the user explicitly instructs you to
post a text-only message despite this skill's image requirement:

```bash
cb message add --title "Review needed" --message "The import completed, but three records need manual review."
```

Optional timestamp fallback:

```bash
cb message add --title "Backfilled message" --message "This records an earlier event." --created-at "2026-04-24T14:30:45+00:00"
```

Do not mix `--file/-f` with inline `--title`, `--message`, or `--created-at`.
Inline input does not support `image_file`.

## Error handling

If `cb message add` fails:

1. Read the error text exactly.
2. Fix malformed JSON, missing `title`, missing `message`, invalid
   `created_at` values, invalid `image_file` paths, or unsupported image
   extensions locally.
3. If the error is about the active bank or CLI health, stop and surface that
   configuration issue to the user.
4. Do not repeatedly append similar messages after a transient failure. Confirm
   whether the previous command succeeded before retrying.

## Privacy and quality checklist

Before sending a message, verify:

- the title is short
- the message is concise Markdown
- the body is concise enough for dashboard display
- a model-generated image is included through `image_file`
- the image is small, relevant, and symbolic
- the primary visual content was not created with SVG, Pillow, canvas,
  matplotlib, screenshots, stock icons, or procedural composition
- no secrets, credentials, tokens, or private data are included
- the message is useful to the user later
- `created_at` is omitted unless there is a specific deterministic or backfill
  reason
