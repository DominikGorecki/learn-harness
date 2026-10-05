# Ticket: ai-streaming.T07 - Mandatory future AI integration guidance and closure audit
Status: Done

## Source

- Spec: [Shared Pi streaming](ai-streaming.spec.md), R22–R23 and documentation/rollout tables.
- Product scope: [overview](../../../docs/overview.md), [PRD 01](../../prds/01-project-setup-and-outline.md).
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md).
- Patterns: [documentation](../../patterns-documentation.md), [architecture](../../patterns-architecture.md), [IPC/security](../../patterns-ipc-security.md), [flows](../../patterns-flow.md), [development/testing](../../patterns-development-testing.md).
- ADRs: [index](../../ADRs/INDEX.md), [0010](../../ADRs/ADR-0010-bounded-pi-outline-generation.md), [0015](../../ADRs/ADR-0015-explicit-model-access-verification.md), [0016](../../ADRs/ADR-0016-requested-extra-model-choices.md), plus T01's streaming decision. Preserve ADR-0012/0018/0019/0020 guarantees.

## Goal

Future contributors can discover and follow one mandatory coordinator/Pi/panel integration recipe, and maintained documentation accurately describes the verified implementation and its limits.

## Scope

### In scope

Final canonical/focused contributor guidance, current behavior in README/product docs, explicit scoped decision supersession, inference/timeout inventory and integrated evidence/link audit.

### Out of scope

New runtime features, another independent ADR for the same decision, rewriting historical evidence, Context Bank writes, new teaching claims or marking unverified external gates complete.

## Dependencies

- Depends on: [ai-streaming.T06](ai-streaming.t06.md).
- Unblocks: none.
- External prerequisites: actual upstream implementation/gate evidence. Live/native qualifications remain named limits rather than invented proof.

## Implementation plan

1. Audit production inference call sites, provider fetches/SDK stream calls, worker profiles, admission guards, cancellation and timeout composition against the implemented five-kind inventory. Exclude OAuth/renewal/discovery/revocation from inference rules deliberately. Resolve any bypass in its owning implementation ticket before documenting completion; this ticket cannot bless it.
2. Finalize T01's streaming ADR and explicit supersession notes on ADR-0010/0015/0016. Use the already allocated number, not the spec's obsolete 0021 placeholder. Preserve historical dates/validation and accepted token/endpoint/verification/serialization/publication rules. Update both indexes and discovery routes coherently; accepted decision and actual implementation status must agree.
3. Complete `ref/patterns-ai.md` and the AGENTS AI-work route: sanctioned profile/acceptance adapter → synchronous global lease → owner-aware main authorization → shared Pi byte liveness → bounded text/structured projection → workbench panel → cancellation/domain settlement → process/security/visual tests. A new direct fetch or separate progress modal requires an explicit durable decision; no implicit bypass for future features.
4. Update every constrained owner in the spec's documentation table: README; architecture; IPC/security; learning/data; design system; UX; renderer; development/testing; flow patterns/relevant flow narratives/catalog; pattern/ADR indexes; overview and PRD 01. State no total timeout while bytes arrive, 180-second inactivity and independent health, one-call/no-queue policy, honest previews, dashboard diagnostic panel, saving/unsaved recovery and safe troubleshooting. Remove stale normative fixed-deadline/direct-main diagnostic claims while retaining historical evidence.
5. Keep the selected design handoff unchanged as the approved concept; add implementation/actual-flow links only where evidence exists. Product docs describe the extension without claiming lesson delivery/mastery. Do not duplicate all canonical mechanics into each focused pattern; route to the canonical owner and preserve local responsibilities.
6. Finalize bundle `validation.md`/`acceptance.md` from actual T01–T06 evidence. Audit every R01–R23, exact commands/revision/environment, capture review and package profile evidence. Document actual accessibility/live/native/suspend-resume results or remaining limits. Whole-bundle closure belongs to the implementation coordinator after fresh integrated verification, not this ticket's prose or status alone.

