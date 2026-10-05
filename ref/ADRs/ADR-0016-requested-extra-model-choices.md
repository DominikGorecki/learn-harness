# ADR-0016: Requested extra model choices and independent diagnostics

- Status: Accepted
- Date: 2026-10-04
- Scope: user-requested GPT-6.1 Sol and GPT-6 Luna picker additions. Supersedes ADR-0015's requirement to verify Sol each session before selection; keeps its diagnostic boundaries.

[ADR-0022](ADR-0022-shared-pi-streaming-lifecycle.md) supersedes the reused direct-main diagnostic transport/30-second inference deadline with the shared lease/Pi route. Migration remains pending at foundation adoption. Extra choices, fixed targets, independent connection-session proof, endpoint and secrecy remain unchanged.

## Context

The user ran the corrected Sol test through this app and supplied a summary with HTTP 200, matching `gpt-6.1-sol`, nonempty streamed text, completed status, no provider error and `outcome: verified` after 3967 ms. Discovery still omitted Sol. They requested adding Sol and `gpt-6-luna`, then explicitly chose to keep both as extra choices after restart even when the provider catalogue omits them. No live Luna test has been supplied.

## Decision

After a successful account-specific catalogue query, append the fixed, serializable choices `gpt-6.1-sol` / GPT-6.1 Sol and `gpt-6-luna` / GPT-6 Luna when absent. Preserve server order and names; do not duplicate an advertised ID. Keep these choices across refresh/restart by composing them on each successful query. They are requested choices, not fabricated per-account entitlement or persisted verification evidence. A failed query, missing plan permission or missing connection cannot establish a ready picker. Label the count as model choices, and identify the two extras in account settings.

Allow explicit project selection and normal outline authorization for these choices using the existing connected credentials, membership check, public Responses endpoint and provider recovery. Never substitute a model, use an ambient API key, change authentication routes, or start inference on discovery/selection. The provider authorizes every actual request.

Offer separate named, no-input Sol and Luna test actions. The privileged adapter selects each fixed target; the renderer cannot supply a slug, destination, prompt or credentials. Reuse the bounded HTTP/SSE verifier and sanitized console summaries from ADR-0015. Require nonempty reply evidence and completed status with the requested model identity; Sol evidence cannot verify Luna. Show independent successful-test badges for the current connection only. Reconnect/sign-out/restart clear proof, while refresh retains it. Failure or cancellation preserves choices and the other model's proof.

Only one test owns the account at a time. Deduplicate repeated calls for the same target; reject a competing target as busy. Continue blocking account replacement and outline authorization while testing. Cancel aborts the owned test; closing settings only dismisses it.

## Consequences and evidence

The picker can contain a requested model that the current account cannot invoke. Provider rejection remains visible and recoverable; a displayed choice never establishes entitlement. The supplied Sol summary establishes one successful request through this connection, without guaranteeing other accounts or future availability. Luna remains unverified on the user's connection until they test it or successfully use it.

GPT-6 Luna's public identifier, Responses streaming and function calling are documented in [the official model page](https://developers.openai.com/api/docs/models/gpt-6-luna), read 2026-10-04. This is model capability evidence, not an account-specific grant.

Current rules: [architecture](../patterns-architecture.md), [IPC/security](../patterns-ipc-security.md), [learning/data](../patterns-learning-data.md) and [UX](../patterns-ux.md).

## Validation — Windows, 2026-10-04

`npm run check` passed in the normal host context: lint, 165 unit tests (2 platform skips), both TypeScript scopes and production bundles. Unit/protocol cases verify extra-choice composition and deduplication, permission/discovery gates, independent test evidence, competing-target serialization, cancellation, refresh/reconnect behavior, Luna payload/identity matching and safe logging. Desktop fixture journeys were updated for persistent choices, both named IPC methods and independent badges; they were not run because the user asked to launch/test the app themselves. No app or live request was launched by the agent. The supplied live Sol summary predates this picker extension; live Luna access and the revised UI remain manual checks.
