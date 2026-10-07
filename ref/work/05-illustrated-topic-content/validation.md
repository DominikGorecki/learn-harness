# Illustrated topic content implementation validation

Status: In progress — implementation and acceptance gates pending

## Invocation baseline

- Branch: `master`.
- Starting HEAD: `5c8ff9bb95a29373a5961f1194be3ba4c8436802`.
- Worktree/index: clean before ticket preparation.
- Source: [spec](illustrated-topic-content.spec.md); [ticket map](illustrated-topic-content.tickets.md).
- Environment: Windows PowerShell; Node 24+ project commands; isolated Electron Playwright for frontend evidence.
- Delegation: one mutating ticket worker at a time in the shared checkout. Primary owns acceptance, records and commits. Read-only investigation may run concurrently.

## Ticket preparation

Nine tickets cover R01–R35. Dependencies are acyclic and scheduled in increasing ticket order among ready nodes. No prior tickets or completion records existed for this spec. The prepared artifacts do not establish implementation acceptance.

## Executed checks

### T01 contract foundation

- Accepted local commit: `9946770a127f192df170b217ef9f13695cb0d761` (`T01-Define illustrated chapter and OpenRouter contracts`). Worktree clean after commit; T02 released against that dependency.

- Worker: domain/contracts, `gpt-6.1-sol`, high reasoning. Coordinator inspected the actual contracts, ports, AI consumers, focused tests and ADR/pattern diff.
- `npm.cmd run check`: passed outside the filesystem sandbox; lint, 32 unit files (345 passed / 3 skipped), flow audit, both type scopes and all production bundles. Initial sandboxed Vite realpath failed with EPERM before tests; approved rerun passed.
- Final contract/activity/coordinator/projector/model-test focused verification: 8 files, 57 passed. Final `npm.cmd run typecheck`: passed.
- Coordinator ran `npm.cmd run test:desktop -- tests/desktop/model-test.spec.ts tests/desktop/ai-streaming.spec.ts`: three passed in 4.7 minutes. Actual fixture receiving lasted 200,513 ms; 82,348 provider bytes, 56 bridge frames, latest bridge update 129 ms. Repair and model-access/restart also passed. Light/Dark streaming and Saving captures visually reviewed; configured reporter refreshed the three passing flow sets.
- New bundle Markdown relative links resolve. Runtime chapter/provider capabilities are not activated by this foundation.

### T02 portable storage and scoped media adapter

- Accepted local commit: `1cfbd02669ca54be5036876e0bd3d6df1b6cf3dc` (`T02-Persist portable chapters and recoverable media`). Worktree clean after commit; T03 released against that HEAD.
- Worker: storage/security, `gpt-6.1-sol`, high reasoning. Coordinator inspected actual source/tests and commissioned a read-only medium review; fixes now prevent changed/dropped source evidence and reuse/loss of retained revisions.
- Final `npm.cmd run check`: exit 0; lint, 34 unit files (372 passed / 3 skipped), flow audit, both type scopes and production bundles. Focused final storage/media tests: 27 passed across two files.
- `npm.cmd run test:desktop -- tests/desktop/topic-edit.spec.ts tests/desktop/topic-reading.spec.ts`: exit 0; 2 passed in 17.3 seconds. Ran on the stable tree before the final unactivated storage-only review fixes; final code check passed afterward. Configured reporter refreshed only these flows. Coordinator visually reviewed the changed PNGs plus Light/Dark reading references and the narrow 200% streaming capture.
- Tested independent manifest commit marker, fault recovery and inference-free retry, preserving unknown bytes, restart/relocation, missing media/corrupt progress, source staleness, link/root/folder ownership, candidate retention, private partial writes and proven temporary-link crash recovery. Project metadata/source preservation asserted from actual bytes.
- This adapter is not yet exposed through runtime IPC. Full off-main decoding, authorized protocol serving, reader/provider integration and whole-bundle acceptance remain pending. Sessions finished; fixture resources cleaned up; no paid calls.

### T03 protected provider and durable accounting adapter

