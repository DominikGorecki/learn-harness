# Ticket: illustrated-topic-content.T02 — Persist portable chapters and checkpoints with scoped media access
Status: Done — main storage adapter accepted; runtime integration belongs to T05

## Source

- Spec: [Illustrated topic content](illustrated-topic-content.spec.md)
- Scope: explicit whole-spec implementation request; [product context](../../../docs/overview.md).
- Guidance: [AGENTS.md](../../../AGENTS.md), [README](../../../README.md), [pattern index](../../patterns.md), [ADR index](../../ADRs/INDEX.md).

## Goal

Persist portable chapters and checkpoints with scoped media access, delivering the scoped observable behaviors below.

## Scope

In scope: src/main/storage/topic-content*, narrow storage helpers and workspace port integration; src/main/security topic-media policy; focused tests/unit.

Out of scope: unrelated work, TTS, Socratic runtime, OpenRouter text inference, automatic web research, arbitrary models/endpoints and cloud/background jobs. Preserve existing source content and process security.

## Dependencies

- Depends on: [T01](illustrated-topic-content.t01.md).
- Unblocks: T05, T07, T08.
- External prerequisites: no live credentials needed for deterministic implementation; required live/native qualification remains separately recorded and never assumed.

## Implementation plan

- Resolve exclusive owned topic folders and deterministic root chapter manifest names while preserving project.json and source bytes.
- Implement immutable readable chapter/section/media revisions, validated checkpoints and separate journal commit-marker recovery with source/context/root/manifest baseline checks.
- Implement main-authorized published/candidate asset resolution and raster validation policy; define integration hooks without granting generic project filesystem access.

## Patterns to apply

Read the focused patterns relevant to owned files through the index and their accepted ADRs. ADR-0026 (once accepted in T01) extends chapter/media/accounting authority only. Core owns learning behavior and ports; shared owns validated DTOs; main owns privileged storage/network/lifecycle and authorized IPC; preload exposes named methods; renderer uses React and typed bridge. Portable .edu state excludes profile credentials/locations/ledger. All inference uses shared admission, sanctioned utility/Pi transport, independent domain acceptance and awaited cleanup.

UI work must read design-system, UX, renderer, main-workspace and ADR-0007/0013/0025, plus relevant existing flow explanations and selected screenshots. Use semantic Light/Dark tokens, quiet central reading/actions, keyboard/focus recovery and no-history dialogs. No computer use for frontend validation.

## Tests and verification

- Add focused meaningful unit tests for this ticket's acceptance and its malformed/hostile input, failure, cancellation or recovery boundaries.
- Add isolated Electron Playwright coverage for bridge/process/user-flow changes, using fixtures with actual saved-byte and request-count assertions and the configured flow reporter.
- Run `npm run check`; run affected `npm run test:desktop -- <owned/affected specs>` for process/bridge/user-flow changes. The coordinator additionally runs the full fresh desktop gate after integration. Package/ASAR checks apply when worker/build ownership changes.
- No-new-test exception: none for functional implementation; documentation-only maintenance uses link review and `git diff --check`.
- Coordinator records actual evidence in validation.md and acceptance.md. Workers return commands, exit outcomes, exact files and cleanup status without editing shared ticket/completion ledgers.

## Acceptance criteria

- [x] Fault injection before/after the manifest marker preserves current content and supports storage-only retry; unknown external bytes are preserved as conflicts.
- [x] Offline/reopened/relocated content resolves portable IDs and assets; corrupt progress does not prevent published reading.
- [x] Paths, links, ambiguous folders and unsupported media cannot escape topic authority; retained image revisions remain intact.

## Manual verification

Review the delivered behavior against acceptance using actual output and affected registered screenshots. UI review includes both themes, keyboard, reduced motion, minimum layout and 200% zoom. Fixtures prove local process/storage behavior; live account access, pedagogical quality and native OS/screen-reader qualification require separate actual evidence. Do not perform paid calls without explicit authorization.

## Completion evidence

Worker: `/root/contracts`, storage/security, `gpt-6.1-sol`, high reasoning; dependency T01 accepted at `9946770a127f192df170b217ef9f13695cb0d761`. Coordinator inspected all source/test changes and used a read-only `gpt-6.1-sol` medium reviewer for publication/ownership boundaries. Review fixes prevent changed/dropped source evidence and reuse/loss of retained revision identities; meaningful regressions pass.

Delivered main-private authority resolution, independent manifest/journal publication, immutable chapter/section/media revisions, restart-safe checkpoints, separate image candidates and portable scoped media resolution. Workspace reads do not save metadata or require account access; all explicit mutations/recovery cleanup serialize through its existing queue. Marker fault injection, external conflicts, relocation, missing assets, corrupt progress, source/root/link/ambiguous ownership, partial writes and proven temporary-link crash recovery are tested. Full decoding and IPC/UI exposure remain T04/T05 work.

- Final `npm.cmd run check`: exit 0; lint, 34 unit files (372 passed / 3 skipped), flow audit, both type scopes and production bundles.
- Final focused storage/media verification: 2 files, 27 passed.
- `npm.cmd run test:desktop -- tests/desktop/topic-edit.spec.ts tests/desktop/topic-reading.spec.ts`: exit 0; 2 passed in 17.3 seconds. These existing flow regressions ran before the final two unactivated storage-only review fixes; final full code checks ran afterward. Coordinator reviewed the regenerated topic-edit/reading artifacts, including Light/Dark and narrow zoom captures.
- All worker sessions finished and fixtures cleaned up. No paid request or new runtime inference capability was exercised. Native/live/full-decoder and integrated reader gates remain pending at bundle level.

Suggested local subject: `T02-Persist portable chapters and recoverable media`; coordinator owns the commit and records its actual SHA in validation after success.

## Notes

- Requirements covered: R02, R06, R14, R15, R16, R17, R20, R32, R35.
- Assumptions: the source spec's bounded defaults apply; no additional product blocker.
