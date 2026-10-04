# Architecture patterns

Governed by [ADR-0001](ADRs/ADR-0001-typescript-electron-process-layout.md), [ADR-0003](ADRs/ADR-0003-core-learning-services-and-demo-state.md), and [ADR-0008](ADRs/ADR-0008-chatgpt-plan-connection-and-pi-foundation.md).

## Process and source ownership

Use the electron-vite process layout: `src/main/index.ts`, `src/preload/index.ts`, and `src/renderer/index.html` with React under `src/renderer/src`. Main owns windows, OS integration, protocol serving, permissions, composition, and authorized IPC routing. Preload translates named capabilities into IPC. Renderer handles presentation and user intent.

The Node backend is hosted in main for this small slice. There is no Express server or separate listening backend. Keep handlers short; compose a learning application service rather than implementing learning behavior in IPC callbacks.

## Dependency direction

Core imports shared contracts and defines repository/time/identity ports. Main imports core and implements privileged adapters. Renderer and preload import shared DTOs/API definitions but no core implementation. Shared imports no runtime/platform frameworks. ESLint protects these directions; separate TypeScript scopes keep browser source free from ambient Node types.

Core service methods are synchronous because the current adapter is in memory. Preload calls return Promises. When introducing asynchronous storage or providers, change service methods and await handlers together; do not return a Promise inside a serialized result envelope.

Account lifecycle lives in `src/main/auth`: application connection service, testable OAuth/provider and credential adapters, and loopback listener. Its asynchronous IPC uses `registerCapability`, which awaits the result before constructing its reply. Shared account snapshots contain no credentials. Pi Agent Core/Pi AI are pinned runtime dependencies for the educational harness; the generation worker is still pending.

## Growth boundary

Keep one package until independent build/runtime ownership justifies packages. Add files by responsibility rather than generic `utils` or `services` dumping grounds. Future compute-heavy document parsing, indexing, or local inference goes into workers or utility processes with bounded jobs, cancellation, and lifecycle ownership. That process isolation is not sufficient to safely execute arbitrary learner code.

See [IPC/security](patterns-ipc-security.md) before adding a capability and [learning/data](patterns-learning-data.md) before adding storage or tutoring behavior.
