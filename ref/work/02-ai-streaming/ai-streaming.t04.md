# Ticket: ai-streaming.T04 - Sol and Luna diagnostics through the shared Pi lifecycle
Status: Open

## Source

- Spec: [Shared Pi streaming](ai-streaming.spec.md), R01, R13, R15 and model-access profile/start semantics.
- Product scope: [PRD 01](../../prds/01-project-setup-and-outline.md); explicit account probes, not automatic eligibility checks.
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md).
- Patterns: [architecture](../../patterns-architecture.md), [IPC/security](../../patterns-ipc-security.md), [learning/data](../../patterns-learning-data.md), [flows](../../patterns-flow.md).
- ADRs: [0015](../../ADRs/ADR-0015-explicit-model-access-verification.md), [0016](../../ADRs/ADR-0016-requested-extra-model-choices.md), [0018](../../ADRs/ADR-0018-development-file-diagnostics.md), plus T01's streaming decision.

## Goal

Both explicit fixed-target model tests use Pi utility streaming and global admission while preserving independent, completed-response access proof and diagnostic privacy.

## Scope

### In scope

Tool-free diagnostic worker profile, private protocol evidence adapter, AccountService ownership/verification, accepted-start semantics, removal of direct inference bypass, atomic consumer compatibility and essential diagnostic process tests.

### Out of scope

Changes to OAuth/discovery/revocation transports, model choice entitlement, project data/tools in probes, arbitrary prompts/targets, new diagnostic UI or automatic retries.

## Dependencies

- Depends on: [ai-streaming.T02](ai-streaming.t02.md), [ai-streaming.T03](ai-streaming.t03.md).
- Unblocks: [ai-streaming.T05](ai-streaming.t05.md).
- External prerequisites: none. T03 stabilizes shared main/account ownership before this ticket removes the remaining diagnostic admission path.

## Implementation plan

1. Refactor `model-access-test.ts` and the provider/account ports: remove direct fetch/SSE execution and its total 30-second inference signal. Use the T02 Pi utility transport, one fixed short-reply turn, no tools/project path/brief/outline/source data and the existing 256 KiB cap. Main chooses only named Sol/Luna targets and sanctioned destination. Tokens remain private.
2. Collect actual provider terminal status/model and nonempty streamed/final text evidence privately through the Pi provider-stream event hook. Do not infer identity from configured SDK model. Preserve model matching including accepted dated suffixes, completed status, nonempty delta or final text, missing/incomplete completion, model mismatch and error-after-completion rejection through full stream settlement. Raw reply/events never enter renderer/public state/logs.
3. AccountService claims the same lease synchronously before credential renewal/preparation. Deduplicate same-target starts to the active operation/initial snapshot; competing targets or educational starts return BUSY with zero second requests. Remove independent test/inference admission booleans as authorities; retain feature-specific snapshot state and session epoch protections. Owner renewal works after admission; reconnect/sign-out/account replacement cannot interleave.
4. Keep named no-input test methods and strict sender/payload checks. Return the initial testing snapshot after admission rather than awaiting verification; later account/activity events deliver outcome. Update account hook/consumer and tests together so start resolution is never mistaken for verified access. T05 adds the accepted-overlay-to-panel transition; keep the existing surface usable in this intermediate ticket.
5. Publish bounded `model-test-evidence` progress with safe counts/booleans and truthful receiving/checking labels, never raw diagnostic reply. Verification is independent per model/connection session; refresh retains it, reconnect/sign-out/restart reset it. Failure/cancel preserves choices and the other model's badge. Closing settings does not cancel.
6. Route named diagnostic cancellation through the shared owner and await worker/network settlement before admission frees. Dispose both profiles on shutdown. Preserve explicit plan-allowance disclosure and sanitized console/JSONL summaries; logging failure cannot alter verification. Audit all five current starts against the shared coordinator/Pi path; no mixed bypass may remain.

## Patterns to apply

Main account service owns credentials/session proof; utility owns Pi; core coordinator owns lease/activity through ports. Shared/preload expose named fixed actions and safe snapshots only. No probe input grants project or arbitrary provider authority. Verification is ephemeral evidence of one request, not persisted entitlement or a prerequisite for selecting the requested extras.

## Tests and verification

- Extend `tests/unit/model-access-test.test.ts`, `chatgpt-provider.test.ts`, `account-service.test.ts`, coordinator/protocol tests and safe diagnostics tests. Use signed provider fixtures/private ports for delta-only, final-only, empty output, wrong identity/status, missing completion, post-completion error, cancellation, cap violations and unavailable credentials.
- Test both directions of outline/diagnostic contention during delayed authorization, duplicate same-target reuse, independent Sol/Luna proof, refresh/reconnect/restart, owner-aware renewal, release after each failure and initial-start reply versus later verification. Assert fixed tool-free input and absence of project/secret/reply sentinels in public frames/logs.
- Extend `tests/desktop/model-test.spec.ts` and relevant inference diagnostics: real utility/IPC verification, malformed no-input requests, independent badges, cancellation, reciprocal BUSY, dashboard ownership and unchanged educational files. Add a fixture response lasting **more than 30 real seconds**; give only affected slow tests a justified limit. T05 updates panel assertions when it exists.
- Gates: focused tests, `npm run check`, `npm run test:desktop`; update/review passing model-access flow references with the configured reporter. No-new-test exception not applicable. Record future `validation.md`/`acceptance.md` evidence.

## Acceptance criteria

- [ ] All five production inference kinds use shared admission and sanctioned Pi utility profiles; no direct diagnostic fetch remains.
- [ ] Actual completed identity/text evidence determines independent session verification, including rejection after apparent completion.
- [ ] Tests receive no project data/tools; public state contains status/count evidence only.
- [ ] Accepted starts return promptly; account events report later outcome and same-target duplicates consume one request.
- [ ] Streams beyond the old 30-second deadline succeed; cancellation/connection guards and safe diagnostics remain intact.

## Manual verification

From an isolated dashboard/account fixture, start Sol, dismiss/reopen settings, cancel, then verify each model independently. Attempt an educational start while testing and reverse the order. Inspect request counts and safe summaries. No live allowance consumption is required; fixtures do not prove account-specific eligibility.

## Completion evidence

Pending authorized implementation: inference inventory, initial-start contract migration, identity/privacy/race evidence and the actual >30-second fixture result.

## Notes

- Requirements covered: primary R01, R15; supporting R02, R03, R06, R07, R13, R14, R16, R18, R20, R21.
- Blockers: none. Both fixed targets are in scope; changing authentication/discovery deadlines is not.
