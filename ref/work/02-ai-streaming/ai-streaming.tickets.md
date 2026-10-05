# Shared Pi Streaming — Ticket Map

Status: Open
Source: [Ready spec](ai-streaming.spec.md)
Date: 2026-10-05

These tickets authorize planning only. All seven start Open; no implementation, test execution or runtime acceptance is claimed. Implement the complete bundle before release so no diagnostic or educational inference bypass remains.

## Implementation order

| ID | Observable outcome | Depends on |
| --- | --- | --- |
| [ai-streaming.T01](ai-streaming.t01.md) | One global owner and bounded named activity contract; foundational streaming ADR | None |
| [ai-streaming.T02](ai-streaming.t02.md) | Receiving Pi streams survive elapsed time; silence and worker loss are distinct | T01 |
| [ai-streaming.T03](ai-streaming.t03.md) | All outline producers stream safe drafts and preserve acceptance/save recovery | T01, T02 |
| [ai-streaming.T04](ai-streaming.t04.md) | Both model tests use Pi/global admission with independent session proof | T02, T03 |
| [ai-streaming.T05](ai-streaming.t05.md) | Approved bottom panel, connected icons and all-producer transitions | T03, T04 |
| [ai-streaming.T06](ai-streaming.t06.md) | Real ≥200-second Electron acceptance, reviewed references and packaged profiles | T05 |
| [ai-streaming.T07](ai-streaming.t07.md) | Mandatory future producer guidance and evidence audit | T06 |

The order is topological and intentionally follows shared main/account integration. T03 supplies owner-aware authorization; T04 finishes removal of distributed admission. T05 consumes both migrated producer contracts. Every implementation ticket owns its essential tests; T06 adds real-time/packaged acceptance rather than deferring security coverage.

## Requirement coverage

Primary means implementation ownership; supporting tickets verify or consume the same invariant across a boundary.

| Requirement | Primary ticket | Supporting evidence/consumer |
| --- | --- | --- |
| R01 — all five inference starts | T04 | T01–T03 foundations; T06 integrated inventory; T07 source/document audit |
| R02 — synchronous global admission | T01 | T03/T04 producer races; T05 UI guards; T06 request counts |
| R03 — no elapsed abort while receiving | T02 | T04 old diagnostic cutoff; T06 real ≥200 seconds; T07 guidance |
| R04 — recoverable network silence | T02 | T06 integrated recovery |
| R05 — separate worker health | T02 | T06 process acceptance |
| R06 — retained limits/classification | T02 | T03 outline/file bounds; T04 diagnostic cap; T06 integration |
| R07 — truthful text/structured activity | T03 | T02 liveness separation; T04 safe evidence; T05 presentation; T06 captures |
| R08 — tolerant replaceable draft schema | T03 | T06 structured/repair acceptance |
| R09 — correlation/stale/topic guards | T01 | T03 topic projector; T05 subscription ordering; T06 cancellation/new-run evidence |
| R10 — completed independent acceptance | T03 | T06 saved-byte acceptance |
| R11 — bounded timely delivery | T01 | T03 projection; T05 consumer; T06 burst timing |
| R12 — locked bottom panel | T05 | T06 reviewed captures; T07 maintained guidance |
| R13 — all producers/dashboard/privacy | T05 | T04 fixed diagnostic data scope; T06 cross-domain journey |
| R14 — immediate accepted transition | T05 | T04 initial testing reply; T06 integrated behavior |
| R15 — independent model proof | T04 | T06 real process verification |
| R16 — cancellation/publication guard | T03 | T01 lease; T02 worker abort; T04 diagnostic cancel; T05 controls; T06 races |
| R17 — drafts/unsaved/storage retry | T03 | T05 recovery UI; T06 byte/request assertions |
| R18 — domain terminal/lease release | T03 | T01 lifecycle; T04 verified terminal; T05 labels; T06 integration |
| R19 — themes/zoom/keyboard/motion | T05 | T06 actual captures/manual evidence |
| R20 — saved reading/navigation | T05 | T03 retained unsaved owner; T04 account scope; T06 integrated navigation |
| R21 — safe aggregate diagnostics | T02 | T04 model summaries; T06 inference diagnostics; T07 troubleshooting |
| R22 — mandatory future AI route | T07 | T01 foundational ADR/index/pattern adoption before durable changes |
| R23 — passing flows/exact evidence | T06 | T05 checkpoint ownership; T07 final narrative/evidence audit |

## Decision and evidence notes

- The source spec named ADR-0021 as a provisional next number. The current index now assigns it to automatic local commits. T01 must recheck numbering; ADR-0022 is currently next. This allocation update does not change streaming scope or overwrite another decision.
- During implementation, each ticket records actual focused checks in this bundle's `validation.md` and requirement evidence in `acceptance.md`. These records are not authored now as speculative success reports.
- Required implementation gates: `npm run check`, `npm run test:desktop`, `npm run test:flows`, current-host `npm run package` then `npm run test:packaged`; meaningful focused checks belong to their owner tickets. Preserve sandboxing and configured capture reporter.
- Live-account eligibility/streaming, other native OS appearance, suspend/resume and manual accessibility require explicit actual evidence and remain separate from signed protocol fixtures. No deliberately expensive live timing call is required.
- Material authoring blockers: none. Graphical/package availability and external qualifications must be recorded at execution. The bundle remains incomplete while implementation or required gates remain unresolved.

Next authorized stage: use `spec-implement` for the whole bundle, or `spec-implement-ticket` for one ready ticket. Ticket authoring does not invoke either stage.
