# AI Streaming — Implementation Validation

Status: In progress
Implementation started: 2026-10-05
Branch: `master`
Starting revision: `a44abbb1ce3129128738ec046fa6df16e016bb37`

This ledger records actual implementation evidence for [the spec](ai-streaming.spec.md). The worktree was clean at invocation. All seven existing tickets were Open; their IDs, source links, coverage and topological dependencies were inspected. No implementation is accepted from a status alone. The coordinator owns this ledger, ticket acceptance and commits.

## Assignment and dependency plan

One mutating worker at a time in the shared directory; investigation/review can run concurrently. Every dependent waits for accepted prerequisite commits. Runtime supports the selected GPT-6.1 Sol model/efforts and four total agent slots.

| Ticket | Dependencies | Difficulty / role | Model / reasoning | Principal ownership | Verification |
| --- | --- | --- | --- | --- | --- |
| T01 | None | Difficult / domain and Electron contracts | GPT-6.1 Sol / high | Core AI coordinator, shared DTOs, authorized main/preload, foundational ADR/patterns | Races/bounds/schema tests, real bridge, check/desktop |
| T02 | T01 | Difficult / transport and worker lifecycle | GPT-6.1 Sol / high | Pi adapter, utility protocol/health, safe diagnostics | Fake-clock byte liveness, real worker/cancel, check/desktop |
| T03 | T01, T02 | Difficult / generation and recovery | GPT-6.1 Sol / high | Outline projection, main/core producer integration | Topic/acceptance/save tests, outline/recovery journeys |
| T04 | T02, T03 | Difficult / account and diagnostic migration | GPT-6.1 Sol / high | Tool-free Pi profile, private verifier, session proof | Identity/privacy/admission tests, >30s model-access journey |
| T05 | T03, T04 | Difficult / React workbench and interaction | GPT-6.1 Sol / high | Approved panel, global subscription, all five starts | Electron keyboard/scroll/recovery, reviewed theme/adaptation captures |
| T06 | T05 | Difficult / Electron acceptance and packaging | GPT-6.1 Sol / high | ≥200s stream flow, capture catalog, current-host package | Full check/desktop/flows/package/packaged gates |
| T07 | T06 | Standard / documentation and evidence audit | GPT-6.1 Sol / medium | Canonical AI recipe, focused rules/product docs | Source/timeout/link audit, flow integrity, final coordinator gates |

High reasoning is selected for coupled lifecycle, security, recovery and process/UI contracts; medium reasoning suffices for documentation grounded in the delivered implementation. Actual assignments/commits and any changes to this plan will be recorded upon acceptance.

## Baseline evidence

| Command | Result | Scope / limits |
| --- | --- | --- |
| `git branch --show-current`, `git rev-parse HEAD`, `git status --short` | `master`, starting revision above, clean | No unrelated edits at invocation |
| `npm run check` in restricted execution context | Exit 1 | Lint passed; Vitest startup hit EPERM opening its generated config under `node_modules/.vite-temp`. No behavioral failure established |
| `npm run check` in normal host execution context (`login: false`) | Exit 0 | 17 unit files, 195 passed / 3 skipped; flow integrity, both TypeScript scopes and production build passed. No application sandbox setting changed |

No baseline desktop, packaging or live-account inference was run at this point. Tests use signed local fixtures; they do not establish live account eligibility or learning quality.

## Ticket evidence and commits

### T01 — accepted foundation

Worker `t01_coordinator`, GPT-6.1 Sol / high; independent reviewer `t01_review`, same model/effort. No prerequisites. Source baseline for the accepted checks: `db0b22d` plus reviewed T01 edits (the spec-only refinement was committed as `db0b22d` during this goal). Accepted commit: `53db6b2aea91328c4342a671440db96c7de7874a`, reachable on `master`; post-commit worktree was clean.

Delivered core ownership/leases, shared bounded immutable preview schemas and named authorized main/preload activity methods. ADR-0022, indexes and focused patterns explicitly distinguish this foundation from pending producer/transport/panel migration. Primary reviewed actual implementation/tests; reviewer found two cancellation races, both fixed with direct regressions and then confirmed resolved.

