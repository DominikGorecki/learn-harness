# ADR-0012: Explicit generation navigation and save-conflict recovery

Status: Accepted — 2026-10-04

## Context

The PRD requires a stay/cancel choice before leaving active generation. A completed but unsaved outline must survive navigation and remain recoverable when filesystem state changes. Blind retries cannot safely overwrite an externally edited project.

## Decision

Navigation during generation offers Stay here or Cancel and switch. Cancellation waits for the owned run to settle before opening another workspace. Once atomic saving begins, cancellation is unavailable and the UI waits for the save outcome. Backend project/run correlation remains enforced independently of this presentation rule.

Retain a generated-but-unsaved result even when reopening its project encounters unavailable metadata. Ordinary storage retry uses the original digest and consumes no inference. A detected conflict offers a separate review dialog; only explicit confirmation permits saving against freshly validated project state. Confirmed recovery verifies the original portable project identity, preserves current unrelated settings such as model preference, and replaces the outline and its learning brief. Unknown/corrupt or different project identity cannot be overwritten through this path. A further concurrent edit still fails optimistic validation.

Account connection changes are disabled during inference. Usage/access recovery can recheck model availability without reauthorizing unnecessarily. Per-project preferences stay visible when the model disappears. Duplicate project titles show their folder name for orientation.

Preserve the full in-memory learning draft even beyond the submission limit. Explain the limit and disable submission until it is satisfied; do not use native maxlength truncation for pasted text. Keep header titles on one line so long names do not consume the workspace at high zoom.

## Consequences

Cancellation and save completion are distinct; the UI never claims cancellation after an atomic save has started. Save-conflict recovery is an intentional replacement, not a silent rebase. Unsaved generated results last for the current application session, as disclosed by the UI.

Local Electron evidence includes filesystem-induced save failure, storage-only retry, confirmed external-edit recovery, worker crash, account cancellation, IME-safe submission, unavailable model, usage limits, long offline outlines, corrupt state, read-only inspection, and 200% zoom. These checks do not substitute for live provider or native Windows/macOS acceptance.
