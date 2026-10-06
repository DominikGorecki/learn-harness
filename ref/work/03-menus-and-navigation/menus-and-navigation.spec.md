# Spec: Application menus and navigation history

Status: Ready for implementation
Date: 2026-10-06
Source: User-supplied top-bar screenshot and spec conversation; explicit request to track future in-project navigation and update contributor patterns.
Goal: Learners can discover application commands and retrace visits without losing their working context; future navigation features join the same history approach.

## Summary

Add a compact application strip containing Back, Forward, the sidebar toggle and File/Edit/View/Help. Integrate it into the window title area while retaining native window buttons. Add session navigation history for the destinations implemented today: the Projects dashboard and individual project workspaces. Define an extensible destination contract and a mandatory feature-integration discipline for future topic/activity navigation.

This spec authorizes planning only. No application implementation, tickets, screenshot refresh or runtime acceptance is included in this authoring change. The related pattern updates adopt contributor requirements now; they do not claim that menus, history or topic pages already work.

## Problem / Context

The reference combines navigation and application menus in one quiet top strip. Current [main composition](../../../src/main/index.ts) uses native window chrome and blocks web navigation. [App](../../../src/renderer/src/app/App.tsx) composes the rail/sidebar/workspace, keeps the sidebar toggle beside its breadcrumb, and dispatches open/select/dashboard intents without a history stack. [useWorkspace](../../../src/renderer/src/features/projects/useWorkspace.ts) returns authoritative operation results and protects newer subscription state from late responses.

Project navigation already offers explicit cancellation before leaving project-owned AI work. Account model diagnostics may continue across views; Saving is not cancellable. These rules remain governed by [ADR-0012](../../ADRs/ADR-0012-generation-recovery-and-navigation.md) and [ADR-0022](../../ADRs/ADR-0022-shared-pi-streaming-lifecycle.md).

[OutlineView](../../../src/renderer/src/features/projects/OutlineView.tsx) currently uses topic disclosures, not topic routes. Future in-project destinations are desired, but their screens and product behavior are outside this increment. The [overview](../../../docs/overview.md) and [PRD 01](../../prds/01-project-setup-and-outline.md) retain learning scope. Baseline [acceptance](../01-project-setup-and-outline/acceptance.md) and subsequent [streaming acceptance](../02-ai-streaming/acceptance.md) distinguish current behavior from live/native qualifications.

## Goals

- Provide a screenshot-inspired, theme-aware application strip with working menus and native window behavior.
- Make Back/Forward useful across current destinations, with drafts, reading position and disclosures preserved for the application session.
- Use one navigation pipeline for sidebar, dashboard, breadcrumb, menus, buttons and shortcuts.
- Make additions and changes to navigation explicitly account for history, identity, recovery and acceptance evidence.

## Non-goals (Strict)

- Topic/lesson/module/session screens, routing controls or new learning capabilities.
- Recording existing disclosure toggles, settings dialogs, editor dialogs, model choices, scroll events or AI progress as destinations.
- Persisting history or unsaved drafts across restart, browser URL routing, external browsing or deep links.
- Undoing saved project changes, replaying inference, tabs, pinning, search or a command palette.
- New Help websites, arbitrary external-link APIs, generic IPC, custom-drawn window buttons or new close/quit recovery guarantees.
- Changing AI admission, cancellation, saving, retry or topic file locality.

## Scope

### In scope

The integrated top strip; current application menu commands; session history and navigation state restoration; named menu/chrome bridge capabilities; accessible keyboard behavior; native-platform and visual evidence; contributor pattern updates.

### Out of scope

Future in-project navigation UI and cross-session navigation storage. Extensibility is required without shipping placeholder destination kinds or inactive controls.

## Requirements (Functional)