| Command / review | Actual result |
| --- | --- |
| `npm test -- tests/unit/ai-coordinator.test.ts tests/unit/ai-activity.test.ts tests/unit/capability.test.ts` | Exit 0, 29 passed |
| `npm run check` | Exit 0; lint, 219 passed / 3 skipped in 19 unit files, flow integrity, both TypeScript scopes and production build |
| `npm run test:desktop` | Exit 0; 13 passed / 1 packaged-worker skipped, 1.3 minutes, Windows local signed fixtures |
| `npm run test:flows` after capture refresh | Exit 0 |
| Changed guidance relative links; `git diff --check` | Passed |
| Actual visual review | Primary and worker opened the connected account capture and three changed recovery PNGs; no new panel exists yet. Other refreshed PNG bytes were unchanged |
| Cleanup | Worker checked owned processes: no Electron/Playwright/out-main process remained |

Initial strict optional test-type findings were repaired before the passing full check. Required gates used normal host execution; application sandbox/context isolation remained intact. Reporter refreshed 13 passing Windows flow sets at `db0b22d`, source dirty; packaged references were skipped. The usage-recovery PNG retains saved-context/connection-warning presentation but its provider feedback is above the captured viewport; T05/T06 must improve that checkpoint before final UI acceptance. No live/provider-account or packaging qualification is claimed. Complete producer race/latency/UI evidence remains pending.

Primary post-handoff validation: `npm run test:flows` exit 0, `git diff --check` and staged diff check passed; 324 relative links resolved in 33 changed documents. All 59 accepted paths were reviewed and staged explicitly.

### T02 — accepted transport and worker lifecycle

Worker `pi_transport_audit` reused as transport/backend implementer, GPT-6.1 Sol / high. Prerequisite T01 accepted at `53db6b2aea91328c4342a671440db96c7de7874a`. Its read-only transport plan and T01 API comparison found no blocker. One mutating worker owns the Pi transport/protocol/lifecycle and focused tests; domain admission/projection/account migration remain T03/T04. Checks and acceptance are pending.

Primary and independent reviewer `t01_review` inspected the developing transport and worker implementation. Required follow-ups were sent to the worker: abort SDK-only failures before waiting on a still-receiving private tail; retain known provider-code classification from delayed non-OK bodies; reject missing/non-string SSE event types after apparent completion; handle cancellation between fetch resolution and reader installation; and isolate asynchronous observer rejections without awaiting subscribers. These reviews are read-only evidence, not passing regressions or ticket acceptance. The full-result envelope is separately bounded from progress frames using existing outline/coverage/edit schema budgets, including JSON escaping and topic localization.

Primary inspected pinned OpenAI `client.mjs`: `fetchWithTimeout` clears its timer when fetch returns headers, and `parseResponseWithTimeout` bypasses its buffered-body deadline when `options.stream` is true. The new adapter returns the wrapped body at headers; a fake-clock test alone does not accelerate that SDK's native timer. Source inventory shows the old generation total/watchdog timers removed in the developing diff; the direct diagnostic 30-second deadline is still present and belongs to T04's migration. T02 worker reports its focused command passed 67 tests in four files; exact command and stable full-gate evidence remain to be confirmed at handoff.

The worker reports an initial full `npm run check` exit 0 (252 passed / 3 skipped, lint, types, build and flow consistency). Subsequent request-cap terminal-summary and fixed AI-channel diagnostic changes require a fresh final check. Electron/capture evidence and ticket acceptance are still pending.

Latest worker-reported full check: exit 0, 254 passed / 3 skipped across 21 files, including the request-cap and fixed-channel privacy regressions. Independent reviewer confirmed the reported races/classification/observer issues are fixed with meaningful coverage and found no new blocking issue; this review did not run tests. Initial full desktop gate had 12 passes, one packaged skip and one failure in the new diagnostic test's byte baseline: refining the brief legitimately persists before generation. The worker corrected the baseline to request-start persisted bytes; primary inspected that correction. The affected flow and full desktop reruns remain pending before acceptance. No production change was made to satisfy that assertion.

Further diagnostic-flow corrections use separate persisted preparation baselines for both held requests and counts 3/4, because the fixture also records the earlier model test and initial outline. The earlier count 2 could complete before the held request actually began. With those assertions corrected, the flow exposed a production logging gap: stopping workers discarded the ended/cancelled diagnostic summary before exit. The worker is retaining bounded cleanup diagnostic frames during stopping while continuing to ignore late progress/phase/result updates. This lifecycle change requires fresh checks; no acceptance is inferred from the earlier full-check result.

Worker reports the final full desktop rerun passed 13 tests / one expected packaged-worker skip, including the extended nonvisual diagnostic flow. Primary opened the changed dashboard-empty and usage-recovery PNGs: dashboard composition is legible; the earlier usage-recovery feedback remains outside the captured viewport and still needs T05/T06 checkpoint improvement. Package preflight also identified the old packaged fixture's missing `profile: 'outline'` request discriminant; that fixture must migrate before the packaged gate. Final code/flow/package outcomes and acceptance remain pending.

