# ADR-0008: ChatGPT plan connection and Pi runtime foundation

- Status: Accepted; persistence fallback superseded by [ADR-0014](ADR-0014-durable-account-connection.md)
- Date: 2026-10-04
- Scope: implemented account connection and selected runtime foundation. Outline generation remains a subsequent ticket.

## Context

PRD 01 requires the learner's ChatGPT plan, a functional browser connection, per-account models, and Pi as the education harness. Published Pi 1.0.2 includes a dedicated plan-sharing flow, but its generic login does not verify a profile identity, uses Pi's display name, and starts a fresh registration on each sign-in. The desktop product needs its own verified identity and returning registration.

## Decision

Pin Pi AI and Pi Agent Core 1.0.2. Use Pi's composable agent runtime for the upcoming educational tool loop, without a terminal UI, general shell tools, or automatic project-extension discovery.

Adapt the dedicated ChatGPT public-client flow in an application-owned main-process adapter. Use Learning Studio's name, a stable host identity, PKCE, an ephemeral loopback callback, verified OIDC claims through JOSE, and issued-client reuse. Keep verified identity distinct from granted plan permission. Query account-specific model availability and never resolve ambient API-key credentials.

Keep credentials in the application profile using Electron safeStorage where the OS offers protected encryption. Linux basic_text is not protected storage. Where protected storage is unavailable, keep credentials in memory and explain their session-only lifetime. Keep credentials out of renderer snapshots and project folders. Serialize renewal and account lifecycle actions; clear local credentials independently of the outcome of remote revocation.

Expose named account capabilities through the authorized bridge and sanitized account-change events. Only an internally constructed authorization URL can open the system browser. A named copy-sign-in-link action copies the active URL through the main process so the learner can paste it into a preferred browser; the URL stays out of renderer snapshots, and the bridge exposes no general clipboard access. Local protocol fixtures require an unpackaged app, an explicit isolated profile, and a loopback-only provider origin; packaged operation always uses official endpoints.

## Consequences

The app can connect an eligible account, restore protected credentials, renew access, show available models, and sign out. Account UI and protocol behavior can be tested through the real Electron bridge with a local signed-token fixture. That fixture is not evidence of actual ChatGPT-plan eligibility or inference; real-account verification stays open in the implementation acceptance record.

The old deterministic lesson demo remains temporarily while the project workspace is built. Installed Pi dependencies establish the runtime foundation; the generation worker must still be implemented and validated before claiming outlines work.

Current rules: [architecture](../patterns-architecture.md), [IPC and security](../patterns-ipc-security.md), [learning and data](../patterns-learning-data.md).
