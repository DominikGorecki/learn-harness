# Main-workspace acceptance

Status: In progress. T01 and T02 are locally accepted and committed; branding, canonical adoption and fresh whole-bundle gates are pending. This record does not close the bundle or claim native/accessibility qualification.

Source: [spec](main-workspace-design.spec.md), [selected contract](main-workspace-design.design.md), [validation](validation.md). Branch master; baseline d258a6d7ed5b869ec0cad2faa280e7c6915e84fc.

## Requirement coverage

| Requirement | Implementation and evidence | Current acceptance |
| --- | --- | --- |
| R01 | Explicit main-workspace/main-workspace-header roots and scoped workspace.css; existing shell, panel, overlay, dock and chrome styles preserved. Matched projects/appearance and edit/dock captures reviewed. Brand exception is T03. | Central scope accepted; branding pending |
| R02 | Workspace.tsx shared page/header/context/actions/action/section/row/message vocabulary used by Dashboard, ProjectSetup, App recovery/loading and OutlineView/TopicView. | Implemented; fresh cross-surface gate pending |
| R03 | OutlineView maps full saved title/overview/scope/level/outcomes and ordered topics, retaining assumptions/additions/coverage/source disclosures. Forty-topic reading fixture and actual both-theme overview captures. | Accepted T02 |
| R04 | Open first topic resolves startingLessonId, independently from Edit outline. Non-first recommendation and zero-inference/exact-byte topic-reading fixture. | Accepted T02 |
| R05 | Separate title/Open topic/Edit topic commands, stable ordinals, full title/question and explicit labels; no nested buttons. Keyboard/edit-return and long-row captures. | Accepted T02 |
| R06 | TopicView reads complete current saved question/overview/objectives/prerequisites/module method/title/purpose/task/sources with overview/edit commands. Offline real-file no-inference/unchanged-byte fixture. | Accepted T02 |
| R07 | Stable project snapshot handle/topic ID extends the existing controller/history/transaction owner, retaining its 100-entry bound. No visits for dialogs/disclosures/preferences. Controller and real desktop traversal/branch cases. | Accepted T02 |
| R08 | Topic and overview mementos use separate stable keys; current rename/deletion resolves fresh data and canonicalizes only the affected slot, preserving Forward. Held real-selection subscription/reply gap does not contaminate the prior owner's focus. Draft/refinement recovery and disappearing-topic editor covered. | Accepted T02 |
| R09 | Target-aware same-project saved reads use latest renderer snapshot, avoiding selectProject/storage recovery during Receiving, Cancelling and held Saving. Genuine operation ID/request count/exact bytes preserved; existing dashboard/other-project cancellation and Saving guards retained. | Accepted T02 |
| R10 | Existing inference/admission/storage/locality services unchanged; edit/recovery/model flows cover retained drafts, cancelled runs and storage-only retry. Distinct unsaved candidate prevents provisional reading, while older saved topic history remains usable. Typed read-only main projection verifies renderer behavior; native ACL is a separate qualification. | Accepted T02 with named qualification |
| R11 | Backend-confirmed Saved remains distinct from unsaved preview; meaningful central loading/issues/model/error/readonly/recovery states use scoped messages. No data clipping/omission found in reviewed captures. | Implemented; full final state inventory pending |
| R12 | Existing local Light/Dark preference remains; explicit filled baseline beneath opaque neutral gradients, static faint wash and scoped reduced motion. Appearance/projects fallback, retained draft and immediate navigation checks. | Accepted locally; final composed contrast pending |
| R13 | Forty long topics and 600px content window at 200% keep document width bounded. Actual Receiving and held Saving at 600x480/200% retain fully painted/hit-testable >=32px main command; short-height contextual header/actions adapt without dock changes. | Accepted T02 |
| R14 | Semantic headings/inputs/buttons/statuses, independent keyboard commands, visible focus, native selection, destination/edit-trigger restoration and no save-driven focus reset. Endpoint contrast evidence in validation; final composed-state/native manual review remains separate. | Local automation accepted; final contrast pending |
| R15 | ADR-0025 and initial canonical main-workspace guide/index routes adopted. Final verified consumers, branding recipe and focused/discovery/product amendments belong to T04. | Pending T04 |
| R16 | Registered topic-reading flow and refreshed affected eight journeys; worker/primary code checks pass, reviewed real PNGs/narratives recorded. Fresh full desktop/flows plus final evidence still required. | Pending final integration |
| R17 | Selected three-page Sculpted aperture glyph, one editable master and existing brand slot replacement. | Pending T03 |
| R18 | Reproducible native PNG/ICO/ICNS, fixed runtime/build resources and available-host package/native review preserving identities/fuses. | Pending T03 |

## Surface and primitive inventory

T01 covers dashboard empty/populated, setup/refinement, contextual header, loading and central recovery. T02 covers saved/proposed overview, saved topic, missing-topic/read-only presentation and active-dock reading. The canonical maintained inventory and complete theme/state capture matrix will be finalized after T03/T04.

## Qualifications and evidence limits

- Protocol fixtures exercise genuine Electron/bridge/Pi process/file behavior; they do not establish live-provider qualification or mastery/lesson delivery.
- Typed read-only projection is renderer evidence over real saved files; Windows ACL behavior is unrun.
- Endpoint contrast calculations and screenshots do not establish OS screen-reader or IME/manual-selection certification.
- Existing bundle 03 native title-control qualifications remain independently owned. This bundle must inspect available native branding evidence and name macOS/Linux/signing/installer checks not run.
- The model-test dashboard PNG privacy mask crosses part of the dock heading. Other captures/assertions establish that header; this capture has limited evidentiary use there.

## Ticket commits

| Ticket | Worker/model/effort | Accepted commit |
| --- | --- | --- |
| T01 | workspace_foundation, gpt-6.1-sol/high | 15802600833d551f31cf00466a7fd9b3a81b13f9 |
| T02 | topic_workspace, gpt-6.1-sol/high | 7bee459ac5e6e5c42ca1a1ac3b76736a9a365aed |
| T03 | branding, gpt-6.1-sol/high | Pending |
| T04 | workspace_docs, gpt-6.1-sol/medium; primary integrated verification | Pending |
