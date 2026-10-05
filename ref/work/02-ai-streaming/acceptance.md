# AI Streaming — Requirement Acceptance

Status: Closed — local Windows implementation accepted; external qualification remains separate
Source: [Shared Pi streaming spec](ai-streaming.spec.md)
Execution: `master`, starting revision `a44abbb1ce3129128738ec046fa6df16e016bb37`

The primary reviewed the cumulative implementation, each ticket and R01–R23 against actual source, tests and captures. The locked [design reference](../../../docs/design/component-designs/01-generation-streaming/generation-streaming-selection.md) remains the UI target; concepts are separate from passing flow references. See [validation](validation.md) for exact commands and preserved failure history, and [ticket map](ai-streaming.tickets.md) for dependencies.

| Requirement | Primary ticket | Accepted local evidence |
| --- | --- | --- |
| R01 — all five inference paths | T04 | Main composition, both Pi profiles and all five `App.ai.start` producers audited; model-access, outline/editor/topic and ASAR journeys exercise the shared path. |
| R02 — synchronous global admission | T01 | Coordinator/producer races and same-target reuse tests; reciprocal desktop BUSY/request counts and held diagnostic-exit competing Luna rejection issue no extra request. |
| R03 — no total receiving deadline | T02 | Byte liveness tests exceed former 180/190-second and SDK cutoffs; actual unaccelerated ≥200-second receiving stream remains active/cancellable past 190 seconds and saves. |
| R04 — per-turn silence recovery | T02 | Silent request/header/body/tail, empty chunks, headers-once, per-turn reset/local tools and timer/reader cleanup regressions; explicit retry policy retains zero automatic inference retries. |
| R05 — independent worker health | T02 | Spawn/health/replay/crash/cancel/actual-exit tests; real utility health/death/cancellation diagnostic journey; local heartbeats never reset provider idle. |
| R06 — unchanged resource bounds | T02 | Request/response/turn limits, escaped private-result and topic/file bounds, streamed post-DONE response cap and fixed 256 KiB diagnostic profile tests. |
| R07 — truthful safe activity | T03 | Ordinary-text/structured-only and tool activity projection tests, private-field sentinels, real waiting/draft/checking/saving captures; diagnostics expose boolean evidence. |
| R08 — tolerant replaceable previews | T03 | Immutable partial/candidate/abbreviation tests and accepted output >64 KiB; real two-turn repair replaces its rejected draft and saves only the valid final document. |
| R09 — correlation and topic isolation | T01 | Coordinator turn/revision/stale-owner guards, adversarial stable-topic projection, global-revision/new-owner regression and actual cancelled/new-owner UI journeys. |
| R10 — independent completion/publication | T03 | Full-EOF/error-tail/tool withholding, independent outline/source/topic validation and held apparent-completion cancellation tests; real >190-second bytes remain unchanged before valid save. |
| R11 — prompt bounded delivery | T01 | 100 ms latest coalescing/immediate lifecycle/terminal and subscriber-isolation regressions; real named-bridge burst marker ≤250 ms, bounded UTF-8 escaped frames and strict global ordering. |
| R12 — approved bottom panel | T05 | Reviewed Light/Dark split dock with connected actual activity, wider readable preview, workbench scope/header/footer and unobstructed navigation; concept remains separate. |
| R13 — all-producer/dashboard privacy | T05 | All five actual starts share the dock; account diagnostic survives view changes with no project owner, material/tools/raw reply or unrelated save controls. |
| R14 — accepted overlay transition | T05 | Prompt focused panel after acceptance, <5-second initial diagnostic admission, rejected editor/input retention, synchronous pending guard, IME and safe failed-query resync tests. |
| R15 — independent model proof | T04 | Per-completion exact/dated identity, delta/final text and clean-EOF proof; late-error/mismatch/empty rejection, independent Sol/Luna badges and session refresh/restart; actual >30-second response and ASAR profiles. |
| R16 — cancellation and Saving guard | T03 | Reentrant awaited owner cleanup, no release before actual utility exit, abort/stale updates and validation races; Saving rejects cancellation and actual Cancel/navigation/focus assertions pass. |
| R17 — recovery and prior bytes | T03 | Full unsaved result/staged edits/baselines remain domain-owned across later diagnostics; actual recovery/storage-only retry keeps provider count fixed and topic conflicts preserve unrelated latest content. |
| R18 — domain-owned terminal release | T03 | Saved only after backend write; verified only after private account proof and genuine exit acknowledgment; ownership release and truthful unsaved/retry/Saved presentation tested. |
| R19 — adaptation and accessibility evidence | T05 | Actual themes, keyboard/IME/named regions, reduced motion, selectable text, long topic/request and 600×480/200% clipped/hit-tested prose+label+Cancel; representative token contrast. OS screen-reader qualification remains unrun. |
| R20 — reading/navigation ownership | T05 | Independent saved/preview scrolling, reader focus through cancellation, guarded project switching and account-scoped navigation exercised in actual Electron. |
| R21 — safe bounded diagnostics | T02 | Allowlisted byte/semantic-age/health/terminal counters, secret/content sentinels, observer failure isolation and actual correlated logs; no paths/tokens/raw content/protocol/tool data. |
| R22 — future producer requirements | T07 | AGENTS/README/indexes/ADR-0022 and all constrained focused/product owners require sanctioned profile→lease→main authorization→Pi→bounded projection→panel→domain settlement; scoped prior norms amended, five starts/remaining timers audited. |
| R23 — reviewed flows and exact gates | T06 | Cataloged long/repair and producer/recovery references published by the configured reporter; actual PNG review, link/flow integrity and exact primary code/desktop/package/ASAR outcomes recorded with external limits. |

