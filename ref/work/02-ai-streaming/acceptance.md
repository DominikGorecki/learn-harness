# AI Streaming — Requirement Acceptance

Status: In progress
Source: [Shared Pi streaming spec](ai-streaming.spec.md)
Execution: `master`, starting revision `a44abbb1ce3129128738ec046fa6df16e016bb37`

This matrix records verified implementation evidence, not design approval or projected test results. The locked [design reference](../../../docs/design/component-designs/01-generation-streaming/generation-streaming-selection.md) remains the UI target. See [validation](validation.md) for actual commands and [ticket map](ai-streaming.tickets.md) for dependencies. Until evidence below is accepted, the requirement remains unresolved.

| Requirement | Primary ticket | Current acceptance / evidence |
| --- | --- | --- |
| R01 — shared Pi path for all five starts | T04 | T04 source inventory/private profile and actual diagnostic utility evidence accepted; all five producers share admission/Pi, final panel/integration audit pending T05–T07 |
| R02 — synchronous global admission/deduplication | T01 | T01 foundation and T03/T04 producer enforcement accepted; actual reciprocal bridge BUSY/count/byte and same-target reuse assertions pass; final integration pending T06 |
| R03 — receiving stream has no elapsed cutoff | T02 | T02 deterministic receiving/comment/fragment tests past old cutoffs and pinned SDK timeout audit accepted; ≥200-second real elapsed evidence pending T06 |
| R04 — silence recovery/per-turn idle | T02 | T02 header-once/empty/silent-tail/fresh-turn idle and timer cleanup tests accepted; integrated panel recovery pending T06 |
| R05 — independent worker health | T02 | T02 spawn/health/replay/cancellation/exit tests and real utility health/cancel/death journey accepted |
| R06 — retained byte/turn/file bounds | T02 | T02 request/response caps, T03 outline/topic/full-result bounds and T04 fixed 256 KiB diagnostic profile accepted; final integration pending T06 |
| R07 — truthful text/structured activity | T03 | T03 educational projection, actual Pi/tool activity, private-field filtering and terminal-history tests plus T04 boolean-only diagnostic/proof activity accepted; UI integration pending T05/T06 |
| R08 — tolerant provisional schema/candidate replacement | T03 | T03 immutable partial/repair/abbreviation tests and actual Pi full accepted outline >64 KiB accepted; integrated panel evidence pending T06 |
| R09 — ownership/revision/topic isolation | T01 | T01 foundation accepted: stale/duplicate/cancelled correlation and strict stable-topic preview tests; projector/UI evidence pending |
| R10 — completed independent acceptance before publication | T03 | T03 independent domain/source/topic acceptance and held completed-looking stream cancellation with saved-byte assertions accepted; integrated final audit pending T06 |
| R11 — immediate lifecycle/bounded preview delivery | T01 | T01 foundation accepted: 100 ms latest-preview batching, immediate phases/terminal, immutable wire/history bounds and subscriber isolation; real reference-fixture latency pending |
| R12 — locked bottom panel/connected icons | T05 | Pending actual Electron visual review |
| R13 — all five panels/dashboard diagnostic privacy | T05 | Pending |
| R14 — immediate accepted-overlay transition | T05 | Pending |
| R15 — independent completed-model proof | T04 | T04 per-completion identity/text and full-EOF rejection, independent badges/refresh/restart, terminal reentrancy and actual 31-second utility response accepted; final integrated UI audit pending T06 |
| R16 — awaited cancellation/publication guard | T03 | T03 task/validation/saving/cleanup/draining and T04 actual diagnostic exit, cancelled rotation and account disposal accepted; panel integration pending T05/T06 |
| R17 — drafts/unsaved/file baselines/storage-only retry | T03 | T03 unsaved/staged topic baselines survive global replacement and retry without inference; topic conflict/external-byte and Electron recovery assertions accepted; panel re-presentation pending T05/T06 |
| R18 — accepted domain terminal/lease release | T03 | T03 educational settlement/observer isolation and T04 independent verified settlement before account notification accepted; final panel/integration pending T05/T06 |
| R19 — theme/zoom/keyboard/motion/accessibility | T05 | Pending automated and actual review; OS accessibility qualifications separate |
| R20 — reading/scroll/navigation/account ownership | T05 | Pending |
| R21 — safe bounded liveness/health diagnostics | T02 | T02 safe byte/semantic-age/health/terminal summaries and T04 migrated model summaries/private reply filtering with real correlated logs accepted; final integrated audit pending T06/T07 |
| R22 — mandatory future AI recipe/ADR/guidance | T07 | ADR-0022 and canonical AI/discovery foundation accepted; producer migration and final maintained-document/source audit pending T07 |
| R23 — passing flow references/exact gate evidence | T06 | Pending |

## Integrated mandatory gates

Pending fresh code, real Electron, flow integrity, current-host package and packaged-worker verification after implementation. Baseline unit/build success does not prove streaming.

## External qualification

Signed protocol fixtures cannot establish live ChatGPT eligibility, real Sol/Luna access, pedagogical quality or mastery. Other native platforms, suspend/resume and OS accessibility require explicit actual evidence. Record unavailable or unauthorized qualification separately from delivered local behavior. Do not claim blanket accessibility certification from captures or DOM assertions.

## Closure

Not closed. The coordinator will audit every requirement, acceptance criterion, named deliverable and required gate against current files/runtime/test evidence before updating bundle status.
