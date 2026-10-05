# Development logging validation

Date: 2026-10-04. Host: Windows, Node 26.10.0, Electron 44.5.1. Scope: [ADR-0018](../ADRs/ADR-0018-development-file-diagnostics.md).

## Final checks

| Command | Result |
| --- | --- |
| `npm run check` | Passed: lint, 178 unit tests, both TypeScript scopes and production bundles. Three platform-specific unit tests skipped on Windows. |
| `npm run test:desktop` | Passed: 12 real Electron desktop tests, including two logging journeys. One packaged ASAR test skipped because no artifact was selected. |
| `node node_modules/vitest/vitest.mjs run tests/unit/logging.test.ts --reporter=verbose` | Earlier focused run passed all five then-present Windows logging cases; the symlink case skipped. The final full suite additionally covers the fatal marker and malformed data. |
| `git diff --check` | Passed. |

Unit evidence covers ordered JSONL records, request correlation across async work, safe scalar projection, message/path/token exclusion, rotation and retention across launches, queue overload reporting, unavailable storage, synchronous safe fatal markers, malformed diagnostic values, owning-window/frame/entry authorization, renderer rate limits and packaged-operation gating. POSIX owner permissions and symlink rejection are implemented but their platform assertions were not executed on Windows. Two other existing POSIX-only tests also skipped.

Desktop evidence confirms main/renderer console metadata, page error/rejection handoff through context isolation and authorized IPC, preload-failure metadata, normal shutdown flushing, and the absence of a public log/filesystem API. A second journey uses the local signed-token provider fixture to verify safe model summaries, generation transport/tool/terminal events and worker/request correlation, while checking that fixture credentials, identity, folder names, learning goals and outline text do not enter files. This is protocol-fixture evidence, not live-provider acceptance. Existing account, appearance, material, outline rewrite, cancellation, persistence, reading and recovery journeys passed.

## Environment and limits

The initial sandboxed check could not write Vite's cache under `node_modules/.vite-temp` (`EPERM`). The required checks subsequently ran with approved cache/subprocess access. Application sandboxing and security defaults were retained. An initial desktop test exposed that preload cannot directly observe page-world error events; the corrected renderer DOM-message handoff passed the final native suite.

Packaged applications do not enable this development file logger; the packaged guard is unit-tested, but no installer or packaged worker was built for this change. No macOS/Linux run, forced OS termination test, raw external-tool log capture or real account inference was performed. A synchronous fatal marker is tested through the writer; actually crashing main was not required. Abrupt exits may lose pending asynchronous records, and normal shutdown has a two-second drain deadline.
