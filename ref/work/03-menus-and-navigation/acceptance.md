# Application menus and navigation — requirement acceptance

Status: In progress; T03 local implementation and maintained contracts verified, T04 regressions/final gates and native qualification open
Source: [spec](menus-and-navigation.spec.md)
Execution: master, starting revision 9e2bb14904da1849b8497e64e1694b5d337d3ab2

The primary owns acceptance from actual source, test outputs and rendered evidence. Ticket status and a worker report alone do not prove a requirement. [Validation](validation.md) records exact commands/hosts; [ticket map](menus-and-navigation.tickets.md) gives prerequisites and owners.

| Requirement | Owner | Current evidence / remaining scope |
| --- | --- | --- |
| R01 — top strip composition and themes | T03, T04 | Integrated strip order/placement and Light/Dark renderer captures pass T03 review; cumulative T04 audit remains. |
| R02 — native integrated window chrome | T01, T02, T03, T04 | ADR-0024 and startup/overlay activation implemented. Windows startup/renderer hit tests pass. [Partial native Windows observations](evidence/windows/index.md) confirm specific double-click/button/minimize/restore/Close/full-screen/theme behavior; drag/resize, clean restore-button input, full control safe-area and matching macOS/Linux/accessibility qualification remain open. |
| R03 — specified native commands | T02, T04 | T02 templates and native roles pass platform/unit review; actual Electron callback/command delivery passes. Native Windows File/View popups and keyboard-row Toggle sidebar activation were observed separately. Full focused roles/About/accelerator/menu matrix remains open. |
| R04 — one command route, native editing | T02, T03, T04 | Fixed main commands and guarded renderer owner implemented. Real owning popup Select All callback and keyboard edit/Undo pass; OS popup-row activation and other focused roles need native qualification. |
| R05 — bounded session visits/cursor | T01, T03, T04 | Pure 100-entry bounds and real desktop round-trip/current no-op/chooser cancellation/branching pass. |
| R06 — stable profile-handle identity | T01, T03, T04 | Adapter uses `ProjectSnapshot.id`; identity tests and actual projects relink/restart journey pass. Known unavailable destinations remain traversable. |
| R07 — accepted-only transaction commit | T01, T03, T04 | Controller tests cover target subscription before reply, newer unowned identity and stale/rapid/rejected settlement; real chooser cancellation, no-op and recovery pass. |
| R08 — current-content/draft reading restoration | T03, T04 | Actual project-isolated disclosures/scroll/focus and oversized drafts pass; removed stable topic falls back to current heading and repaired refresh preserves Forward/focus. |
| R09 — owned cancellation/Saving/recovery | T03, T04 | Existing cancellation/recovery/diagnostic journeys pass. Actual inference and storage-only Saving reject departure without queued resumption; fresh navigation succeeds. |
| R10 — extensible shared typed model | T01, T03 | Generic pure model and integrated renderer owner pass; shipped destinations remain dashboard/project and future variants remain test-only. |
| R11 — explicit unchanged-history actions | T03, T04 | Settings/disclosures/current refresh retain intended branch/context; long-stream traversal keeps one inference and retry stays storage-only. T04 retains cumulative classification/no-write audit. |
| R12 — keyboard/modals/IME/native menus | T02, T03, T04 | Actual renderer keyboard/mnemonic/Escape/focus, IME and modal checks pass; native callback/owning-popup boundary passes. Native Windows F10/Alt+V/Down/Enter/Escape and Ctrl+comma were observed; complete OS menu/edit/shortcut and accessibility qualifications remain open. |
| R13 — narrow/zoom/reduced-motion safe areas | T03, T04 | Both-theme 600x480/200% control hit tests, overflow and existing reduced-motion/painted-preview checks pass. Actual OS control safe-area review remains open. |
| R14 — strict named authorized capabilities | T02, T03, T04 | Strict parser/authorization and actual Electron sender/frame rejection/filtering/unsubscribe/unknown-handle/popup checks pass. Integrated consumer scopes commands and stale advisory state uses an acknowledged owning revision. |
| R15 — continuing feature integration discipline | T01, T04 | ADR-0023 and authoring patterns exist at cdc57a7; T01 adds pure-contract/ADR-0024 guidance. README, both indexes and constrained UX/renderer/design/architecture/IPC/testing/documentation guidance now describe delivered runtime and preserve the mandatory future-feature history/identity/restoration/guard/evidence recipe. |
| R16 — cataloged current flow/evidence | T04, primary | Navigation registered; all 52 Windows PNGs reviewed, 16 flow sets refreshed, final T03 code/desktop gates pass. Navigation/recovery/streaming narratives now describe their actual assertions and limitations. Six native Windows JPEGs are reviewed and separately recorded; T04 regressions and coordinator fresh whole-spec/native audit remain open. |

## Qualification boundaries

Native window behavior, OS keyboard/menu interaction and screen-reader qualification need actual host evidence. Renderer screenshots omit OS chrome and fixtures do not prove live account eligibility. Live inference is not required by this menu/history increment; existing provider qualification remains separate. Record matching native Windows/macOS/Linux outcomes rather than inferring support from unit/platform-option branches.

## Closure audit

Not complete. T01's pure foundation/decision and T02's native adapters pass scoped acceptance. T03's integrated implementation has passed the Windows code/desktop gates and source/52-capture review recorded in [validation](validation.md). Maintained-contract alignment and partial native Windows observations are now recorded; required native/window/accessibility qualifications remain unresolved. The table records local evidence and remaining T04 scope, not whole-bundle closure. T04 still needs focused actual-integration regressions for rejected/rapid/stale commands, history-aware relink/rename, held cleanup traversal, diagnostic traversal and explicit no-history/no-write effects, followed by fresh coordinator whole-spec verification.
