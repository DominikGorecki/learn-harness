# Illustrated topic content acceptance

Status: In progress — no integrated acceptance claimed

Source: [spec](illustrated-topic-content.spec.md) · [tickets](illustrated-topic-content.tickets.md) · [validation](validation.md)

Branch: `master`; starting HEAD: `5c8ff9bb95a29373a5961f1194be3ba4c8436802`.

The following map records accepted local evidence from locally accepted T01–T08 and identifies remaining requirement evidence. Every row still requires T09's fresh cumulative verification before integrated acceptance; ticket statuses alone do not establish it. Required live/provider/editorial and native qualifications remain distinct from deterministic and renderer evidence. T08 is locally validated; its commit is being recorded.

| Requirement | Owning tickets | Accepted local evidence | Remaining evidence |
| --- | --- | --- | --- |
| R01 | T05, T07 | [Reader/commands](../../flows/chapter-commands/index.md): explicit Generate Content, read-only controls and HTTP-free reading. | Fresh cumulative verification. |
| R02 | T01, T02, T05 | [Runtime](../../flows/topic-content/index.md) and storage faults assert stable identity/locality and exact project/source/unrelated bytes. | Fresh cumulative verification. |
| R03 | T05 | [T05](illustrated-topic-content.t05.md#completion-evidence): observed multi-call source/topic/outline context and raw-byte source evidence. | Fresh cumulative verification. |
| R04 | T05, T07 | Strict objective/section validators plus [reader](../../flows/chapter-reader/index.md) introduction/examples/misconceptions/synthesis/sources. | Live editorial review. |
| R05 | T01, T05 | [T05](illustrated-topic-content.t05.md#completion-evidence): bounded multi-stage authoring and valid-checkpoint pause/continuation. | T09 no-plan budget presentation repair. |
| R06 | T02, T05 | Durable checkpoint/fault/continuation tests; [recovery](../../flows/topic-content-recovery/index.md) excludes implicit paid replay. | T09 authoritative checkpoint staleness and focused reader recovery. |
| R07 | T01, T05 | Bundled app-owned educational-image guidance, plan validators and actual packaged chapter prompt assertions. | Live illustration/editorial review. |
| R08 | T05, T07 | Distinct local rasters, explicit text-only/Complete images and [missing-media recovery](../../flows/chapter-reader/index.md). | Live usefulness/quality review. |
| R09 | T03, T04, T05 | Fixed audited image endpoint/explicit key and existing ChatGPT chapter transport observed in [runtime](../../flows/topic-content/index.md). | Live separate-account routing qualification. |
| R10 | T01, T03, T04, T06 | [Settings](../../flows/openrouter-settings/index.md) preserves the three fixed choices and unavailable catalog state; preflight pins compatible settings. | Live qualification of all three models. |
| R11 | T01, T04, T05, T08 | [Chapter barriers](../../flows/topic-content-barriers/index.md) and [replacement barriers](../../flows/image-regeneration-barriers/index.md) prove shared child/standalone admission through actual exit and durable writes. | Fresh cumulative verification. |
| R12 | T01, T04, T05, T07 | Typed bounded activity plus [commands](../../flows/chapter-commands/index.md) and buffered-worker waiting/receiving evidence. | T09 no-plan truthful settlement; fresh regression gate. |
| R13 | T04, T05, T08 | Actual worker exit/write ordering and [replacement recovery](../../flows/image-regeneration-recovery/index.md) prove cancellation, held-preflight close and restart without paid replay. | Fresh cumulative verification. |
| R14 | T02, T05, T07 | Recoverable marker/source faults and actual [storage-only Retry Save](../../flows/chapter-commands/index.md), preserving old prose. | Fresh cumulative verification. |
| R15 | T02, T07 | Actual account-free [reader](../../flows/chapter-reader/index.md) restart, folder relocation and delayed TOC/history restoration. | Fresh cumulative verification. |
| R16 | T02, T05, T07 | Storage fingerprints/source conflicts and stable-topic removal/history assertions. | T09 published/progress staleness and removed-section reader acceptance. |
| R17 | T02, T07 | Native dimensions/local scheme/alt/captions; actual missing-raster deletion/restoration and reviewed Light/Dark/zoom frames. | T09 corrupt-metadata preservation; fresh cumulative verification. |
| R18 | T08 | Muted accessible overlays and reviewed normal/narrow Light/Dark [image dialog](../../flows/image-regeneration/index.md); keyboard activation and missing-raster repair. | Fresh cumulative verification; native screen-reader/touch qualification remains separate. |
| R19 | T08 | Actual edited prompt/model/cached estimate, independently recorded original/candidate model, comparison and caption/alt edits in [image regeneration](../../flows/image-regeneration/index.md). | Fresh cumulative verification. |
| R20 | T02, T08 | Immutable attempt/candidate correlation, retained originals, explicit Use/Keep and [zero-HTTP save recovery](../../flows/image-regeneration-recovery/index.md); committed restart/archive fault units. | Fresh cumulative verification. |
| R21 | T06 | Actual [sectioned Settings](../../flows/openrouter-settings/index.md), category/no-history/focus/session assertions. | Fresh cumulative verification. |
| R22 | T06 | [Appearance](../../flows/appearance/index.md) immediate preference/draft/restart/blocked-store tests; both zoom frames verify actual selected-theme pixels. | Fresh cumulative verification; native OS/accessibility remains separate. |
| R23 | T01, T03, T06 | Protected independent main key and named bridge sender/schema/readback checks; invalid replacement preserves prior bytes. | Fresh cumulative verification. |
| R24 | T03, T06 | Actual non-inference key validation and safe error/recovery UI, with zero paid diagnostics on save. | Live ordinary-key validation. |
| R25 | T03, T06 | Exact decimal totals/unknowns/key-wide separation and actual [usage/history Settings](../../flows/openrouter-settings/index.md). | Fresh cumulative verification; live returned-cost qualification. |
| R26 | T03, T06, T07, T08 | Cached fixed-setting/count estimates, selected retry context and one-image pre-dispatch [replacement estimate](../../flows/image-regeneration/index.md); recorded candidate excludes later model quote. | Fresh cumulative verification. |
| R27 | T03, T04, T05, T08 | Real metadata gateway and chapter/replacement intent/accounting barriers persist before dispatch; replacement faults assert zero/one actual POST. | Fresh cumulative verification; reachable reconciliation follows T09. |
| R28 | T03, T04, T05, T08 | Known/unknown costs survive failed assets, cancellation/save faults and accepted/rejected candidates independently of publication; exact ledger cost asserted in replacement flows. | Fresh cumulative verification; live billing comparison. |
| R29 | T03, T06 | Exact aggregation, paging/filter/details/restart/key-removal tests and reviewed request-history Settings. | Fresh cumulative verification. |
| R30 | T03, T04, T09 | Returned/missing cost/ID and fixed supported reconciliation/unknown ledger units. | T09 reachable validated non-inference reconciliation; live supported response/cost metadata. |
| R31 | T01, T03, T04, T05, T06, T08 | Strict safe DTO/private protocols, hostile named bridge/log/profile checks and edited replacement prompt excluded from ledger/activity. | Fresh cumulative verification. |
| R32 | T01, T02, T04, T07 | Hostile raster/Markdown/path tests, actual media/CSP sender checks, inert reader and every legal bounded page window. | Fresh cumulative and packaged verification. |
| R33 | T03, T06 | HTTP-free startup/quotes/history and actual bounded metadata validation with no inference activity. | Fresh cumulative verification. |
| R34 | T01, T03, T04, T05, T08 | Finite explicit activations; no startup/fallback/transport replay; acknowledged slot retry and one-candidate regeneration make exactly authorized requests. | Fresh cumulative verification. |
| R35 | T02, T05, T07 | Actual [whole-content replacement](../../flows/chapter-commands/index.md) keeps current prose through cancel and exact immutable publication. | T09 checkpoint recovery and fresh cumulative verification. |

## Local ticket acceptance

T01's strict chapter/provider DTOs, identity/bounds tests, core ports and ADR-0026 are accepted as the foundation. Existing AI desktop regressions passed; this is partial contract evidence for its owning requirement rows, not integrated feature acceptance. See [T01 evidence](illustrated-topic-content.t01.md#completion-evidence).

T02's portable storage/media adapter is accepted locally. Fault-injection, restart/relocation, candidate retention, immutable revision and source evidence tests plus existing topic-edit/reading desktop regressions provide partial adapter evidence for R02/R06/R14–R17/R20/R32/R35. Full decoding, authorized runtime serving and chapter reader acceptance remain pending; see [T02 evidence](illustrated-topic-content.t02.md#completion-evidence).

T03's protected provider/accounting adapter is accepted locally. Its 41 focused tests, real loopback metadata requests and full code check provide partial adapter evidence for R09/R10/R23–R31/R33/R34. Paid image dispatch, runtime IPC, estimates/history UI and live response/billing qualification remain pending; see [T03 evidence](illustrated-topic-content.t03.md#completion-evidence).

T04's fixed image utility is accepted locally. Real buffered-image waits/receiving, durable intent/accounting/asset acknowledgements, native off-main decode, private protocol bounds, cancellation and actual-exit/write barriers plus fresh Windows ASAR checks provide partial utility evidence for R09–R13/R27/R28/R30–R32/R34. Global runtime admission, chapter/replacement publication, serving/UI and live model/billing qualification remain pending; see [T04 evidence](illustrated-topic-content.t04.md#completion-evidence).

T05's chapter/runtime integration is accepted locally. The actual typed bridge produces a seven-text-call/two-image chapter with objective and raw-byte source coverage; account-free local media, text-only completion without new ChatGPT calls, explicit uncertain retry lineage, corrupt-ledger restart preservation and global admission through durable writes/actual exit all pass. Unit/fault evidence covers finite-budget continuation, source conflicts, immutable replacement and exact storage-only recovery; fresh ASAR evidence includes the chapter guidance and native decoding. This provides partial integration evidence for R01–R09/R11–R14/R16/R27/R28/R31/R34/R35; the reader/workbench UI, Settings and standalone replacement requirements remain pending. See [T05 evidence](illustrated-topic-content.t05.md#completion-evidence).

T06's sectioned Settings is accepted locally. The typed bridge validates ordinary keys without inference, preserves prior credentials on invalid replacement, exposes the three fixed models and safe cached estimates, and keeps exact app costs/unknowns separate from key-wide usage and publication state. Actual Electron recovery, session/secret/focus/filter/history/restart and provider BUSY assertions pass; primary reviewed normal/narrow Light/Dark Settings and affected consumer captures. This provides local UI evidence for R10/R21–R25/R29/R31/R33 and the Settings portion of R26. Full reader/replacement estimates and cumulative/live acceptance remain pending; see [T06 evidence](illustrated-topic-content.t06.md#completion-evidence).

T05's cache-preflight follow-up is accepted locally. Explicit activation recovers empty/aged/previous-failure metadata under provider ownership, pins compatible settings and preserves failed-discovery prose without paid dispatch. Eight units and eight actual Electron profile scenarios prove HTTP-free startup/reading/quotes/text-only and cancellation with no inference, alongside all four previous runtime flows. This strengthens local R09/R10/R12/R27/R28/R31/R34 evidence; it does not establish live prices or availability.

T07's reader and generation controls are accepted locally. Bounded offline pages, inert rich prose, TOC/history restoration, current-project identity and missing-media recovery pass actual Electron checks without inference. Explicit commands preserve old prose, correlate storage-only Retry Save with its accepted run and dispatch only an acknowledged retry slot. Primary reviewed the eight reader/four command checkpoints, including independently verified native raster bytes in Light/Dark and narrow 200% zoom. This provides local reader/command evidence for R01/R04/R08/R12/R14–R17/R26/R32/R35; focused checkpoint staleness, no-plan budget presentation and recorded-model follow-ups remain explicitly carried into T09. See [T07 evidence](illustrated-topic-content.t07.md#completion-evidence).

T08's individual image replacement is accepted locally. Twelve units and actual Electron candidate/recovery/barrier evidence establish exact attempts, original retention, editable prompt review, independent billing, explicit acceptance/discard and storage-only save/committed-cleanup recovery. Primary reviewed native Light/Dark/narrow/recovery references and affected reader/navigation captures. This supplies local R11/R13/R18–R20/R26–R28/R31/R34 evidence; cumulative/live qualification remains open. See [T08 evidence](illustrated-topic-content.t08.md#completion-evidence).

## Closure

Open. No paid live requests have been performed. Recorded integration follow-ups, full fresh cumulative checks and mandatory live/editorial requirement acceptance remain pending.