- Accepted local commit: `c8eb934880f44bbfddd103f9c677a4e483533fb4` (`T03-Add protected OpenRouter settings and durable accounting`). Worktree clean after commit; T04 released against that HEAD.
- Worker: provider/accounting, `gpt-6.1-sol`, high reasoning. Coordinator inspected all eight adapter modules, shared refinements and actual tests; a read-only medium reviewer independently checked dispatch/accounting boundaries. Accepted dependency T01 is committed; implementation used T02 HEAD `1cfbd02669ca54be5036876e0bd3d6df1b6cf3dc`.
- Final `npm.cmd run check`: exit 0; lint, 36 unit files (408 passed / 3 skipped), flow audit, both type scopes and production bundles. Final three-file OpenRouter focused run: 41 passed. Earlier fixture lint/type annotation issues were corrected before the final stable pass; `git diff --check` passed.
- Real loopback HTTP verifies durable intent before metadata dispatch, fixed endpoints and absence of private payloads. Tests cover independent protected/local credentials, failure-before-replacement, cache epochs, exact decimal totals, orphan/corrupt history, known cost on returned-model mismatch/discard, bounded paging and 60–64 KiB intent admission, metadata failure/timeout/shutdown and simultaneous same-slot/consumed-budget admission.
- Main-only cached quotes use the same routing/settings validation as authorization, without HTTP or inference admission. Configuration mutations exclude provider leases across durable writes. Unsafe ledger labels/price variants are projected without altering learner state.
- Runtime bridge, utility producer and Settings UI remain unactivated; no adapter-only desktop test is needed. These layers and live qualification remain separate pending gates. No paid calls/private live credentials; all sessions finished, loopback servers and temporary test roots cleaned up.

### T04 sanctioned image utility and native decoding

- Worker: utility/transport, `gpt-6.1-sol`, high reasoning. Primary inspected actual private authority/protocol/lifecycle/transport/decoder and test diff, with a read-only medium review. Accepted prerequisites T01/T03 are committed; implementation started at `c8eb934880f44bbfddd103f9c677a4e483533fb4`.
- Final `npm.cmd run check`: exit 0; lint, 37 unit files (436 passed / 3 skipped), flow audit, both type scopes and production bundles. `git diff --check` passed. Earlier fractional monotonic ages, explicit asset projection, malformed HTTP-error classification and unrepresentable cost handling were corrected before final validation.
- `npm.cmd exec -- playwright test tests/desktop/image-worker.spec.ts` (using the built Electron tree; final code check rebuilt it afterward): exit 0, one passed in 7.5 minutes. Actual initial wait 216,164 ms, receiving 210,033 ms, 85 health frames, one paid-route fixture request, 96 raster bytes and exact accepted-byte/digest equality. An earlier fixture run accepted the image but failed the receiving-duration assertion at 175,063 ms; corrected 30-second chunks passed, with no production changes for that timing issue.
- Actual Electron checks cover intent/checkpoint failures with zero image requests, terminal-write failure with one request/no asset/unresolved intent, known billing retained on cancellation and provider BUSY until both pending writes and actual exit observation in either ordering. This proves provider ownership; T05 must separately prove the shared global coordinator and named bridge.
- Fresh `npm.cmd run package`, immediately followed by `npm.cmd run test:packaged`: both exit 0; one packaged test passed in 3.3 seconds. Windows x64 Electron 44.5.1 ASAR utility loaded unpacked Sharp/@img and decoded/persisted the exact PNG after cost ACK. Existing three-request outline and two fixed diagnostics also passed with actual exit/PID checks. Production fuses unchanged; development host, not hardened packaged startup.
- Configured reporter refreshed [image-worker](../../flows/image-worker/index.md) and [packaged-worker](../../flows/packaged-worker/index.md) nonvisual evidence. Primary reviewed manifests/assertions and maintained explanations; no screenshots are required for these nonvisual flows. Test-only harness absent before packaging, all sessions finished and owned workers/servers/temporary roots cleaned up.
- Fixed image utility is accepted locally; chapter/replacement producers, media-serving authorization, reader/settings and whole-bundle acceptance remain pending. No paid live requests or private live credentials.

## External qualification

No live paid request is authorized by spec authoring or performed here. Live ordinary-key requests for the three image models, a real ChatGPT chapter and pedagogical image review remain required separate evidence. Native macOS/Linux, screen-reader and hardened startup/installer qualification remain unrun. Fixtures, renderer captures and packaged-worker checks will be reported separately.