Final coordinator acceptance supersedes the intermediate pending statements above. All listed gates passed after the fixes, with worker edits frozen before record updates. Source baseline: `53db6b2` plus reviewed T02 edits. Accepted commit: `f20752ce0c84a915d7c1b10088a7b4233e5f2302`, reachable on `master`; post-commit worktree was clean. Primary reviewed all code/tests, independently confirmed flow integrity/diff checks and opened the final changed reading/recovery PNGs. Long/zoomed reading remains scrollable; unsaved recovery and Retry save are visible; the usage-feedback viewport limitation remains a T05/T06 checkpoint task. No new streaming panel is claimed.

| Final command | Actual result |
| --- | --- |
| `npm test -- tests/unit/pi-stream-liveness.test.ts tests/unit/worker-lifecycle.test.ts tests/unit/pi-outline-engine.test.ts tests/unit/logging.test.ts` | Exit 0; 66 passed / one Windows symlink-directory test skipped, four files |
| `npm run check` | Exit 0; 255 passed / 3 skipped in 21 files, lint, both TypeScript scopes, production build and flow consistency |
| `npm run test:desktop` | Exit 0; 13 passed / one expected packaged-worker skip; Windows signed local fixtures and configured reporter |
| `npm run package` | Exit 0; Windows x64 unpacked artifact, pinned dependencies unchanged |
| `npm run test:packaged` | Exit 0; one passed; actual ASAR Pi worker/dependencies under development host, profile contract and scoped reads |
| Post-refresh `npm run test:flows` | Exit 0; primary independently reran it with exit 0 |
| `git diff --check` | Exit 0; primary independently confirmed |

Additional initial focused failures were repaired: response-cap failure released the raw reader before cancelling it (now cancels/awaits before lock release); repeated cooperative stop prematurely killed a pending cleanup (now reuses the grace period). Direct regressions passed. The Windows skip is the existing `refuses a symlinked log directory` guard, not missing streaming coverage. Final real diagnostic evidence includes two health reports, cancellation summary, worker loss, actual process exit and each request's persisted-byte baseline. The packaged fixture now uses the required profile, restricted environment and exit-before-settlement; no production security was weakened.

All 14 passing Windows flow sets refreshed (including newly recorded packaged-worker metadata) at `53db6b2`, source dirty. Changed final PNGs are reading/long-outline-zoom, recovery/generated-unsaved and recovery/usage-recovery; other refreshed PNG bytes are unchanged. Cleanup inspection found no test-owned process; the user's October 4 dev/watch parent and respawned normal-profile Electron host were preserved. No live request or unaccelerated 200-second acceptance was run; T03–T07 and integrated/external qualifications remain unresolved.

### T03 — accepted educational producer integration

Worker `t01_coordinator` reused as generation/domain implementer, GPT-6.1 Sol / high. Prerequisite commits T01 `53db6b2aea91328c4342a671440db96c7de7874a` and T02 `f20752ce0c84a915d7c1b10088a7b4233e5f2302` are accepted and reachable on `master`. One mutating worker owns educational producer admission/projection/cancellation/save recovery and focused tests; diagnostic migration/panel remain T04/T05. Coordinator-owned records are the only uncommitted baseline changes at release. Checks and acceptance are pending.

Primary and independent read-only reviewer inspected the developing lifecycle/projection. Follow-ups addressed synchronous admission before replacing unsaved state, exact task installation before notification/cancellation, real storage-retry draining, stopped admission at disposal, preserving renewed credential rotation before owner cancellation, deferring account epoch invalidation until owned cleanup, upstream preview abbreviation, main-clock byte evidence only on increased counters, and truthful terminal validation/tool history. Reviewer found no remaining source blocker after these fixes; direct terminal-history assertions and stable full gates are still pending.

Worker reports a focused run passed 116 tests in seven files, followed by 50 tests in three files after actual Pi projection assertions and validation-history fixes. Exact commands and final stable results remain to be recorded at handoff. Primary inspected the actual new projector/domain/account tests and confirmed `git diff --check` exit 0. Educational desktop IPC assertions are still being added; no T03 Electron/capture acceptance is claimed yet. T04 has a read-only migration plan only and has not been released for mutation.

Worker reports `npm run check` exit 0: 268 passed / 3 skipped across 22 files, lint, flow integrity, both TypeScript scopes and production build. Initial full desktop run receives the held structured drafts but exposes two cancellation assertions that query terminal state immediately after a button click, before asynchronous bridge/worker cleanup completes. The assertions will poll actual terminal settlement, preserving the cleanup guarantee; full desktop rerun and final capture review remain pending.

