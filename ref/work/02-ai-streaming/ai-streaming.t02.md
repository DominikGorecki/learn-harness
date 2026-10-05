# Ticket: ai-streaming.T02 - Pi byte liveness and independent worker health
Status: Open

## Source

- Spec: [Shared Pi streaming](ai-streaming.spec.md), R03–R06, R21 and Pi profiles/liveness policy.
- Product scope: [PRD 01](../../prds/01-project-setup-and-outline.md).
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md).
- Patterns: [architecture](../../patterns-architecture.md), [IPC/security](../../patterns-ipc-security.md), [development/testing](../../patterns-development-testing.md).
- ADRs: [0010](../../ADRs/ADR-0010-bounded-pi-outline-generation.md), [0018](../../ADRs/ADR-0018-development-file-diagnostics.md), [0019](../../ADRs/ADR-0019-topic-edits-and-project-file-access.md), plus the streaming decision established by T01.

## Goal

A Pi response receiving nonempty body data stays alive regardless of total duration. Silence and worker loss remain independently recoverable and diagnosable.

## Scope

### In scope

Shared privileged Pi transport/liveness utility, sanctioned private worker profile envelope, independent worker health, existing outline transport adoption, bounded safe diagnostics and transport/process tests.

### Out of scope

Model-test domain migration/verification, outline preview projection, UI, unlimited bytes/turns, automatic retries, new provider endpoints or ambient credentials.

## Dependencies

- Depends on: [ai-streaming.T01](ai-streaming.t01.md).
- Unblocks: [ai-streaming.T03](ai-streaming.t03.md), [ai-streaming.T04](ai-streaming.t04.md).
- External prerequisites: none; use local pinned Pi/OpenAI implementation to confirm timeout semantics.

## Implementation plan

1. Inspect `pi-outline-engine.ts`, `worker-client.ts`, `worker-entry.ts`, `worker-protocol.ts`, installed Pi 1.0.2 Responses code and underlying fetch/SDK settings. Extract a shared Pi transport facility usable by outline and tool-free model-access profiles. Keep credentials on the private port, restricted environment, approved destination/payload whitelist, redirects disabled, `store: false`, streaming and zero automatic retries.
2. Replace total inference abort with a monotonic 180-second inactivity controller: start at request initiation, reset on headers once to enter body wait, then reset on each nonempty body chunk **before SSE parsing**, including comments, heartbeats and incomplete fragments. Socket openness, empty chunks, semantic UI messages and local heartbeats do not reset it. Each provider turn starts afresh; local tool execution disarms its network timer. Waiting hint after 30 seconds without bytes is nonterminal.
3. Remove the fixed 190-second worker timer and audit all inner request/native header/body deadlines. Preserve bounded pre-header waiting without leaving an elapsed abort on a receiving stream. Do not use enormous timers, timer overflow or unverified zero-timeout semantics. Abort genuine silence as safe NETWORK with explicit retry; retain distinct byte/turn/validation/worker error classes.
4. Add 30-second spawn deadline and post-spawn worker heartbeat every 5 seconds/30-second responsiveness silence. Validate health sequence/phase independently of provider-byte counters. Healthy byte delivery must not be killed by an unrelated elapsed monitor; responsive local heartbeats cannot keep silent network alive. Handle spawn failure, exit, hung event loop, abort and shutdown with deterministic cleanup/termination before settlement.
5. Add private discriminated progress/health/transport frames with runtime type, size and monotonic sequence checks. Bind correlation from main launch context and reject malformed frames safely. Extend the envelope for sanctioned outline/model-access profiles; do not expose registration or arbitrary profiles through preload. T03/T04 provide projections and result adapters.
6. Preserve 16 outline turns, 4 MiB request, 8 MiB per response, outline shape/size and all current file budgets; diagnostic profile has one tool-free turn/256 KiB response. Count bytes even on heartbeat-only streams. Aggregate safe bytes/events/last-byte age, semantic age, health and terminal reason at most once/second plus immediate terminal summary. Apply ADR-0018 allowlists/queue bounds; logging failure never changes outcome.

## Patterns to apply

Main/utility own fetch, credentials, clocks and process control; core/shared contain no Node/Electron adapters. Public activity uses T01 DTOs, never raw SSE/tool/token data. No `.edu` or credential schema changes. UI only receives honest waiting/activity metadata, not health messages dressed as progress.

## Tests and verification

- Add `tests/unit/pi-stream-liveness.test.ts`, `worker-lifecycle.test.ts`; extend `pi-outline-engine.test.ts` and diagnostic/logging tests. Inject clocks/readers/private worker fakes for receiving streams beyond 180/190 seconds and SDK ten-minute defaults, comments/fragments, header-only/no-header silence, empty chunks, stalled body, per-turn reset, long local tools, byte/turn caps, abort and cleanup.
- Verify spawn failure/exit/unresponsive worker independently from healthy worker awaiting silent provider; malformed/oversized/replayed frames, exactly-once terminal handling, no leaked timers/readers/subscriptions and no premature next-owner admission.
- Use sentinel tokens, paths, identity, prompts, reply/file content and raw errors to assert absence from public state/logs; simulate logger failure and overload.
- Add/extend real utility/bridge coverage in `tests/desktop/logging.spec.ts` or an existing worker journey for cancellation, death and safe correlation. The unaccelerated 200-second acceptance journey belongs to T06; deterministic liveness/security coverage must pass here.
- Gates: focused tests, `npm run check`, `npm run test:desktop`; no-new-test exception not applicable. Record exact evidence in future `validation.md`/`acceptance.md`.

## Acceptance criteria

- [ ] No total timer expires a receiving response or multi-turn operation.
- [ ] Only observed nonempty chunks extend network liveness; silent streams and lost workers settle through separate tested policies.
- [ ] Existing request/response/turn/file limits and explicit cancellation remain enforced.
- [ ] Both sanctioned profile envelopes share the transport; secrets/raw events remain private and malformed worker frames fail safely.
- [ ] Bounded diagnostics distinguish silence, receiving data and worker health without content leakage.

## Manual verification

Run isolated fixture requests with heartbeat-only waits, silence and worker termination; inspect safe terminal classifications and prompt cancellation. Review removed timer call sites and installed SDK semantics. This ticket's fake clocks do not establish real elapsed acceptance or live-account behavior; T06 supplies the former.

## Completion evidence

Pending authorized implementation: transport/worker policy, timeout inventory, exact test results, safe diagnostic examples and cleanup evidence.

## Notes

- Requirements covered: primary R03, R04, R05, R06, R21; supporting R01, R07, R16.
- Blockers: none. Keep pinned SDK versions unless compatibility evidence proves a necessary change. OAuth/discovery/revocation deadlines are unchanged.
