# ADR-0022: Shared Pi streaming lifecycle and generation presentation

- Status: Accepted; coordinator/activity/bridge foundation implemented, transport, producer migration and panel pending in [the streaming bundle](../work/02-ai-streaming/ai-streaming.spec.md).
- Date: 2026-10-05
- Scope: all explicit model-output operations and future inference integration. OAuth, model discovery, renewal and revocation remain outside inference.

## Context

Outline requests have fixed elapsed deadlines and model diagnostics use a separate direct-main inference adapter. Receiving output cannot extend those deadlines; feature-specific busy flags do not establish application-wide ownership. Pi's structured outline tool arguments also need a provisional projection rather than a text-only progress view. The learner approved a bottom split panel and one active AI call across the app.

## Decision

Use one platform-independent `AiCoordinator`, composed by main. Claim synchronously before asynchronous authorization/preparation, reject competing calls as BUSY, and reuse only the same active fixed diagnostic target. A private lease owns cancellation, bounded progress and domain settlement; there is no queue. Main authorizes the owner without denying its own credential renewal. Feature snapshots may display state but do not independently admit inference.

All five current producers and future sanctioned profiles must use the same Pi utility adapter and workbench panel. Main resolves model, project/topic ownership, data/tool scope and acceptance policy. Keep named outline starts and fixed no-input Sol/Luna tests; expose only named activity read/subscription/cancel capabilities. Tokens and raw protocol/model evidence stay private. Never expose generic inference, tools, paths, endpoints, shell or IPC.

Replace total inference deadlines with a 180-second network-inactivity interval, armed from request start, the single header-to-body-wait transition and each nonempty received body chunk before SSE parsing. Comments and fragmented events count; empty chunks, UI work and worker heartbeats do not. Each provider turn starts a fresh interval; local tool execution disarms the network timer. Receiving jobs have no cumulative elapsed deadline while existing byte/turn/file limits hold. Worker spawn and responsiveness have separate bounds (30-second spawn; 5-second heartbeat and 30-second health silence), never a substitute for provider liveness.

Successful inference requires both Pi acceptance and privately observed valid protocol completion with clean HTTP-body EOF. Hold successful terminal delivery and tool execution until both accept the same request. Apparent completion or `[DONE]` alone cannot hide a malformed/error tail or a later failure. Keep inactivity armed through EOF; abort and cancel every reader on cancellation. Do not make another provider call to verify a response.

Publish immutable, correlated provisional DTOs with five operation kinds and `none`, `text`, `outline`, `topic` and `model-test-evidence` previews. Partial fields cannot enter accepted-outline storage. Topic preview requires the selected stable lesson identity; diagnostics show only evidence booleans, never reply text. Cap preview text at 64 KiB UTF-8, history at 40 entries with 256-character labels and entire serialized frames at 96 KiB including JSON escaping. Track omitted history and abbreviation. Coalesce latest previews at 100 ms; lifecycle and terminal transitions bypass batching. Subscribers run outside producer callbacks and their failures cannot change acceptance.

Cancel aborts immediately and awaits actual owner/worker cleanup before release; installing the shared cancellation promise precedes abort dispatch. Late updates cannot revive aborted or settled owners. Keep ownership through validation and publication; saving disables cancellation. Settle only on saved, verified, unsaved, needs-details, failed or cancelled domain outcomes. Domain owners retain full accepted/unsaved output and staged edits for storage-only retry. A terminal preview owns no active admission.

Use the approved bottom panel within the workbench for all inference, including account tests without a project. Show actual activity, elapsed observation, Cancel, provisional readable preview and scope; other AI actions remain paused. Saved reading, themes and ordinary disclosure remain usable. Preserve drafts, focus, reading position and explicit navigation cancellation. UI implementation and its actual flow captures remain pending at foundation adoption.

## Scoped supersession

This decision replaces only ADR-0010's fixed elapsed inference/watchdog policy and ADR-0015/ADR-0016's direct-main diagnostic transport and 30-second inference deadline. Existing runtime paths retain their earlier implementation until the streaming bundle migrates them; foundation adoption does not claim the migration has run. Preserve their public plan endpoint, sanctioned credentials, fixed diagnostic targets, allowance disclosure, independent model identity/completed/text proof and zero automatic retries.

ADR-0012 and ADR-0019 still govern cancellation during saving, independent acceptance, topic/file authority, recoverable publication and save conflicts. ADR-0018 still prohibits content/credentials/paths/raw provider or tool data in logs. Activity remains ephemeral session memory, never `.edu` learning evidence or a persisted transcript.

## Consequences

A heartbeat-only provider stream can continue within existing byte limits; the panel must show honest waiting and retain Cancel. One ownership mechanism reduces competing requests but requires every producer to migrate before release. Utility isolation remains a process boundary, not permission for arbitrary code. Fixtures and design images do not establish live-account eligibility, curriculum quality, accessibility or untested platform behavior.

Current rules and integration recipe: [AI patterns](../patterns-ai.md). Domain, security and UI owners remain linked there.
