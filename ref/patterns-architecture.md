# Architecture patterns

Governed by [ADR-0001](ADRs/ADR-0001-typescript-electron-process-layout.md), [ADR-0003](ADRs/ADR-0003-core-learning-services-and-demo-state.md), [ADR-0008](ADRs/ADR-0008-chatgpt-plan-connection-and-pi-foundation.md), [ADR-0009](ADRs/ADR-0009-portable-project-workspace.md), and [ADR-0017](ADRs/ADR-0017-outline-rewrites-with-saved-context.md).

## Process and source ownership

Use the electron-vite process layout: `src/main/index.ts`, `src/preload/index.ts`, and `src/renderer/index.html` with React under `src/renderer/src`. Main owns windows, OS integration, protocol serving, permissions, composition, and authorized IPC routing. Preload translates named capabilities into IPC. Renderer handles presentation and user intent.

The Node backend is hosted in main for this small slice. There is no Express server or separate listening backend. Keep handlers short; compose a learning application service rather than implementing learning behavior in IPC callbacks.

## Dependency direction

Core imports shared contracts and defines repository/time/identity ports. Main imports core and implements privileged adapters. Renderer and preload import shared DTOs/API definitions but no core implementation. Shared imports no runtime/platform frameworks. ESLint protects these directions; separate TypeScript scopes keep browser source free from ambient Node types.

`WorkspaceService` is asynchronous and serializes project mutations. Main implements project storage and registry ports; handlers await service results before constructing serialized reply envelopes. The old in-memory demo service has been retired under ADR-0009.

Account lifecycle lives in `src/main/auth`: application connection service, testable OAuth/provider and credential adapters, and loopback listener. Its asynchronous IPC uses `registerCapability`, which awaits the result before constructing its reply. Shared account snapshots contain no credentials. [ADR-0014](ADRs/ADR-0014-durable-account-connection.md) governs durable protected/local credential storage in the application profile and restoration through the existing account lifecycle. Pi Agent Core/Pi AI are pinned runtime dependencies for the educational harness; generation runs in a dedicated Electron utility process under [ADR-0010](ADRs/ADR-0010-bounded-pi-outline-generation.md). Core `GenerationService` owns project/run state and a worker port; main owns authorization and worker startup/termination.

The explicit short model diagnostic in [ADR-0015](ADRs/ADR-0015-explicit-model-access-verification.md) uses an asynchronous bounded HTTP/SSE account adapter in main. It sends no project material and has no agent/tool loop. [ADR-0016](ADRs/ADR-0016-requested-extra-model-choices.md) adds fixed Sol/Luna choices after successful discovery and independent optional tests. Shared contains serializable fixed choices; account main owns their composition, test serialization and session proof. Educational outline generation remains in the Pi utility process. Session verification is account-owned state; it is not persisted as entitlement or required to select the requested extras.

Under [ADR-0017](ADRs/ADR-0017-outline-rewrites-with-saved-context.md), core obtains the saved outline through identity- and digest-checked workspace storage and passes it to the existing Pi utility process as untrusted learning context. Main retains worker, account authorization and process lifecycle ownership; the renderer cannot provide authoritative saved JSON or filesystem paths.

## Growth boundary

Development diagnostics follow [ADR-0018](ADRs/ADR-0018-development-file-diagnostics.md): `src/main/logging` owns one asynchronous, bounded JSONL writer in the application profile. Shared owns safe field projection and internal event types. Preload automatically forwards failure metadata on an authorized internal channel; no public logger or filesystem API is exposed. Utility events travel through the existing private port. Core remains unaware of logging implementations; main instruments composition and subscriptions. Packaged applications do not persist these development diagnostics.

Keep one package until independent build/runtime ownership justifies packages. Add files by responsibility rather than generic `utils` or `services` dumping grounds. Future compute-heavy document parsing, indexing, or local inference goes into workers or utility processes with bounded jobs, cancellation, and lifecycle ownership. That process isolation is not sufficient to safely execute arbitrary learner code.

See [IPC/security](patterns-ipc-security.md) before adding a capability and [learning/data](patterns-learning-data.md) before adding storage or tutoring behavior.

[ADR-0019](ADRs/ADR-0019-topic-edits-and-project-file-access.md) adds topic rewrites and project-wide content tools. The Pi utility process stages text-file edits through `generation/project-tools.ts`; core retains them privately with unsaved results, and main's storage adapters validate scope/baselines and publish them with the outline. Topic locality is enforced independently in worker, core and main storage. Main owns per-folder topic-plan mirrors and an interruption-recovery journal; renderer callers provide only a project/model/topic ID and learner changes.