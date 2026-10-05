# Learning and data patterns

Governed by [ADR-0008](ADRs/ADR-0008-chatgpt-plan-connection-and-pi-foundation.md) and [ADR-0009](ADRs/ADR-0009-portable-project-workspace.md). ADR-0003 records the retired demo baseline.

## Project ownership

`src/core/workspace/service.ts` owns project use cases behind async storage/registry ports. Main canonicalizes native-selected folders, reads bounded metadata, and performs atomic saves. Opening creates no `.edu` and makes no inference request. Explicit model or brief changes create portable identity on first save.

`src/shared/workspace.ts` defines versioned `.edu/project.json`: identity, revision, display name, timestamps, model, brief, and optional saved outline. `src/shared/outline.ts` validates lessons, objectives, module methods/tasks, assumptions, additions, and coverage independently of origin. Model/learner content is never executable.

## Storage and recovery

The project document is canonical. A profile registry tracks recent locations independently. Main rejects symlinked metadata, unsupported schemas, changed roots, oversize documents, and detected external edits. Failed replacement leaves previous bytes intact. Corrupt/unknown state is preserved; never silently initialize over it. Save-conflict recovery under [ADR-0012](ADRs/ADR-0012-generation-recovery-and-navigation.md) requires explicit confirmation, fresh validated state, and matching portable identity. Opening, preference/brief writes, generation preparation, and relinking all verify known portable identity. Missing metadata for an already initialized project is a recovery state, never permission to initialize a replacement.

Core serializes metadata operations and attributes results to their project. Renderer holds unsaved drafts by project handle. A result for another project cannot replace the active workspace. Registry failure after a project save is reported separately and does not falsely label the project save as failed.

There is no database or cloud sync. Under [ADR-0014](ADRs/ADR-0014-durable-account-connection.md), account credentials persist in `<userData>/connection/chatgpt.json`, with OS encryption when available and an explicitly disclosed unencrypted local-file fallback otherwise. POSIX connection directories are owner-only (`0700`) and files are `0600`; Windows uses its app-data access controls and normally DPAPI. The new versioned file is authoritative; legacy `chatgpt.enc` is migrated, and sign-out clears both formats. A newly available keychain upgrades local storage. Credentials and installation host identity are separate from educational files.

## Account and models

The ChatGPT connection supports browser sign-in, verified identity, separate plan permission, renewal, model discovery, and local sign-out with remote revocation attempted. Public state contains safe profile/model information, never tokens. Failed model queries do not appear as verified empty catalogues. Preserve a usable connection if replacement sign-in fails or is cancelled. Never fall back to ambient API keys.

Persist model preferences per project and validate changes against the ready connected choices. Under [ADR-0016](ADRs/ADR-0016-requested-extra-model-choices.md), append the explicitly requested Sol/Luna choices after successful discovery, preserving catalogue order/names and avoiding duplicates. Both survive refresh/restart without mandatory tests; choices do not assert per-account entitlement. Failed discovery or missing permission cannot create ready choices. Optional tests under [ADR-0015](ADRs/ADR-0015-explicit-model-access-verification.md) establish independent connection-session proof for each model only after bounded completed inference. Refresh retains proof; reconnect, sign-out and restart clear it. Never run inference on discovery, navigation or selection. Failed/cancelled diagnostics preserve choices and the other model's proof. Preserve other missing saved models visibly until deliberate replacement or fresh discovery. Reading saved content does not require account access; the provider authorizes every inference request.

## Generation and future learning

Under [ADR-0017](ADRs/ADR-0017-outline-rewrites-with-saved-context.md), every educational request includes the current saved outline JSON (or null), retained through Pi tool turns. Outline rewrites receive separate bounded learner changes and preserve the written/inferred learning brief. Main/core load authoritative context after project-identity and digest validation. Pi interprets topic numbers against the original one-based lesson order and returns a full validated outline. Reuse generation cancellation, atomic saves, unsaved-result retry and conflict recovery. Require a saved outline before rewriting; an outstanding unsaved result must be saved first.

For rewrites, Pi chooses whether additional scoped reads are needed. Retain previously recorded read-source references with explicitly inherited coverage; only successful new reads establish current source verification. New or previously unread references still require a read-tool call. Normal creation/regeneration retains ADR-0011's relevant-material read requirement. Separate manifests and persistent tutoring remain future proposals.

Description-to-outline generation uses a privileged Pi utility adapter under [ADR-0010](ADRs/ADR-0010-bounded-pi-outline-generation.md). Explicit submission, project-owned operations, bounded cancellation, and distinct generated/saved results are implemented. Folder-based understanding uses bounded text/Markdown snapshots and actual-read coverage under [ADR-0011](ADRs/ADR-0011-scoped-material-understanding.md). Preserve inferred scope separately from the learner’s written brief. Unsupported-only folders return a local input request; ambiguous readable material can ask one useful clarification. Pi coding tools do not belong in the educational surface. Rich tutoring and mastery assessment are outside this milestone. See [security patterns](patterns-ipc-security.md) before extending file or AI access.
