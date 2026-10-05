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

Worker `t01_coordinator`, GPT-6.1 Sol / high; independent reviewer `t01_review`, same model/effort. No prerequisites. Source baseline for the accepted checks: `db0b22d` plus reviewed T01 edits (the spec-only refinement was committed as `db0b22d` during this goal). Commit SHA is recorded after the ticket commit, avoiding a self-reference.

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

## Pre-implementation Pi transport audit

Read-only worker `pi_transport_audit` (GPT-6.1 Sol / high) inspected pinned Pi 1.0.2/OpenAI 7.19.0 and reported local in-memory SDK probes. Normal errors after `response.completed` reach Pi and reject; a `[DONE]` sentinel can stop SDK parsing before a later provider error. Named SSE errors/`data.error` can also throw before Pi's provider-event hook. These are adapter hazards, not proof of a live-provider fault.

T02 must byte-count/reset inactivity before parsing and gate terminal success/tool execution on a bounded private full-EOF observer in the same request, including errors after apparent completion/sentinel. T04 must verify actual provider model/status plus delta/final text evidence privately, never the configured Pi assistant model. Concurrent tee cancellation and SDK-hidden error classification need focused regressions. The audit made no source edits, live requests or capture runs; it does not substitute for implementation tests.

## Whole-bundle verification

Pending fresh coordinator verification after all ticket implementations. Required local gates: `npm run check`, `npm run test:desktop`, `npm run test:flows`, `npm run package`, then `npm run test:packaged`, with exact revision/environment and actual real-time ≥200-second and >30-second diagnostic evidence. Passing ticket checks are not bundle closure.

## External qualifications and limits

Live-account streaming and Sol/Luna eligibility are separate from protocol fixtures. Deliberately expensive live timing requests are not required or authorized by fixture acceptance. Native macOS/Linux appearance, OS screen-reader/accessibility and suspend/resume require separate actual evidence. Record observed manual findings and unavailable gates explicitly; do not silently mark them passed.