The initial desktop run finished exit 1: 10 passed / 3 failed / one expected packaged skip; all three educational flows had the new immediate post-click cancellation query. Those assertions now poll actual terminal outcome. A subsequent `npm run check` finished exit 1 only at stale flow metadata after lint and 269 passed / 3 skipped unit tests; its build step was not reached. Failed flows correctly retain prior references. A corrected full desktop rerun with the configured reporter is underway; neither earlier run establishes final acceptance.

Final coordinator acceptance supersedes the intermediate pending statements above. Source/captures were frozen after stable passing gates. Primary reviewed the complete implementation/test diff, independently confirmed flow integrity and diff checks, and opened the only changed PNG: reading/long-outline-zoom, with legible wrapped title, visible scrolling and existing narrow Dark navigation at 200% zoom. Worker reviewed twelve relevant PNGs. Existing usage feedback remains above the captured viewport and expanded-outline capture retains its internal-scroll limitation; T05/T06 must improve the relevant checkpoints. T03 establishes no new panel or packaged/live-provider claim.

| Final command / evidence | Actual result |
| --- | --- |
| `npx vitest run tests/unit/outline-projector.test.ts tests/unit/generation-service.test.ts tests/unit/topic-edit.test.ts tests/unit/account-service.test.ts tests/unit/worker-lifecycle.test.ts tests/unit/pi-outline-engine.test.ts tests/unit/ai-coordinator.test.ts` | Exit 0; 116 passed, seven files |
| `npx vitest run tests/unit/pi-outline-engine.test.ts tests/unit/generation-service.test.ts tests/unit/outline-projector.test.ts` | Exit 0; 50 passed, three files, before the final additional large-result/history assertions |
| Final `npm run check` | Exit 0; 269 passed / 3 skipped in 22 files, lint, flows, both type scopes and production build |
| Corrected full `npm run test:desktop` | Exit 0; 13 passed / one expected packaged-worker skip; configured Windows reporter |
| Post-refresh `npm run test:flows` | Exit 0; primary independently confirmed exit 0 |
| `git diff --check` | Exit 0; primary independently confirmed exit 0 |

Initial development commands also included a failed `npx tsc --noEmit -p tsconfig.main.json` (nonexistent configuration) and a failed `npm run typecheck` (test setup omitted returned `ai`), corrected before subsequent passing typecheck/full checks. No security or production behavior was weakened for test assertions. Reporter refreshed thirteen passing Windows flow sets at `f20752c`, source dirty; packaged references remain from T02. Cleanup found no owned test/utility/Electron-profile process or recent temporary root. Existing dev/watch PID 113408 and normal-profile Electron PID 60104/children were preserved. Primary resolved 132 relative links across eighteen changed documents with no missing target. All gate sessions are complete. Accepted commit is recorded after commit creation; T04–T07 and final integrated acceptance remain unresolved.

## Pre-implementation Pi transport audit

Read-only worker `pi_transport_audit` (GPT-6.1 Sol / high) inspected pinned Pi 1.0.2/OpenAI 7.19.0 and reported local in-memory SDK probes. Normal errors after `response.completed` reach Pi and reject; a `[DONE]` sentinel can stop SDK parsing before a later provider error. Named SSE errors/`data.error` can also throw before Pi's provider-event hook. These are adapter hazards, not proof of a live-provider fault.

T02 must byte-count/reset inactivity before parsing and gate terminal success/tool execution on a bounded private full-EOF observer in the same request, including errors after apparent completion/sentinel. T04 must verify actual provider model/status plus delta/final text evidence privately, never the configured Pi assistant model. Concurrent tee cancellation and SDK-hidden error classification need focused regressions. The audit made no source edits, live requests or capture runs; it does not substitute for implementation tests.

## Whole-bundle verification

Pending fresh coordinator verification after all ticket implementations. Required local gates: `npm run check`, `npm run test:desktop`, `npm run test:flows`, `npm run package`, then `npm run test:packaged`, with exact revision/environment and actual real-time ≥200-second and >30-second diagnostic evidence. Passing ticket checks are not bundle closure.

## External qualifications and limits

Live-account streaming and Sol/Luna eligibility are separate from protocol fixtures. Deliberately expensive live timing requests are not required or authorized by fixture acceptance. Native macOS/Linux appearance, OS screen-reader/accessibility and suspend/resume require separate actual evidence. Record observed manual findings and unavailable gates explicitly; do not silently mark them passed.