| ID | Testable requirement | Verification path |
| --- | --- | --- |
| R01 | On Windows/Linux show a full-width strip above the rail/sidebar/workspace, ordered Back, Forward, sidebar toggle, File, Edit, View, Help. Move the existing toggle; keep project breadcrumbs in the contextual workspace header. Use current Light/Dark tokens. | Actual Electron screenshots in both themes; desktop DOM assertions. |
| R02 | Integrate the strip into the title area with native window controls. Preserve dragging from empty strip space, resize, minimize/maximize/restore, system window behavior and control safe areas. On macOS retain the system application menu and native traffic lights, with arrows/toggle in the window. | Native Windows/macOS/Linux manual window checks and startup/option assertions; external evidence recorded separately. |
| R03 | File offers Open project, Recent projects and Close window; Edit offers standard text Undo/Redo, Cut/Copy/Paste and Select all; View offers Back/Forward, Toggle sidebar, Appearance and Zoom in/out/reset; Help offers About Learning Studio. macOS additionally follows standard application/Quit conventions. Show only implemented commands; Recent projects uses known profile handles and current backend labels. | Menu-template unit tests and real Electron command activation. |
| R04 | Menus, shortcuts and existing controls use the same command actions and availability rules. Application navigation commands dispatch through the renderer's guarded navigation pipeline; native menu callbacks do not call workspace mutations directly. Standard text editing uses Electron roles and applies to the focused surface. | Menu adapter and renderer command tests; desktop equivalence and focused-input editing assertions. |
| R05 | Maintain one ordered session history and cursor. Bootstrap once from the authoritative initial destination. Successfully visiting a different destination appends and clears any forward branch; selecting the current destination is a no-op and retains Forward. Back/Forward move the cursor without appending. Disable unavailable directions. Retain at most 100 entries, dropping the oldest on append beyond the cap. | Pure history unit tests: initialization, traversal, branching, duplicates and bounds; desktop round trip. |
| R06 | Initial destinations are dashboard and project workspace identified by profile project handle. Project titles, filesystem paths and outline revision are not destination identity. Distinguish a profile handle from portable .edu projectId. Relinking/renaming the same project preserves its destination; backend identity checks remain authoritative. | Workspace/history adapter tests; moved-folder and renamed-project desktop journeys. |
| R07 | Commit history only after the intended destination has been resolved and accepted by the owning service/view. Cancelled folder selection, Stay here, API failure, BUSY rejection and stale/duplicate events change neither cursor nor forward branch. A valid missing/unreadable project recovery view counts as a successfully reached project destination. Serialize navigation and ignore rapid repeated commands while a transition or guard is pending. | Unit race/error tests and desktop chooser-cancel, guard-cancel, recovery and failure assertions. |
| R08 | Restore project-owned goal/edit drafts and destination reading context. Capture main scroll position and expanded topic/context disclosures before leaving; restore after authoritative content is rendered. Retain only existing stable disclosure IDs after outline changes, clamp invalid scroll offsets, and use a safe heading focus target when a previous anchor disappears. Do not restore old outline content or clear newer drafts. | Desktop long-outline, draft, disclosure, changed-content and focus checks; restoration unit tests. |
| R09 | Back/Forward and menu navigation obey the current project-operation guard: Stay here leaves history unchanged; Cancel and switch awaits owned cleanup before traversal; Saving blocks departure until settlement and requires a fresh permitted command afterward. Account diagnostics continue across dashboard/project changes. Unsaved output remains domain-owned and recoverable on return. | Real fixture recovery/streaming journeys; cleanup barrier and unchanged provider-request-count assertions. |
| R10 | Use typed destinations, explicit push/replace/traverse effects, canonical identity/equality and destination resolution/restoration in one renderer navigation owner. New intra-project destinations must be integrable without a second history stack, URL reloads or privileged renderer imports. Ship only current destination variants. | Focused architecture review and pure history tests using test-only destination values; no placeholder learner UI. |
| R11 | Sidebar toggles, ordinary disclosures, settings/account/edit dialogs, model preferences, saves and streaming snapshots leave history unchanged. Refresh reconciles the current location without fabricating visits. Traversal never submits an AI request or replays a write. | Unit classification/reconciliation tests and desktop menu/settings/model/read-only assertions. |
| R12 | Provide named/tooltipped arrow buttons and menu accelerator labels. Back/Forward use Alt+Left/Right on Windows/Linux and Cmd+[/] on macOS. Preserve Ctrl/Cmd+O, Ctrl/Cmd+, and the existing scoped sidebar shortcut. Menus support keyboard entry, arrows and Escape with focus restoration; no navigation shortcut acts behind a modal, during IME composition or when owned by a text editing control. | Keyboard-only desktop journeys including editing and IME; native menu keyboard checks. |
| R13 | At 600x480 and 200% Electron zoom preserve native controls and reachable navigation/menu commands without horizontal page overflow or overlap. Compact Windows/Linux menus into a labelled Menu button when space requires it, keeping Back/Forward available. Honor reduced motion. | Actual hit-tested narrow/zoomed Electron captures, both themes and manual native-chrome safe-area review. |
| R14 | Privileged menu/chrome integration uses strict named shared/preload/main capabilities and sanitized fixed command events. Reject unknown commands, unexpected payload fields, untrusted senders and invalid handles. No general URL/path/channel/clipboard/process API is added. | Shared parser/capability rejection tests, actual preload event/unsubscribe journey and existing security suite. |
| R15 | Every feature that adds, removes or changes a navigation entry point/destination documents its history effect, identity, restoration, failure/fallback behavior, ownership guard and tests. In-project destinations join the same history when implemented. Update the constrained patterns and flow coverage with the feature; record justified no-history effects explicitly. | Contributor guidance/ADR review now; requirement-to-evidence review in every subsequent navigation spec and implementation. |
| R16 | Add a documented navigation/menu flow, update affected existing flows and review actual passing captures. Record code/desktop gates and native chrome qualification separately; renderer-only captures do not prove OS window behavior. | Flow catalog/reference integrity, reviewed PNGs, validation and acceptance records at implementation. |

