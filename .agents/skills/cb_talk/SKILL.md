---
name: cb-talk
description: Generate concise local speech with `cb talk`, play it aloud, and use the bundled playback script as a fallback for generated WAV files.
license: Apache-2.0
compatibility: Requires shell access, the cb CLI installed, and local audio playback support. Voice generation and playback run on the machine executing the CLI, even in remote CLI mode.
metadata:
  version: "1.0.0"
  category: "context-bank"
  tags: ["context-bank", "voice", "speech", "tts", "agents", "local-audio"]
---

# Context Bank Talk

## Goal

Use `cb talk` when the user explicitly asks you to say something out loud, tell
them something aloud, or otherwise communicate by local speech instead of only
text. Keep spoken content concise and useful.

`cb talk` generates or reuses a local `voice-<hash>.wav` file in the current
working directory, then attempts playback on the machine running the CLI. It is
local-machine behavior even when the CLI is configured for remote mode.

## When to speak

Use speech for:

- short completion notices the user asked to hear aloud
- urgent or time-sensitive local updates
- a brief spoken summary after a long-running task
- a concise confirmation that a requested local workflow finished

Do not use speech for secrets, large reports, stack traces, long transcripts,
or anything the user did not ask to hear aloud.

## Primary commands

Speak a short inline message:

```bash
cb talk "Build finished. The dashboard is ready to review."
```

Speak text from a UTF-8 file:

```bash
cb talk --file speech.txt
cb talk -f speech.txt
```

Warm up and validate the local voice backend before the first use:

```bash
cb talk --install
```

The command writes the generated or cached WAV into the directory where `cb` is
run. Repeating the same text with the same effective voice settings reuses the
cached `voice-<hash>.wav`.

## Good speech style

Keep speech short enough to be useful aloud:

- one to three sentences is ideal
- lead with the outcome
- include only the next action when it matters
- avoid Markdown formatting, code blocks, logs, and dense lists

For longer text, write it to a file and use `cb talk -f speech.txt` so shell
quoting does not become fragile.

## Playback fallback script

If `cb talk` generated a WAV but playback did not start, use the bundled script
from this skill folder:

```bash
uv run --script scripts/play_audio.py voice-<hash>.wav
```

The script accepts one audio path and tries local players using safe argument
lists: `paplay`, then `aplay`, then `ffplay`. It does not interpolate speech
text through a shell.

If none of those players are installed, install one on the local machine or tell
the user where the generated WAV file is.
