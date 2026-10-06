# Application menus and navigation — requirement acceptance

Status: In progress; implementation and native qualification unverified
Source: [spec](menus-and-navigation.spec.md)
Execution: master, starting revision 9e2bb14904da1849b8497e64e1694b5d337d3ab2

The primary owns acceptance from actual source, test outputs and rendered evidence. Ticket status and a worker report alone do not prove a requirement. [Validation](validation.md) records exact commands/hosts; [ticket map](menus-and-navigation.tickets.md) gives prerequisites and owners.

| Requirement | Owner | Current evidence / remaining scope |
| --- | --- | --- |
| R01 — top strip composition and themes | T03, T04 | Pending implemented UI, actual Light/Dark screenshots and DOM behavior. |
| R02 — native integrated window chrome | T01, T02, T03, T04 | ADR-0024 and constrained amendments accepted under T01. Startup/overlay implementation and actual native-window evidence pending; macOS/Linux and manual OS checks separate. |
| R03 — specified native commands | T02, T04 | T02 templates and native roles pass platform/unit review; actual Electron callback/command delivery passes. Native focused-role/menu keyboard activation remains T04 evidence. |
| R04 — one command route, native editing | T02, T03, T04 | T02 callbacks emit fixed commands and revalidate availability/membership; no workspace mutation bypass. Renderer guard integration and native role/equivalence evidence pending. |
| R05 — bounded session visits/cursor | T01, T03, T04 | Pure initialization/traversal/branching/100-entry bounds pass focused tests. Actual integrated round-trip/branch evidence pending. |
| R06 — stable profile-handle identity | T01, T03, T04 | Pure adapter uses `ProjectSnapshot.id`; tests cover changed names/paths and known recovery views. Runtime relink/rename evidence pending. |
| R07 — accepted-only transaction commit | T01, T03, T04 | Pure token/cancel/rejection/stale/serialization tests pass. Authoritative event/reply correlation and runtime recovery evidence pending. |
| R08 — current-content/draft reading restoration | T03, T04 | Pending real disclosures/scroll/focus/drafts and changed-content fallback evidence. |
| R09 — owned cancellation/Saving/recovery | T03, T04 | Pending actual cleanup/save barriers, retained unsaved result and cross-view account diagnostics. |
| R10 — extensible shared typed model | T01, T03 | Generic pure model passes test-only future-destination coverage; shipped variants remain dashboard/project. App owner integration pending. |
| R11 — explicit unchanged-history actions | T03, T04 | Pending settings/model/disclosure/progress/refresh and no replay assertions. |
| R12 — keyboard/modals/IME/native menus | T02, T03, T04 | Pending real keyboard/focus/menu operation and native host qualifications. |
| R13 — narrow/zoom/reduced-motion safe areas | T03, T04 | Pending actual hit-tested 600x480/200% controls in both themes, without native overlap. |
| R14 — strict named authorized capabilities | T02, T03, T04 | T02 strict parser/authorization tests and actual Electron sender/frame rejection, command filtering/unsubscribe, unknown-handle and popup bridge checks pass. Integrated renderer consumer scope pending. |
| R15 — continuing feature integration discipline | T01, T04 | ADR-0023 and authoring patterns exist at cdc57a7; T01 adds pure-contract and ADR-0024 guidance with explicit pending runtime. Final maintained-contract alignment pending. |
| R16 — cataloged current flow/evidence | T04, primary | Pending navigation registration, actual passing/refreshed/reviewed captures and fresh cumulative gates. |

## Qualification boundaries

Native window behavior, OS keyboard/menu interaction and screen-reader qualification need actual host evidence. Renderer screenshots omit OS chrome and fixtures do not prove live account eligibility. Live inference is not required by this menu/history increment; existing provider qualification remains separate. Record matching native Windows/macOS/Linux outcomes rather than inferring support from unit/platform-option branches.

## Closure audit

Not complete. T01's pure foundation/decision and T02's native adapters pass scoped acceptance; T03-T04 integrated UI/history and native qualification gates remain open. Foundation/bridge tests do not satisfy integrated menu/history/UI acceptance.