## Requirements (Non-functional)

- Performance: bounded 100-entry history; pure cursor updates and bounded view mementos. Do not load content snapshots into history or add polling. React remains responsive while main performs authorized short operations.
- Reliability: one in-flight navigation transaction; a rejected transition preserves cursor/branch and current presentation. Newer backend snapshots cannot be overwritten by stale menu state, query results or navigation completion.
- Security / Privacy: retain context isolation, sandboxing, denial of web navigation/popups/permissions and current CSP. History holds opaque IDs and presentation state in memory; no credentials, content snapshots or prompts in menu bridge state or logs.
- Accessibility: native controls, keyboard menu operation, readable focus/disabled states, safe focus restoration and theme contrast remain part of acceptance. Native screen-reader results are explicit qualifications, not inferred from DOM tests.
- Observability: use existing safe diagnostics only where needed, with fixed command/outcome categories and counts. Never log destination titles, paths, text drafts or history payloads. No new telemetry service.

## Proposed Solution

### Ownership and data flow

- `src/renderer/src/app`: a small navigation controller and command adapter replace scattered destination switching. Renderer owns history, pending navigation, cursor, destination equality and presentation mementos. Extract shell chrome into an app component rather than further enlarging App.tsx. A pure history module needs no router/state library.
- `src/renderer/src/features/projects`: keep authoritative workspace loading through useWorkspace and existing typed bridge. Capture/restore outline disclosure state through stable lesson IDs and fixed context keys. Draft stores remain feature-owned; history references location, not copies of drafts or saved documents.
- `src/shared`: define fixed menu/chrome command IDs, bounded advisory menu-state DTOs and strict parsers if crossing IPC. Renderer-local destination types stay renderer-local until a consumer requires a serializable contract.
- `src/main`: owns BrowserWindow options, overlay safe-area/color integration, native menu templates/popups, editing/zoom roles, About and window lifecycle. Recent-project names/handles derive from WorkspaceService, not caller-supplied filesystem paths. Main sends fixed navigation/presentation commands to the owning renderer and independently validates privileged requests.
- `src/preload`: expose only named capabilities and a fixed command subscription with event stripping and unsubscribe. No generic dispatch by channel.
- `src/core`: WorkspaceService, GenerationService and AiCoordinator retain project identity, persistence, admission and settlement. Presentation history does not enter core learning state. Existing services enforce authorization/domain ownership independently of advisory menu state.

