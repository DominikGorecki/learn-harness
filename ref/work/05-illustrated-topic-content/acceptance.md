# Illustrated topic content acceptance

Status: In progress — no integrated acceptance claimed

Source: [spec](illustrated-topic-content.spec.md) · [tickets](illustrated-topic-content.tickets.md) · [validation](validation.md)

Branch: `master`; starting HEAD: `5c8ff9bb95a29373a5961f1194be3ba4c8436802`.

The coordinator will inspect implementation and actual evidence for each requirement. Ticket statuses alone do not establish acceptance. Required live/provider/editorial and native qualifications remain distinct from deterministic and renderer evidence.

| Requirement | Owning tickets | Acceptance evidence |
| --- | --- | --- |
| R01 | T05, T07 | Pending implementation and integrated verification. |
| R02 | T01, T02, T05 | Pending implementation and integrated verification. |
| R03 | T05 | Pending implementation and integrated verification. |
| R04 | T05, T07 | Pending implementation and integrated verification. |
| R05 | T01, T05 | Pending implementation and integrated verification. |
| R06 | T02, T05 | Pending implementation and integrated verification. |
| R07 | T01, T05 | Pending implementation and integrated verification. |
| R08 | T05, T07 | Pending implementation and integrated verification. |
| R09 | T03, T04, T05 | Pending implementation and integrated verification. |
| R10 | T01, T03, T04, T06 | Pending implementation and integrated verification. |
| R11 | T01, T04, T05, T08 | Pending implementation and integrated verification. |
| R12 | T01, T04, T05, T07 | Pending implementation and integrated verification. |
| R13 | T04, T05, T08 | Pending implementation and integrated verification. |
| R14 | T02, T05, T07 | Pending implementation and integrated verification. |
| R15 | T02, T07 | Pending implementation and integrated verification. |
| R16 | T02, T05, T07 | Pending implementation and integrated verification. |
| R17 | T02, T07 | Pending implementation and integrated verification. |
| R18 | T08 | Pending implementation and integrated verification. |
| R19 | T08 | Pending implementation and integrated verification. |
| R20 | T02, T08 | Pending implementation and integrated verification. |
| R21 | T06 | Pending implementation and integrated verification. |
| R22 | T06 | Pending implementation and integrated verification. |
| R23 | T01, T03, T06 | Pending implementation and integrated verification. |
| R24 | T03, T06 | Pending implementation and integrated verification. |
| R25 | T03, T06 | Pending implementation and integrated verification. |
| R26 | T03, T06, T07, T08 | Pending implementation and integrated verification. |
| R27 | T03, T04, T05, T08 | Pending implementation and integrated verification. |
| R28 | T03, T04, T05, T08 | Pending implementation and integrated verification. |
| R29 | T03, T06 | Pending implementation and integrated verification. |
| R30 | T03, T04 | Pending implementation and integrated verification. |
| R31 | T01, T03, T04, T05, T06, T08 | Pending implementation and integrated verification. |
| R32 | T01, T02, T04, T07 | Pending implementation and integrated verification. |
| R33 | T03, T06 | Pending implementation and integrated verification. |
| R34 | T01, T03, T04, T05, T08 | Pending implementation and integrated verification. |
| R35 | T02, T05, T07 | Pending implementation and integrated verification. |

## Local ticket acceptance

T01's strict chapter/provider DTOs, identity/bounds tests, core ports and ADR-0026 are accepted as the foundation. Existing AI desktop regressions passed; this is partial contract evidence for its owning requirement rows, not integrated feature acceptance. See [T01 evidence](illustrated-topic-content.t01.md#completion-evidence).

T02's portable storage/media adapter is accepted locally. Fault-injection, restart/relocation, candidate retention, immutable revision and source evidence tests plus existing topic-edit/reading desktop regressions provide partial adapter evidence for R02/R06/R14–R17/R20/R32/R35. Full decoding, authorized runtime serving and chapter reader acceptance remain pending; see [T02 evidence](illustrated-topic-content.t02.md#completion-evidence).

T03's protected provider/accounting adapter is accepted locally. Its 41 focused tests, real loopback metadata requests and full code check provide partial adapter evidence for R09/R10/R23–R31/R33/R34. Paid image dispatch, runtime IPC, estimates/history UI and live response/billing qualification remain pending; see [T03 evidence](illustrated-topic-content.t03.md#completion-evidence).

T04's fixed image utility is accepted locally. Real buffered-image waits/receiving, durable intent/accounting/asset acknowledgements, native off-main decode, private protocol bounds, cancellation and actual-exit/write barriers plus fresh Windows ASAR checks provide partial utility evidence for R09–R13/R27/R28/R30–R32/R34. Global runtime admission, chapter/replacement publication, serving/UI and live model/billing qualification remain pending; see [T04 evidence](illustrated-topic-content.t04.md#completion-evidence).

T05's chapter/runtime integration is accepted locally. The actual typed bridge produces a seven-text-call/two-image chapter with objective and raw-byte source coverage; account-free local media, text-only completion without new ChatGPT calls, explicit uncertain retry lineage, corrupt-ledger restart preservation and global admission through durable writes/actual exit all pass. Unit/fault evidence covers finite-budget continuation, source conflicts, immutable replacement and exact storage-only recovery; fresh ASAR evidence includes the chapter guidance and native decoding. This provides partial integration evidence for R01–R09/R11–R14/R16/R27/R28/R31/R34/R35; the reader/workbench UI, Settings and standalone replacement requirements remain pending. See [T05 evidence](illustrated-topic-content.t05.md#completion-evidence).

T06's sectioned Settings is accepted locally. The typed bridge validates ordinary keys without inference, preserves prior credentials on invalid replacement, exposes the three fixed models and safe cached estimates, and keeps exact app costs/unknowns separate from key-wide usage and publication state. Actual Electron recovery, session/secret/focus/filter/history/restart and provider BUSY assertions pass; primary reviewed normal/narrow Light/Dark Settings and affected consumer captures. This provides local UI evidence for R10/R21–R25/R29/R31/R33 and the Settings portion of R26. Full reader/replacement estimates and cumulative/live acceptance remain pending; see [T06 evidence](illustrated-topic-content.t06.md#completion-evidence).

T05's cache-preflight follow-up is accepted locally. Explicit activation recovers empty/aged/previous-failure metadata under provider ownership, pins compatible settings and preserves failed-discovery prose without paid dispatch. Eight units and eight actual Electron profile scenarios prove HTTP-free startup/reading/quotes/text-only and cancellation with no inference, alongside all four previous runtime flows. This strengthens local R09/R10/R12/R27/R28/R31/R34 evidence; it does not establish live prices or availability.

T07's reader and generation controls are accepted locally. Bounded offline pages, inert rich prose, TOC/history restoration, current-project identity and missing-media recovery pass actual Electron checks without inference. Explicit commands preserve old prose, correlate storage-only Retry Save with its accepted run and dispatch only an acknowledged retry slot. Primary reviewed the eight reader/four command checkpoints, including independently verified native raster bytes in Light/Dark and narrow 200% zoom. This provides local reader/command evidence for R01/R04/R08/R12/R14–R17/R26/R32/R35; focused checkpoint staleness, no-plan budget presentation and recorded-model follow-ups remain explicitly carried into T09. See [T07 evidence](illustrated-topic-content.t07.md#completion-evidence).

## Closure

Open. No paid live requests have been performed. Standalone replacement implementation, recorded integration follow-ups, full fresh cumulative checks and mandatory live/editorial requirement acceptance remain pending.
