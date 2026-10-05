# AI Streaming — Requirement Acceptance

Status: In progress
Source: [Shared Pi streaming spec](ai-streaming.spec.md)
Execution: `master`, starting revision `a44abbb1ce3129128738ec046fa6df16e016bb37`

This matrix records verified implementation evidence, not design approval or projected test results. The locked [design reference](../../../docs/design/component-designs/01-generation-streaming/generation-streaming-selection.md) remains the UI target. See [validation](validation.md) for actual commands and [ticket map](ai-streaming.tickets.md) for dependencies. Until evidence below is accepted, the requirement remains unresolved.

| Requirement | Primary ticket | Current acceptance / evidence |
| --- | --- | --- |
| R01 — shared Pi path for all five starts | T04 | Pending |
| R02 — synchronous global admission/deduplication | T01 | T01 foundation accepted: coordinator race/reuse tests; producer enforcement still pending T03/T04/T06 |
| R03 — receiving stream has no elapsed cutoff | T02 | Pending deterministic and ≥200-second real elapsed evidence |
| R04 — silence recovery/per-turn idle | T02 | Pending |
| R05 — independent worker health | T02 | Pending |
| R06 — retained byte/turn/file bounds | T02 | Pending |
| R07 — truthful text/structured activity | T03 | Pending |
| R08 — tolerant provisional schema/candidate replacement | T03 | Pending |
| R09 — ownership/revision/topic isolation | T01 | T01 foundation accepted: stale/duplicate/cancelled correlation and strict stable-topic preview tests; projector/UI evidence pending |
| R10 — completed independent acceptance before publication | T03 | Pending |
| R11 — immediate lifecycle/bounded preview delivery | T01 | T01 foundation accepted: 100 ms latest-preview batching, immediate phases/terminal, immutable wire/history bounds and subscriber isolation; real reference-fixture latency pending |
| R12 — locked bottom panel/connected icons | T05 | Pending actual Electron visual review |
| R13 — all five panels/dashboard diagnostic privacy | T05 | Pending |
| R14 — immediate accepted-overlay transition | T05 | Pending |
| R15 — independent completed-model proof | T04 | Pending actual protocol/utility evidence |
| R16 — awaited cancellation/publication guard | T03 | Pending |
| R17 — drafts/unsaved/file baselines/storage-only retry | T03 | Pending |
| R18 — accepted domain terminal/lease release | T03 | Pending |
| R19 — theme/zoom/keyboard/motion/accessibility | T05 | Pending automated and actual review; OS accessibility qualifications separate |
| R20 — reading/scroll/navigation/account ownership | T05 | Pending |
| R21 — safe bounded liveness/health diagnostics | T02 | Pending |
| R22 — mandatory future AI recipe/ADR/guidance | T07 | ADR-0022 and canonical AI/discovery foundation accepted; producer migration and final maintained-document/source audit pending T07 |
| R23 — passing flow references/exact gate evidence | T06 | Pending |

## Integrated mandatory gates

Pending fresh code, real Electron, flow integrity, current-host package and packaged-worker verification after implementation. Baseline unit/build success does not prove streaming.

## External qualification

Signed protocol fixtures cannot establish live ChatGPT eligibility, real Sol/Luna access, pedagogical quality or mastery. Other native platforms, suspend/resume and OS accessibility require explicit actual evidence. Record unavailable or unauthorized qualification separately from delivered local behavior. Do not claim blanket accessibility certification from captures or DOM assertions.

## Closure

Not closed. The coordinator will audit every requirement, acceptance criterion, named deliverable and required gate against current files/runtime/test evidence before updating bundle status.
