# Application menus and navigation — requirement acceptance

Status: In progress; implementation and native qualification unverified
Source: [spec](menus-and-navigation.spec.md)
Execution: master, starting revision 9e2bb14904da1849b8497e64e1694b5d337d3ab2

The primary owns acceptance from actual source, test outputs and rendered evidence. Ticket status and a worker report alone do not prove a requirement. [Validation](validation.md) records exact commands/hosts; [ticket map](menus-and-navigation.tickets.md) gives prerequisites and owners.

| Requirement | Owner | Current evidence / remaining scope |
| --- | --- | --- |
| R01 — top strip composition and themes | T03, T04 | Pending implemented UI, actual Light/Dark screenshots and DOM behavior. |
| R02 — native integrated window chrome | T01, T02, T03, T04 | Pending decision amendment, startup/overlay implementation and actual native-window evidence; macOS/Linux and manual OS checks separate. |
| R03 — specified native commands | T02, T04 | Pending templates, actual menu activation and platform roles. |
| R04 — one command route, native editing | T02, T03, T04 | Pending renderer guard integration and focused native-role/menu equivalence tests. |
| R05 — bounded session visits/cursor | T01, T03, T04 | Pending pure transition/bounds and actual round-trip/branch evidence. |
| R06 — stable profile-handle identity | T01, T03, T04 | Pending adapter and relink/rename evidence against current workspace state. |
| R07 — accepted-only transaction commit | T01, T03, T04 | Pending cancel/rejection/stale/rapid-intent and known recovery-view evidence. |
| R08 — current-content/draft reading restoration | T03, T04 | Pending real disclosures/scroll/focus/drafts and changed-content fallback evidence. |
| R09 — owned cancellation/Saving/recovery | T03, T04 | Pending actual cleanup/save barriers, retained unsaved result and cross-view account diagnostics. |
| R10 — extensible shared typed model | T01, T03 | Pending pure test-only future destinations and one app owner; no shipped topic routes. |
| R11 — explicit unchanged-history actions | T03, T04 | Pending settings/model/disclosure/progress/refresh and no replay assertions. |
| R12 — keyboard/modals/IME/native menus | T02, T03, T04 | Pending real keyboard/focus/menu operation and native host qualifications. |
| R13 — narrow/zoom/reduced-motion safe areas | T03, T04 | Pending actual hit-tested 600x480/200% controls in both themes, without native overlap. |
| R14 — strict named authorized capabilities | T02, T03, T04 | Pending parser/sender/event rejection, unsubscribe and real bridge consumer tests. |
| R15 — continuing feature integration discipline | T01, T04 | ADR-0023 and authoring patterns exist at cdc57a7; implementation/current contract alignment still pending. |
| R16 — cataloged current flow/evidence | T04, primary | Pending navigation registration, actual passing/refreshed/reviewed captures and fresh cumulative gates. |

## Qualification boundaries

Native window behavior, OS keyboard/menu interaction and screen-reader qualification need actual host evidence. Renderer screenshots omit OS chrome and fixtures do not prove live account eligibility. Live inference is not required by this menu/history increment; existing provider qualification remains separate. Record matching native Windows/macOS/Linux outcomes rather than inferring support from unit/platform-option branches.

## Closure audit

Not complete. All ticket/runtime gates are pending. No acceptance checkbox is satisfied by this preparation record.