## Patterns to apply

Progressive discovery and scoped supersession, truthful implemented-versus-proposed status, preserved historical research/evidence and real flow captures. Architecture guidance keeps pure core/shared and named privileged main/preload boundaries. Contributor instructions never grant general tools, new learning authority, ambient credentials or partial-save acceptance.

## Tests and verification

- Documentation-only verification: review every changed claim against implementation and acceptance evidence; resolve all affected local links; check AI route/index/ADR consistency; audit all five inference starts and retired timers; run `git diff --check` and `npm run test:flows` for flow discovery/reference changes.
- No-new-test exception: prose/navigation maintenance needs no mirrored unit test. T01–T06 own meaningful behavioral tests. If the audit requires code/process/user-flow fixes, update their owning tickets and rerun focused checks plus `npm run check`/`npm run test:desktop` before final evidence. Do not treat earlier stale results as fresh whole-spec validation.
- Preserve exact integrated check/desktop/flow/package/packaged outcomes and remaining external gates. Link future validation/acceptance records only after they exist; do not create passed claims without execution.

## Acceptance criteria

- [x] AGENTS/indexes route future AI work to the canonical producer recipe and approved panel.
- [x] All listed focused/product documents describe the actual migrated implementation; old conflicting normative rules are explicitly amended.
- [x] No current inference bypass or hidden total deadline remains in the source inventory.
- [x] Historical/design evidence remains identified separately from actual passing app captures.
- [x] R01–R23 evidence and gate limitations are auditable without unsupported live/platform/accessibility claims; local links and flow integrity pass.

## Manual verification

Follow the contributor discovery route as if adding a new AI feature; identify where lease, profile authority, streaming, acceptance, cancellation, UI and tests belong without reading unrelated research. Follow learner troubleshooting instructions against an isolated fixture run. Review acceptance evidence versus actual commands and captured states; documentation review alone proves no runtime behavior.

## Completion evidence

Accepted by the primary after actual diff/claim/source review. Worker `t07_docs`, GPT-6.1 Sol / medium; prerequisite T06 `5b339aec5bb4cb75135242459705181ae51578db` is reachable on `master`. Twenty-one granted contributor/product/ADR/design documents are updated; no runtime, test, catalog, capture or historical generated block was changed.

AGENTS, README, both indexes and every constrained focused/product owner route future AI features through the canonical sanctioned profile → synchronous lease → main authorization → shared Pi byte liveness/full EOF → bounded projection → bottom panel → independent domain settlement and verification recipe. ADR-0022 is implemented; scoped ADR-0010/0015/0016 amendments retire total inference/direct-main diagnostic rules while preserving endpoint, credentials, targets, allowance, proof, size/turn and publication guarantees. Approved design history is unchanged, with subsequent actual flow/validation links appended.

Both worker and primary source inventories find all five starts behind shared admission/Pi/panel and only one production Responses stream boundary, `pi-transport.ts`. OAuth/JWKS/renewal/discovery/revocation/login/static-resource deadlines are non-inference. Internal outline `timeoutMs` is byte idle, not cumulative duration. Global snapshot revision versus same-operation local sequence and renderer-only dismissal with bounded latest settled session retention are explicit.

Worker checked 338 relative links in twenty-one documents and ran `npm.cmd run test:flows` with `login:false`, exit 0. Primary inspected every actual documentation diff and confirmed diff checks/source consistency. No mirrored unit tests are needed for prose maintenance. Actual runtime/capture and external limits remain in [acceptance](acceptance.md) and [validation](validation.md). Whole-bundle closure still requires fresh primary check/desktop/flows/package/packaged gates and the final requirement audit; this ticket does not claim those have run.

## Notes

- Requirements covered: primary R22; supporting R01, R03, R12, R21, R23.
- Blockers: none for authoring. Existing automatic-local-commit guidance is unrelated standing workflow and must be preserved.