Application command path: button/shortcut/native-menu command -> renderer command adapter -> navigation controller/guard -> existing authorized workspace API -> authoritative resolved destination -> history commit -> restored view. Standard native edit/zoom/window/About actions remain main-owned. Navigation state subscriptions update menu availability; subscription events are not visits.

### Navigation semantics

Use initial destinations conceptually shaped as `{ kind: 'dashboard' }` and `{ kind: 'project', projectHandle: string }`. This name explicitly corresponds to `ProjectSnapshot.id`, which current workspace requests misleadingly label `projectId`; it is not `ProjectSnapshot.projectId`. Do not rename public contracts in this increment merely to add history.

Keep the history reducer independent of project-specific rendering. A future real destination such as a topic may add a stable topic ID and owning project handle when that feature is implemented. Its owner supplies identity, resolution, restoration and unavailable-target fallback; no topic variant or fake screen is shipped here. Back/Forward represent visits, not content version restoration or undo.

Use push for accepted direct destination visits; traverse for accepted Back/Forward; replace for canonicalization/current-location reconciliation without creating a visit. Failed/cancelled transitions have no effect. Preserve the transaction token and intended cursor through cancellation confirmation, then revalidate ownership and availability before committing. Do not infer successful transitions solely from receiving a workspace-change event. The current API returns unchanged state on folder-chooser cancellation, so compare the resolved canonical destination before recording a visit.

Cache bounded presentation mementos only for retained history destinations, separately from existing feature draft stores. Evicting history does not discard drafts or recoverable results. On return, restore mementos only after a current authoritative snapshot is rendered; discard obsolete anchors without restoring an older data revision. Unknown/deleted project handles produce the normal navigation error and leave the current cursor intact. A known project with missing/corrupt storage resolves to its recovery view and remains traversable.

### Title strip and menus

Use Electron's hidden title style with native control overlay where appropriate, designated draggable empty areas and non-draggable controls. Respect overlay safe-area metrics rather than fixed right padding. Main owns native overlay theme updates through a bounded Light/Dark setting; unavailable overlay updates must not break window controls or the renderer theme. Use native popups for Windows/Linux menu dropdowns and the native system menu on macOS; renderer owns visible top-level labels and keyboard entry. At compact widths one Menu trigger exposes the same commands.

Native editing roles preserve focused-input undo and selection; navigation history never substitutes for text Undo/Redo. Main installs accelerators for native edit/zoom/window actions; renderer owns app navigation accelerators so guards, modal scope and IME checks apply exactly once. Top-level labels and the macOS native menu call the same command adapter for application navigation/presentation actions. About uses current application identity/version and adds no external link.

