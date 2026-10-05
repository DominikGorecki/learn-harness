# ADR-0019: Isolated topic edits with project-wide Pi file access

Status: Accepted — 2026-10-04

## Context

The learner requests an edit icon for every outline topic, using the existing outline-editor interaction while changing only that topic and its existing root folder. The user additionally authorizes Pi to use and create content throughout the selected project. This explicitly extends the earlier read-only educational harness in ADR-0010/ADR-0011 and the whole-outline rewrite in ADR-0017.

## Decision

Expose a named, sender-authorized `rewriteTopic` capability accepting an opened project handle, selected model ID, stable topic/lesson ID and bounded nonblank changes. Renderer callers cannot supply authoritative outline JSON, source evidence, file paths or mutation scope. Main/core load current validated state and resolve the topic. Treat a topic as one existing lesson in the current nested outline; this does not add a new hierarchy or implement tutoring sessions.

Reuse the native outline dialog, model authorization, explicit submission, IME-safe shortcut, cancellation and save recovery. Keep separate drafts for each project and topic content revision, plus the whole-outline editor. A successful topic save clears its own draft and preserves drafts for unchanged topics. Explain the exact affected topic, project-context transmission and plan allowance. Opening or dismissing never starts inference.

Pi receives the full saved outline and may read throughout the selected project. Its complete proposed outline is independently localized in the worker, core and save path: replace only the selected lesson, preserving its ID, all other lessons and their order, starting lesson and every outline-level field. Preserve the written/inferred direction and project name. Even a model proposal to rename the project or reorder other lessons cannot change those fields through this capability.

Add project file tools for explicit folder listing, bounded UTF-8 file reads without extension restrictions, and staged text-file creation/replacement (including parent folders). General educational requests may stage requested content changes anywhere within the selected project. Topic requests may read anywhere, but writes must stay in their resolved topic folder. No shell, code execution, extension loading or deletion tool is added. File content is untrusted data. Source references still require successful read evidence or clearly inherited evidence. Application-owned root `.edu/project.json`, the recovery journal and Git internals cannot be written by Pi.

Resolve an existing root topic folder by stable ownership in `<folder>/.edu/topic.json`, normalized lesson ID/title/numbered title, or its single source-folder reference. Reject ambiguous, shared or linked folders. Capture its filesystem identity and existing plan before inference, then check them again before saving. A renamed topic retains its existing folder through the stable plan identity. With no existing folder, optional new material is restricted to a root folder named after the lesson ID. Saving an existing folder also updates its versioned `.edu/topic.json` plan, even when Pi needs no material changes. Other files in that folder change only through explicit staged edits; other topic folders remain unchanged.

Independently validate every proposed path, text size, baseline and topic scope in main. Reject absolute/traversal/device paths and links/junctions at every component. Bound individual text files to 256 KiB, one run's edits to 100 files and 2 MiB of combined text/baselines (the application plan also counts toward save limits). Read up to 2 MiB of project text per run and list at most 1,000 immediate entries per folder. Credentials remain in the application profile.

Publish project files together with the outline through atomic individual replacements and a bounded `.edu/file-transaction.json` recovery record. The final outline digest is the commit marker. Ordinary save failures compensate file changes. On subsequent load after interruption, restore pre-save files if the old outline remains, or verify the new files and retain them if the new outline committed. Preflight every recovery path/version; unknown external bytes, changed identity or corrupt recovery state are preserved and reported. This is recoverable multi-file publication, not distributed locking; empty created directories may remain after an interruption. Navigation remains read-only apart from completing an interrupted save's recovery.

Retain staged edits privately with generated-but-unsaved results so retry consumes no inference. For a confirmed outline conflict, apply only the revised topic to freshly identity-checked outline state, preserving current unrelated content and goals. File baselines remain authoritative; confirmation cannot silently overwrite externally edited source files or a shared topic folder.

## Consequences

Project content can grow through Pi while topic edits have enforced locality. Binary authoring, arbitrary execution, deletion, interactive module delivery and permanent learning sessions remain outside these text-file tools. Existing metadata remains version-one compatible. The per-folder plan is an owned mirror; `.edu/project.json` remains the application's canonical outline. Local signed-provider tests prove actual Pi/utility/IPC/storage behavior and native Windows interactions; they do not prove live model curriculum quality or other-platform acceptance.
