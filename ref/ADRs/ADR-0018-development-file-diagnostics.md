# ADR-0018: Bounded development JSONL diagnostics

- Status: Accepted
- Date: 2026-10-04

## Context

Terminal-only model summaries cannot explain failures spanning renderer, IPC, account state, generation and utility lifecycle. Development needs chronological evidence without making logs another credential or learning-content store. Electron's [process model](https://www.electronjs.org/docs/latest/tutorial/process-model) and [webContents events](https://www.electronjs.org/docs/latest/api/web-contents) support main-owned collection. [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) calls for sensitive-data exclusion, bounded storage and safe behavior when logging fails.

## Decision

Enable file diagnostics automatically in unpackaged runs, including `npm run dev`, previews and isolated desktop tests. Packaged applications have no file logger. Main alone writes UTF-8 JSONL under the application profile's `logs` directory. Retain ten owned files of up to 5 MiB each, rotating during writes and pruning across launches. Use exclusive creation, reject symlinked log directories, and restrict POSIX directories/files to the owner. Normal shutdown waits at most two seconds for the queue to drain; abrupt termination can lose pending records.

Each record has a schema version, UTC timestamp, launch session UUID, sequence, main PID, level, source, event and safe scalar metadata. Server-generated request UUIDs correlate IPC with provider/worker activity; worker UUIDs correlate utility lifecycle and engine events, while project/run UUIDs describe state transitions. Instrument IPC outcomes/timings, account/workspace/generation transitions, window lifecycle, process loss, preload failures, console occurrence metadata, existing safe model summaries and bounded engine transport/tool/turn events.

The renderer bootstrap observes page errors/rejections and posts only fixed safe metadata through DOM messages. Preload checks the same-window source/origin, projects fields, and forwards on one internal channel with a rate limit. It exposes no logger, channel or filesystem method through `window.learning`. Main requires the existing owning-window/main-frame/origin/entry authorization and also limits telemetry to 100 records per second. The writer queue accepts at most 2,000 pending records plus a draining batch of 100; overload records a dropped count. Utility diagnostics use the existing private port and safe projection on both sides.

Project explicitly known field names and fixed enum values, finite counters, booleans, version strings and UUIDs. Never serialize request/reply bodies, snapshots, credentials, identities, headers, URLs, paths, source text, prompts, outlines, tool arguments/results or raw provider/errors. Arbitrary console strings/objects record occurrence/length metadata only. Error diagnostics retain a known type and the first app bundle line/column; messages, function names and absolute stack paths are excluded. Main's uncaught-exception monitor synchronously writes one safe fatal marker without suppressing Node's default termination. Existing safe model summaries remain printed and now also become structured file events; verification behavior is unchanged.

Writes are asynchronous. Logging/storage errors cannot alter replies, learning behavior or model acceptance. A fixed console warning reports unavailable file logging. No telemetry upload, dependency, renderer filesystem authority or persistent entitlement is added. Raw browser/Node debug streams and the external Vite/npm toolchain are outside application diagnostics.

## Consequences

Development issues can be traced across processes and launches with bounded local records. JSONL supports streaming tools and PowerShell `ConvertFrom-Json`. Schema changes preserve or increment the record version. Arbitrary error text and source content remain in their original debugging context. Instrument new behavior with explicit events/enums/counters rather than object dumps.

This extends ADR-0015/ADR-0016 console diagnostics with development persistence and preserves ADR-0002/ADR-0010 process and credential boundaries. Current rules: [architecture](../patterns-architecture.md), [IPC/security](../patterns-ipc-security.md), [development/testing](../patterns-development-testing.md).