Primary technical references: [Electron custom title bars](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar), [window interactions and draggable regions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions), and [Menu API](https://www.electronjs.org/docs/latest/api/menu). Verify supported behavior against the pinned Electron version during implementation; platform conventions and native behavior require actual host evidence.

## Interfaces / APIs / Contracts

Existing `openProject`, `selectProject`, `showDashboard` and `locateProject` remain authoritative. Opening or selecting never starts inference. Internal renderer navigation commands distinguish direct visits and traversal intent before calling them.

Proposed named additions, finalized with shared parsers during implementation:

- `showApplicationMenu({ menu, anchor })`: fixed menu enum; bounded finite window-relative coordinates; main selects template and clamps the popup position.
- `setApplicationMenuState({ revision, canGoBack, canGoForward, navigationPending, sidebarVisible })`: bounded monotonic session revision and strict booleans; advisory availability only, no destination content. Initial state disables commands until renderer readiness. Main derives recent entries from current backend state.
- `setWindowAppearance({ mode })`: only Light/Dark, solely native overlay presentation.
- `onApplicationCommand(listener)`: fixed command union, optional backend-known project handle only for recent-project selection, stripped Electron event, unsubscribe. Reject/ignore stale or unknown commands and unready navigation in the receiver.

If compact-menu/template or native role handling requires additional action identifiers, use a finite parsed enum, never a generic channel or caller-supplied Electron role. Review the exact bridge contract in the implementation diff; preserve [IPC/security](../../patterns-ipc-security.md).

## Data Model / Storage

History/cursor/mementos are renderer session memory and reset on restart to the actual initial destination. The profile registry remains the owner of recent project locations; recent menus are not a second history store. `.edu` schemas, outline/topic files, credentials and appearance persistence remain unchanged. No migration or new persisted navigation preference is required. Moving/relinking a folder keeps the existing profile handle while main/core verify portable identity. Feature drafts and unsaved AI results retain their existing lifecycle.

## Auth / Authorization

No account or inference permission changes. All new privileged capabilities validate owning window, main frame, exact origin/app entry and strict payloads through current capability registration. Menu enabled state is advisory; existing main/core mutation and AI ownership checks remain authoritative. An arbitrary renderer-provided project handle cannot bypass project membership. No external URL opening is added.

## UX / Workflows

1. Startup shows the initial workspace and disabled history arrows; menus become usable when readiness/state is known.
2. Projects -> project A -> project B records visits. Back returns to A's current data and retained draft/reading context; Forward returns to B. Back then visiting C drops B's forward branch. Selecting A again while already at A preserves Forward.
3. Opening a folder and cancelling produces no entry. Relinking a project updates its location without another visit. A moved folder reached through Back shows recovery; locating the original folder preserves identity and cursor.
4. During project-owned inference, Back offers Stay here / Cancel and switch through the existing guard. Stay preserves history; cancellation awaits cleanup before moving. Saving keeps departure unavailable. Account tests remain visible and running across accepted project/dashboard traversal.
5. Opening Settings/About or a disclosure leaves history unchanged. Closing an overlay restores its trigger focus. After destination navigation focus the relevant heading/input; restore scroll without focus-induced jumps. Retained drafts and unsaved results are never implicitly submitted or discarded.
6. Arrow buttons, menu actions and supported shortcuts have equivalent behavior. Empty strip space drags the native window; menus and arrows remain operable at narrow widths and zoom.

## Work Breakdown (Ticket Seed)

1. Review/record the custom-title-bar decision and explicit ADR-0013 amendment; update constrained visual/renderer/security guidance with planned versus implemented status. Preserve the accepted navigation-integration discipline.
2. Implement the pure bounded history model, destination adapter and transaction/guard semantics with focused tests.
3. Route existing destination actions through that owner; preserve authoritative snapshots, drafts, disclosures, scroll and recovery.
4. Add strict menu/chrome contracts, main native menus/window overlay and preload subscription; integrate the theme-aware strip and shared command actions.
5. Exercise current/future-extension contract cases, real Electron menu/history/security/recovery journeys and native window behavior; refresh/review flow references and record requirement acceptance.

These are phase seeds, not ticket files or implementation authorization.

## Testing Plan

- Unit tests: pure history transitions/bounds/equality, transaction failures/races, unchanged-state chooser cancellation, restoration after content change, menu templates/state ordering and strict bridge rejection. Preserve existing workspace/security/activity tests.
- Code gate: `npm run check` after implementation.
- Desktop gate: `npm run test:desktop` after implementation, including actual command activation, two-project history, branching, preservation, moved-folder recovery, project cancellation/Saving and account diagnostic navigation. Use isolated fixture profiles; verify navigation adds no inference requests. Reuse existing provider fixtures and actual worker cleanup barriers.
- Flow evidence: register `navigation` in the existing catalog and flow index; update affected projects/appearance/reading/recovery references through the configured reporter. Review Light/Dark, disabled/available arrows, menus, pending guard and narrow/200% captures; run `npm run test:flows`.
- Native manual qualification: on Windows, macOS and Linux check drag, double-click maximize/restore, resizing, minimize/close, menus/accelerators, control safe areas, theme changes, zoom/fullscreen and keyboard/screen-reader behavior. Renderer screenshots omit native chrome; collect appropriately isolated full-window evidence and exact host outcomes. Report unrun platforms rather than claiming cross-platform acceptance.
- Live inference is not required for history/menu correctness. Fixtures prove navigation/cleanup behavior, not real account access or learning outcomes. Existing live-provider qualifications remain separate.
- Implementation evidence: create `validation.md` for exact gates/host outcomes and `acceptance.md` mapping R01-R16 and remaining external qualifications. Spec authoring runs documentation checks only and refreshes no screenshots.

## Acceptance Criteria

- [ ] R01-R04: reviewed strip/menu behavior matches the reference arrangement and current themes; native window buttons and focused text editing work.
- [ ] R05-R07, R10-R11: one bounded history handles bootstrap, traversal, branching, no-ops, failed/cancelled transitions, known recovery views and stale events, with no dummy topic UI or second stack.
- [ ] R08-R09: actual Electron evidence preserves drafts, disclosures, reading context and unsaved output, respects Saving/owned cleanup and lets account diagnostics continue across accepted traversal.
- [ ] R12-R14: keyboard/IME/modal behavior, narrow/zoomed adaptation and real IPC rejection/subscription checks pass; actual native chrome evidence is distinguished from renderer capture evidence.
- [ ] R15-R16: adopted contributor guidance covers future in-project destinations and changing navigation features; refreshed flow references and validation/acceptance map distinguish planned behavior, local fixture results and native qualifications.

## Rollout / Migration Plan

Implement on the active branch through separately authorized tickets. No data migration or history import. Keep existing content/security/AI behavior intact while routing navigation through the controller. Update current-capability wording only after implementation and passing evidence. Local implementation acceptance and cross-platform window qualification are separate; unrun native hosts must remain explicit.

## Risks and Alternatives

- Native popup focus/accelerators and title-control safe areas vary by platform; use Electron roles, overlay metrics and actual native checks. Do not solve failures by disabling sandboxing or web-navigation restrictions.
- Menu state can lag authoritative backend state; guard again at execution and use revisioned advisory updates. Rapid traversal and late snapshots need transaction correlation.
- Presentation mementos can become stale after outline rewrites; stable IDs, current authoritative content and safe focus/scroll fallback prevent restoration of obsolete content.
- A native title bar plus an ordinary toolbar is the closest option within today's ADR-0013 rule, but adds a separate strip above the screenshot-inspired layout. The proposed integrated strip requires the explicit decision amendment below.
- Full custom dropdowns/window buttons add accessibility/platform ownership beyond this scope. A browser router/history API would conflate app visits with blocked web navigation; a pure renderer session model fits the current architecture.
- Future topic/activity navigation could otherwise bypass the pipeline. The adopted integration discipline requires its history/fallback rules and tests at the time the feature is added, without inventing those screens now.

## Patterns and Standards Alignment

Apply [design system](../../patterns-design-system.md), [UX](../../patterns-ux.md), [renderer](../../patterns-renderer.md), [architecture](../../patterns-architecture.md), [IPC/security](../../patterns-ipc-security.md), [flows](../../patterns-flow.md), [development/testing](../../patterns-development-testing.md) and [documentation](../../patterns-documentation.md). Preserve ADR-0001/0002/0007/0009/0012/0013/0020/0021/0022 boundaries and evidence limits.

[ADR-0023](../../ADRs/ADR-0023-navigation-history-integration.md) adopts the contributor obligation for navigation changes now; UX/renderer/testing/documentation patterns and both indexes are updated in this authoring change. History/menu runtime is still pending.

Deviation planned for implementation: amend ADR-0013's native-title-bar rule through the next available numbered ADR for an integrated title strip retaining native window controls (currently ADR-0024 would be next; do not reserve that number). Update ADR/pattern indexes and constrained design-system/renderer/architecture/IPC patterns alongside that decision. This spec records the proposed deviation; it does not silently change the current native-chrome rule.

## Open Questions

- No material product blocker for this bounded increment. The prior proposal's integrated strip, menu grouping and platform adaptation are working design assumptions carried into this spec; exact pixel dimensions follow current tokens and native safe areas.
- The user confirmed that future real navigation inside a project must join history. Topic/activity destinations, their unavailable-target fallbacks and any future persistence belong to those feature owners/specs; this increment implements no such screen.
- Readiness: ready for ticket authoring. Runtime implementation and its title-bar decision amendment remain separately authorized stages. Exact native-platform evidence is required before claiming those hosts are qualified.
