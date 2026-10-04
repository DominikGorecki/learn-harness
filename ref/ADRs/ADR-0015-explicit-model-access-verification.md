# ADR-0015: Explicit verification of an unlisted model

- Status: Accepted; the selection gate is superseded by [ADR-0016](ADR-0016-requested-extra-model-choices.md). Diagnostic transport and proof requirements remain accepted.
- Date: 2026-10-04
- Scope: user-requested GPT-6.1 Sol diagnostic and session model availability. Supplements ADR-0008; keeps its account connection and transport.

## Context

The learner's picker omits GPT-6.1 Sol. Current plan-sharing documentation uses that model in its inference example, while public reports describe differences between delegated catalogues and native Codex login. A catalogue omission is not sufficient evidence either of access or rejection. The user explicitly requested a test in this harness.

## Decision

Keep the account-specific catalogue as the normal source of choices. Add a named, no-input **Test GPT-6.1 Sol** action in account settings. Its fixed slug is a diagnostic target, not a static selectable entry. Explain that it uses a small amount of existing plan allowance before submission. Never run it at startup, refresh, navigation or selection.

Main obtains/renews credentials through the existing account service. Make one asynchronous HTTP/SSE request to the existing public Responses destination with `model: gpt-6.1-sol`, the fixed input “Reply with exactly OK.”, `store: false`, and `stream: true`. It sends no project material or tools. Bound it to 30 seconds and 256 KiB of response data, disable redirects, support cancellation, and never forward raw response text or errors. This small diagnostic has no Pi tool loop or CPU-heavy processing and stays in the privileged account adapter; educational generation remains in its existing utility process.

Verify only a completed stream with completed status, matching Sol identity (including a dated snapshot suffix), and nonempty assistant text observed in output-text deltas or the completion's message content. Retain only a boolean for streamed text evidence; the completion need not repeat text already streamed. HTTP 200 or text deltas alone, bundled catalogues, failed/incomplete streams, mismatched models and interrupted requests do not verify access.

A successful test adds Sol to choices for this connection session and permits normal project model selection and outline authorization. Preserve verification across catalogue refreshes, without duplicates or automatic retesting. Clear it on successful reconnect, sign-out and app restart. Project preferences may retain Sol, with existing unavailable-model recovery until discovery or another explicit test restores access. Do not persist inferred entitlement in credentials or project files.

Serialize tests and renewal; prevent tests and outline inference/account replacement from competing. A named cancellation action aborts the owned test. Closing settings only dismisses the panel. Failed or cancelled tests preserve existing choices and expose safe feedback. Credentials never enter public snapshots or renderer storage. No native Codex login, alternative endpoint or API-key fallback is introduced.

Diagnostic feedback distinguishes explicit HTTP/stream rejection from missing completion, incomplete response, missing output and model identity/status mismatch. After each user-triggered request, print one main-process console summary with numeric transport/timing counters, fixed outcomes and allowlisted protocol/model values. Replace arbitrary provider strings with `unrecognized`. Never print credentials, identity, headers, prompts, reply text or raw errors, and do not persist a separate diagnostic file. A logging failure cannot change the verification result. This refines troubleshooting within the existing diagnostic scope and does not change access criteria.

## Consequences and evidence

Verification observes one successful request, not a promise of future access. Provider authorization and error handling still apply to every outline. Protocol-fixture tests cover verification, failure, cancellation, IPC, selection and restart; fixtures do not establish real-account eligibility. The learner can perform the live diagnostic in the running app, where Electron already owns the connection and OS encryption state.

Sources read 2026-10-04: [official models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), [official app-server catalogue caveat](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server), [T3 Code discrepancy report](https://github.com/pingdotgg/t3code/issues/14321). The report motivates investigation; it does not override official contracts or establish access for this app.

Current rules: [learning and data](../patterns-learning-data.md), [IPC/security](../patterns-ipc-security.md), [architecture](../patterns-architecture.md), [UX](../patterns-ux.md).

## Implementation validation — Windows, 2026-10-04

- `npm run check` passed: lint, 148 unit tests (2 platform skips), both TypeScript scopes and production build. An initial sandboxed attempt hit access-denied errors in existing Windows process-discovery tests; the successful run used the normal host execution context.
- `npm run test:desktop` exercised all 10 configured journeys: 8 passed, the packaged-worker journey skipped without a packaged artifact, and the new diagnostic journey exposed test assumptions about asynchronous first saves and restarting at the dashboard. After correcting those assumptions, `npm run test:desktop -- model-test.spec.ts` passed the complete new journey. No application fix or security relaxation was needed for those test corrections.
- Desktop evidence covers malformed IPC input, model-specific rejection, cancellation, completed verification, refresh retention, saved selection, credential/output sanitization and fresh verification after restart. Reviewed actual Light/Dark account screenshots. All provider responses in these checks came from the isolated signed protocol fixture; live-account access remains unverified until the learner runs the explicit test.

### Diagnostic refinement — 2026-10-04

Lint and all 155 unit tests passed (2 platform skips); both TypeScript scopes and the production build passed. The sandboxed check again could not query Windows test listeners, so the non-UI check was rerun in the normal host context. Its build caught an optional header-index type error; after fixing that guard, `npm run build` passed. Added cases distinguish missing completion, model mismatch, missing text, incomplete response and explicit HTTP rejection; they also verify summary sanitization and that logger failures do not change access results. Desktop and live-provider tests were deliberately not run, as the user requested to run the application themselves. The next manual check is the explicit account action and its single launch-terminal summary, documented in README.

### Streamed-text correction — 2026-10-04

The user supplied a live diagnostic summary: HTTP 200, 9 events, 1 text-delta event, a completed response identifying `gpt-6.1-sol`, completed status, no provider error and `missing_output` after 2615 ms. The old verifier required nonempty text in final message content even when text had already streamed. The summary contains no raw reply and does not establish whether that delta was nonempty; the corrected verifier records that boolean on the next explicit run. It accepts nonempty streamed text followed by matching completed inference without requiring a repeated final output array. This follows the official streaming example's delta handling and completion gate while retaining identity, error, cancellation and size/time checks.

`npm run check` passed in the normal host context: lint, 161 unit tests (2 platform skips), both type scopes and production bundles. Regression cases cover omitted final output, empty/invalid deltas, mismatched completion and errors after streamed completion. No app or live request was launched; the user will rerun the explicit diagnostic to confirm current-session verification and picker availability.