## Integrated mandatory gates

Fresh primary gates at `e83944bd36b59663b0995167046385fb25293b70`, after all seven implementation commits and the T02 termination-test repair, passed: `npm.cmd run check` (282 unit tests / three existing platform skips), full `npm.cmd run test:desktop` (fifteen passed / one expected packaged-ASAR skip), `npm.cmd run test:flows`, Windows x64 `npm.cmd run package`, `npm.cmd run test:packaged` (one passed), and post-packaged flows.

The unaccelerated receiving stream lasted 200,508 ms; its latest marker reached the named bridge in 130 ms, with 82,348 provider bytes, 56 bounded frames and one burst semantic preview. Real write/exit barriers, unchanged-byte and independent acceptance assertions passed. Primary reviewed all nineteen final changed PNGs, including actual clipped prose, provisional label and Cancel at 200% zoom.

The final capture review found a repair checkpoint reaching the bridge before React rendered the first draft. T06 follow-up `d048e8c757c104c13224430d53f2f91d39b52616` adds actual rendered-title assertions. Its scoped repair journey and fresh `npm.cmd run check` passed; all three repair PNGs were reopened and accepted. This test-only follow-up changes no qualified runtime, package, security or timeout. Full-gate evidence above and later scoped evidence are distinguished explicitly.

## External qualification

Signed protocol fixtures do not establish live ChatGPT eligibility, real Sol/Luna access, pedagogical quality or mastery. Live-account streaming, native macOS/Linux, suspend/resume and OS screen-reader/accessibility qualification remain **unrun**. Representative contrast, DOM announcements and keyboard/actual image evidence do not certify all accessibility states.

The packaged test proves real ASAR worker/dependency loading, all three sanctioned profiles and actual process exit using an automation-capable development host. Hardened packaged-window startup, installers/certificate signing and public release qualification remain **unrun**. Nonfatal build warnings are recorded in validation. These limitations are explicit separate qualifications, not substituted by fixture evidence.

## Closure

T01–T07 and both test-only follow-ups are accepted locally. No required local gate or implementation criterion remains open. The primary owns final evidence, link/diff/resource review and the separate local verification/closure commit. The bundle directory is preserved; future capabilities and external qualification require their own actual evidence.
