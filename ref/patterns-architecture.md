# Architecture patterns

Governed by [ADR-0001](ADRs/ADR-0001-typescript-electron-process-layout.md), [ADR-0003](ADRs/ADR-0003-core-learning-services-and-demo-state.md), [ADR-0008](ADRs/ADR-0008-chatgpt-plan-connection-and-pi-foundation.md), and [ADR-0009](ADRs/ADR-0009-portable-project-workspace.md).

## Process and source ownership

Use the electron-vite process layout: `src/main/index.ts`, `src/preload/index.ts`, and `src/renderer/index.html` with React under `src/renderer/src`. Main owns windows, OS integration, protocol serving, permissions, composition, and authorized IPC routing. Preload translates named capabilities into IPC. Renderer handles presentation and user intent.

The Node backend is hosted in main for this small slice. There is no Express server or separate listening backend. Keep handlers short; compose a learning application service rather than implementing learning behavior in IPC callbacks.

## Dependency direction

Core imports shared contracts and defines repository/time/identity ports. Main imports core and implements privileged adapters. Renderer and preload import shared DTOs/API definitions but no core implementation. Shared imports no runtime/platform frameworks. ESLint protects these directions; separate TypeScript scopes keep browser source free from ambient Node types.

`WorkspaceService` is asynchronous and serializes project mutations. Main implements project storage and registry ports; handlers await service results before constructing serialized reply envelopes. The old in-memory demo service has been retired under ADR-0009.

Account lifecycle lives in `src/main/auth`: application connection service, testable OAuth/provider and credential adapters, and loopback listener. Its asynchronous IPC uses `registerCapability`, which awaits the result before constructing its reply. Shared account snapshots contain no credentials. [ADR-0014](ADRs/ADR-0014-durable-account-connection.md) governs durable protected/local credential storage in the application profile and restoration through the existing account lifecycle. Pi Agent Core/Pi AI are pinned runtime dependencies for the educational harness; generation runs in a dedicated Electron utility process under [ADR-0010](ADRs/ADR-0010-bounded-pi-outline-generation.md). Core `GenerationService` owns project/run state and a worker port; main owns authorization and worker startup/termination.

The explicit short model diagnostic in [ADR-0015](ADRs/ADR-0015-explicit-model-access-verification.md) uses an asynchronous bounded HTTP/SSE account adapter in main. It sends no project material and has no agent/tool loop. [ADR-0016](ADRs/ADR-0016-requested-extra-model-choices.md) adds fixed Sol/Luna choices after successful discovery and independent optional tests. Shared contains serializable fixed choices; account main owns their composition, test serialization and session proof. Educational outline generation remains in the Pi utility process. Session verification is account-owned state; it is not persisted as entitlement or required to select the requested extras.

## Growth boundary

Keep one package until independent build/runtime ownership justifies packages. Add files by responsibility rather than generic `utils` or `services` dumping grounds. Future compute-heavy document parsing, indexing, or local inference goes into workers or utility processes with bounded jobs, cancellation, and lifecycle ownership. That process isolation is not sufficient to safely execute arbitrary learner code.

See [IPC/security](patterns-ipc-security.md) before adding a capability and [learning/data](patterns-learning-data.md) before adding storage or tutoring behavior.
