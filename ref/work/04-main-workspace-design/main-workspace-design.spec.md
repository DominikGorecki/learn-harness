# Spec: Editorial main workspace and shared design standard

Status: Ready for implementation
Date: 2026-10-06
Source: User's locked sheet 04 option 5 and subsequent request for a main-window implementation spec, consistent existing pages and documented guidance for future features.
Goal: Learners see a coherent, beautiful central workspace with clear reading/editing actions; contributors extend the same design without restyling side panels.

## Summary

Implement the selected **Quiet action groups** direction in the central main-window workspace. Apply its editorial hierarchy, restrained glass-like surfaces and subtle actions to every currently implemented central page, including a new saved-topic reading destination. Keep the rail, project sidebar, navigation drawer and other side/detail panels in their existing design. Preserve the separately approved AI bottom workbench.

The [locked selection](../../../docs/design/component-designs/02-project-overview/project-overview-selection.md) and [standalone reference](../../../docs/design/component-designs/02-project-overview/project-overview-final.png) define the visual target. The [design contract](main-workspace-design.design.md) documents its reusable rules, boundaries, page adaptations and unshown states. This authoring change creates planning documents only; implementation must adopt the durable standard, migrate pages and provide actual evidence.

## Problem / Context

[App.tsx](../../../src/renderer/src/app/App.tsx) composes a contextual topbar, central scroll region, dashboard/setup/outline/recovery views and a separate AI panel. [styles.css](../../../src/renderer/src/styles.css) mixes global theme/control rules with shell and feature styles. A global heading, button or palette change could unintentionally restyle excluded panels.

[OutlineView.tsx](../../../src/renderer/src/features/projects/OutlineView.tsx) currently shows outcomes, expandable lessons, source/assumption disclosures and separate icon-only edits. It has no topic-reading destination. [Dashboard.tsx](../../../src/renderer/src/features/projects/Dashboard.tsx) and [ProjectSetup.tsx](../../../src/renderer/src/features/projects/ProjectSetup.tsx) use different introductory compositions. The selected concept proposes a subject-first overview, shared restrained action groups and readable topic rows. Its sample text and larger bitmap are not new data fields, exact CSS measurements or implementation evidence.

The [product overview](../../../docs/overview.md), [PRD 01](../../prds/01-project-setup-and-outline.md), [baseline acceptance](../01-project-setup-and-outline/acceptance.md) and [streaming acceptance](../02-ai-streaming/acceptance.md) bound current learning capabilities. Saved reading is available offline; outline creation is not lesson delivery or mastery. The [menus/navigation bundle](../03-menus-and-navigation/menus-and-navigation.spec.md) is being implemented separately. At discovery, its pure dashboard/project history primitives exist but runtime integration and host qualification are pending; its uncommitted work is not this spec's implementation evidence.

## Goals

- Match the selected main-content composition and calm glass effect while retaining readable, discoverable controls.
- Make whole-outline editing, topic editing and topic reading visibly different, with working actions.
- Give dashboard, setup/refinement, overview, topic reading and central recovery states one consistent visual vocabulary.
- Publish a discoverable main-workspace design standard and reusable renderer primitives so future central features follow it.
- Preserve Light/Dark, keyboard operation, zoom, draft continuity, recovery, topic locality and shared AI behavior.

## Non-goals (Strict)

- Restyling the outer rail, project sidebar/drawer, account or Settings panels, optional side/detail panels, native menus or title strip. The left side of the generated reference is context, not a redesign requirement.
- Redesigning the approved AI workbench, its connected activity icons or lifecycle; a full-page dimming overlay, new progress modal or blocking saved reading during AI.
- Structural redesign of editor/confirmation dialogs. Existing overlays retain their layout and contracts; new triggers must restore focus correctly.
- Theme selection in the workspace, accent/theme customization, external fonts, native acrylic/Mica or transparent BrowserWindow effects.
- New tutoring, authored lessons, module/session execution, research, progress metrics, mastery, manual reordering or additional AI producers.
- Changing portable schemas, Pi tools/transport, filesystem access, account authorization or source transmission.
- Tickets, runtime changes or flow refresh during spec authoring.

## Scope

### In scope

Central contextual header and content below it; shared workspace tokens/primitives; all implemented central states listed below; a saved-topic reading destination; navigation integration; documentation/decision adoption and actual visual/interaction acceptance.

| Central surface | Required adaptation | Existing consumer |
| --- | --- | --- |
| Empty/populated Projects dashboard | Editorial introduction, subtle primary action, readable project rows using the workspace row treatment; preserve folder/name/availability details | Dashboard |
| New/material-led project setup | Same heading/spacing vocabulary; restrained composer surface and explicit Create outline action; keep model choice, goal save, disclosure and limits | ProjectSetup / ProjectModel |
| Refine learning direction / clarification | Same form composition and real question/error state; retain draft/replacement behavior and a readable prior outline | ProjectSetup / App |
| Saved outline overview | Reference composition, context columns, hero group and topic rows, plus complete evidence disclosures | OutlineView |
| Saved topic reading | New central document page using the same heading, context, section and action styles; all existing objectives/module plans remain readable | New feature under projects |
| Loading, missing/corrupt/read-only project, errors, model recovery, unsaved review | Same header, spacing, restrained surfaces and explicit recovery actions; preserve truthful status and existing safe recovery | App / existing feature state |

The AI dock, overlays and side panels can share existing theme values without inheriting the new workspace-specific heading, surface or button rules. Future central pages adopt the documented contract when their own capabilities are implemented; this spec does not create those features.

### Dependencies

Visual primitives and page migration can start independently. Topic destination/history integration requires the single runtime navigation controller from bundle 03 to be available and validated locally. Integrate with its actual settled contracts rather than the currently unused pure primitives; do not implement a competing controller or copy its tickets here. Bundle 03 owns native menus/chrome qualification. Coordinate App.tsx, styles and flow edits with its owner before integration. Any changed behavior affecting menus/history must update that bundle's consumer tests without rewriting its historical evidence.

## Requirements (Functional)

| ID | Testable requirement | Verification path |
| --- | --- | --- |
| R01 | Scope new styles to the central header/content; preserve current rail/sidebar/drawer, account/Settings/detail panels and AI dock presentation and behavior. Avoid new global h1/button/palette overrides. | Before/after Light/Dark panel captures with matched viewport/state; selector/token review; appearance, account and streaming desktop regressions. |
| R02 | Central pages use the documented editorial heading, faint illumination, neutral glass-like rows/forms and subtle controls through shared tokens/primitives. Dashboard, setup/refinement, overview, topic reading and central recovery states all migrate; no isolated old central page remains. | Page inventory acceptance and reviewed actual Light/Dark captures; source audit of shared component/token consumers. |
| R03 | Saved overview presents eyebrow, authoritative title/overview, truthful Saved/Not saved yet, context columns, action group and ordered topic rows as in the locked main-content reference. All outcomes, scope, depth, assumptions, additions and source/coverage disclosures remain accessible. | Outline desktop data assertions and matched visual review; long-outline/offline reading journey. |
| R04 | Hero group exposes Open first topic → and pencil/Edit outline as two independent visible commands. Open first topic resolves the saved startingLessonId, even when it is not the first displayed row. Edit outline opens the existing whole-outline editor without starting inference. | Fixture with recommended second topic; desktop request counts, editor opening/closing and focus assertions. |
| R05 | Every topic row has ordinal, full title/question and an independent Open topic → / pencil/Edit topic group. Reading via title or Open topic opens that saved topic. Editing opens only its topic editor and never navigates, toggles a disclosure or submits. No nested interactive elements or hover-only actions. | Keyboard/pointer desktop checks for both commands and title; topic-edit isolation and unchanged navigation/provider request counts. |
| R06 | A topic destination shows saved title/question/overview, objectives, prerequisites, module method/title/purpose/task and topic sources using shared document styles. Its project breadcrumb returns to the overview and its Edit topic action reuses the existing editor. It remains readable without connection or write permission and creates no AI request or files. | Topic-reading Electron flow, authoritative content assertions, offline/read-only behavior, bytes and provider/AI-activity checks. |
| R07 | Real topic destinations join the one bounded app history using project handle + stable lesson ID. Direct accepted visits push, duplicate current visits do nothing, Back/Forward traverse, reconciliation replaces; dialogs/disclosures/preferences/progress have no-history effects. All topic entry points share the controller and authoritative resolution. | Destination/transaction/history unit tests and actual overview/topic/dashboard/project round trips, including Forward branching and duplicate visits. |
| R08 | Restore each retained overview/topic's reading position, stable module/context disclosures, refinement visibility and safe focus after navigation, without clearing drafts. Renames/rewrites retain stable identity and show current saved content. Missing topic canonicalizes to its project's overview with an explanation; unavailable project resolves its normal recovery view. Failed/cancelled/stale transitions retain history until an accepted resolution. | Resolver/restoration race tests; rewrite/removal/missing-folder traversal and long-content desktop checks. |
| R09 | Saved same-project overview/topic reading is permitted during inference and Saving, leaves the operation/panel owner intact and starts no competing AI call. Switching projects/dashboard retains existing Stay here / Cancel and switch and Saving restrictions. Account tests continue across allowed visits. | Active rewrite and account-test navigation flows with real utility cleanup barriers, busy guards and provider counts. |
| R10 | All edit/create commands retain admission, selected-model authorization, read-only/unsaved restrictions, project/topic-keyed drafts, error/conflict/cancellation and storage-only Retry save. Topic changes preserve every other topic/outline field and owned-file locality. | Existing outline-edit/topic-edit/recovery journeys, request counts and real .edu/source-file assertions; no backend acceptance weakening. |
| R11 | Main loading/empty/error/needs-input/unsaved/saved states use the same visual vocabulary and clear text/actions. Status is backend-derived; no content is hidden by a decorative effect, clipped to match sample lengths or marked saved before publication. | State-specific Electron captures and recovery/assertion coverage; accepted unsaved result remains readable after dock dismissal. |
| R12 | Light and Dark implement the same hierarchy using local Appearance behavior; no inline theme switch. Glass effect has a readable opaque baseline and keeps content usable if enhancement is unsupported/disabled. Reduced motion removes positional effects and no glow/blur animates during streaming. | Appearance restart/preservation tests, fallback computed-style/content checks and both-theme/reduced-motion visual review. |
| R13 | Long titles/questions/objectives, 40-topic outlines and a 600px content window at 200% Electron zoom (300 CSS px effective width) reflow without horizontal overflow or overlapping text/actions. Groups wrap/stack without removing actions; core reading/actions remain reachable with the dock open. | Reading/projects/topic flow variants and DOM overflow/hit-area assertions with actual Electron zoom; visual inspection. |
| R14 | Use semantic headings, named commands, visible focus, at least 32px action targets, native text selection and accessible announcements. Ordinary text targets 4.5:1, large text and essential focus/control indicators 3:1 on actual composited surfaces. Editing/validation/dismissal restores the appropriate new trigger; async saves do not steal focus. | Keyboard/IME/focus tests, measured contrast of both themes and visual fallback; manual screen-reader review with host limits recorded. |
| R15 | Adopt and publish the main-workspace standard, scoped ADR amendment, contributor discovery routes and a reusable-page integration checklist described below. Every existing central surface has a documented consumer; every new central feature must identify shared primitives, states/adaptation, navigation effects and actual acceptance evidence. | Documentation/link audit and requirement-to-page/primitives inventory; review changed ADR/index/pattern/product guidance. |
| R16 | Refresh changed real flows through the configured reporter and document topic reading as a real flow. Keep generated concepts separate from current runtime captures; record R01–R16 evidence and any live/platform/manual limits. | npm run test:flows, reviewed new captures/narratives, bundle validation.md and acceptance.md. |

## Requirements (Non-functional)

- **Performance:** prefer layered neutral gradients/highlights for the glass appearance; usable opaque baseline precedes any bounded enhancement. No per-topic backdrop blur, full-window filter, external asset/font requests, layout animation on every activity event or continuously animated glow. Large outlines and the streaming dock retain responsive selection, scroll and keyboard use.
- **Reliability:** authoritative saved data and domain-owned unsaved output remain separate. Shared navigation restoration resolves current content; no presentation cache restores old outline revisions. Visual migration does not discard drafts, selected model, topic identity or recoverable output.
- **Security/privacy:** renderer-only presentation; preserve sandbox, context isolation, CSP, typed bridge and plain-text rendering of learner/model content. No new generic IPC, filesystem/shell access or raw provider output. Screenshots use isolated synthetic projects and mask private paths.
- **Observability:** no new logging dependency or content telemetry required. Use existing safe diagnostics for failures and standard flow manifests for visual evidence. Main status colors and labels must retain their distinct meanings.

## Proposed Solution

### Design and renderer ownership

Create small reusable components under src/renderer/src/components for a workspace page/header, context section, quiet action group, content row and document section; names can follow local conventions. Features retain content/state and callbacks. Extract workspace-specific styles/tokens into a dedicated stylesheet rooted at an explicit main-content boundary, not the whole studio-workspace ancestor that also contains the AI dock. Scope contextual-header adoption separately from any title strip. Do not rewrite shell widths or shared global theme values merely to match the generated sidebar.

Use the [design contract](main-workspace-design.design.md) for initial implementation dimensions, token roles, interaction states and migration decisions. Preserve the selected direction while adapting real data density; no fixed screenshot-sized layout or hardcoded Bayesian text. The glass look may use opaque gradient surfaces: translucency is an appearance, not a requirement for OS/BrowserWindow transparency.

### Process ownership

- **Renderer:** shared primitives, page composition, topic view, pure destination identity/resolver/restoration adapter and integration with the existing navigation owner. Saved/unsaved documents come from typed snapshots; never parse project files in React.
- **Core:** existing workspace/generation/admission/publication/topic-locality behavior remains authoritative and unchanged.
- **Shared:** reuse SavedOutline/LearningOutline, workspace and activity contracts. No new durable schema or IPC DTO expected; topic location is renderer session state.
- **Main/preload:** existing named project/account/generation capabilities and authorization remain unchanged. Existing selectProject resolves cross-project topic traversal before reading its authoritative outline. No privileged read-topic API is needed for already available saved data.

### Overview data mapping

Use saved.document.title/overview as the subject header. Map **Learning focus** to full saved.document.scope with level as quiet depth metadata; **Learning objectives** to all saved.document.outcomes. Long context can use labelled disclosure with a readable beginning and a reachable full value; do not invent a short focus statement or silently omit outcomes. “Your learning path” lists saved.document.lessons as topics in their existing order. “Open first topic” opens startingLessonId, preserving its recommended-start meaning. Counts/ordinals describe structure, never mastery. Keep scope/assumptions, additions and complete material/coverage details below the index. The sample's two topics/two objectives are not limits.

## Interfaces / APIs / Contracts

Conceptual renderer destination addition: { kind: 'topic', projectHandle: string, topicId: string }, where projectHandle is ProjectSnapshot.id and topicId is OutlineLesson.id. Portable ProjectSnapshot.projectId, title, ordinal, path and generatedAt are not location identity. Extend actual bundle 03 equality/resolution/memento contracts after integration; do not create a second store/router or persistent history.

| Entry or event | History and operation effect |
| --- | --- |
| Hero Open first topic; topic title; Open topic | Push accepted topic visit after current saved-state resolution; no request/mutation |
| Topic project breadcrumb / explicit Back to outline | Direct accepted project-overview visit pushes; same current destination is a no-op |
| App Back/Forward | Traverse existing entries through the same resolver/guard; no new visit or inference |
| Missing/removed topic or unavailable project reconciliation | Replace invalid topic location with its owning overview/recovery destination and announce the reason; preserve Forward/cursor transaction semantics |
| Edit outline / Edit topic; scope/module disclosure; Appearance | No history change; editor submission alone may start existing inference |
| Refine learning direction / Back to outline within the existing form toggle | No history change; project presentation state and draft are preserved separately from topic destinations |
| Same-project outline/topic reading while AI runs | Accepted reading visit, preserving owner and dock; no cancellation required |
| Dashboard/another project while project-owned AI runs | Existing guarded transition, awaiting cancellation/cleanup when supported; cannot switch during Saving |

When returning to a topic, resolve against the newest authoritative saved outline; selection of a module is disclosure, not a new module route. Unsaved generated results retain their existing explicit review surface and are not canonical saved-topic destinations. In a proposed/unsaved index, disable its Open first topic/Open topic commands with a save/retry explanation so an apparent proposed-topic action cannot silently open an older saved version. Existing saved topics remain readable through saved destinations/history while a new candidate is unsaved. If no saved outline/topic exists, expose no enabled saved-topic navigation; do not create a history entry for provisional output.

## Data Model / Storage

No .edu schema/migration, topic-folder move, new learning-state file or history persistence. Existing renderer-local appearance storage remains device-owned. Session locations/mementos remain presentation-only and bounded by the shared history; draft stores and recoverable results keep their existing ownership. Reading a topic uses saved outline data, not the owned folder mirror or arbitrary source-file access. Project loading may retain existing interrupted-save recovery; that is not a new mutation introduced by topic navigation.

## Auth / Authorization

No new account permission or inference authorization. Offline topic/outline reading requires no connected account. Main/core still validate every mutation and enforce project identity, shared admission and topic locality independently of visual disabled states. All existing AI producers continue through ADR-0022.

## UX / Workflows

1. Returning learner opens a project and sees its subject, truthful saved status, focus/objectives and ordered topic index. The side navigation remains visually stable.
2. Open first topic or a row opens its current saved plan in the main area. Breadcrumb and app history return to the overview with reading position restored. Objectives/modules/sources are ordinary saved-plan reading, not a launched lesson.
3. Edit outline opens the existing whole-path dialog; Edit topic identifies only that topic. Closing restores its new trigger without submitting. Accepted inference reveals the existing dock; competing AI starts stay disabled and saved reading stays available.
4. Dashboard/setup/refinement/recovery use the same headings, subtle action surfaces and spacing, with task-specific forms and messages. Save retry remains explicit and consumes no inference.
5. Appearance from existing Settings applies to main content without restyling the panels or resetting drafts, scroll, navigation or active inference. Narrow groups stack and long learning content wraps.

## Documentation Deliverables

Implementation must promote the companion contract into **ref/patterns-main-workspace.md**, as a focused normative standard linked from ref/patterns-design-system.md. Record selected/adopted versus migrated/verified status separately. Preserve the design directory and historical appearance evidence.

- Add the next available numbered ADR at implementation time; do not reserve a number here. Amend ADR-0013/ADR-0007 only for central-workspace composition, larger editorial heading role and quiet primary action treatment. Retain their appearance preference, shell/panel and security rules and ADR-0024 title/native-control scope.
- Update both ADR and pattern indexes; constrain design-system rules so global primary-button/heading/opaque-surface guidance does not contradict the new main-only standard. Keep the opaque fallback explicit.
- Update UX for topic-reading actions/history/restoration and no-inference reading; renderer for scoped tokens/primitives and navigation ownership; documentation for the main-page checklist; flow patterns for actual new/changed journeys.
- Update AGENTS.md's UI discovery route, README's future-extension/design links and docs/overview.md plus PRD 01 visual-direction links/status notes. Preserve their historical capabilities, acceptance limits and future teaching scope.
- Keep the standard implementation-oriented: region boundary, Light/Dark semantic roles, typography/spacing/radii, surface recipe/fallback, action hierarchy, full states, responsive/zoom/focus/contrast, examples for each central surface, verified primitive paths and actual flow links. Do not leave the only guidance as a bitmap or this work bundle.

**Future-page acceptance checklist:** state the beneficiary/task and main-region scope; reuse approved tokens/primitives; provide default/empty/loading/error/pending/recovery states as applicable; define navigation/history and ownership effects; cover both themes, long content, narrow/200% and keyboard/focus; preserve side panels/dock; refresh actual flow evidence and update the consumer inventory. Any deliberate deviation requires explicit design rationale and, if durable, the ADR workflow.

## Work Breakdown (Ticket Seed)

1. Adopt scoped durable design/documentation decision and canonical main-workspace guidance from the contract; define shared renderer primitives/token isolation and before-state panel references.
2. Implement primitives and migrate dashboard, setup/refinement and central loading/recovery states. Keep forms and existing state contracts intact.
3. Implement selected outline overview, real data mapping, grouped triggers, full context disclosures and preserved editor/dock behavior.
4. After bundle 03 controller integration, add saved-topic page and destination/resolver/mementos; connect all reading entry points, history and operation guards.
5. Complete cross-surface/AI/panel regression and adaptation evidence; refresh flows/narratives; finalize implementation paths/status and requirement acceptance.

These are ordered seeds, not generated tickets or permission to implement.

## Testing Plan

- **Focused unit coverage:** topic destination equality/recommended starting resolution, current-content reconciliation, missing/deleted-topic fallback, restoration after rewrite, failed/stale transaction preservation and global ownership guards. Reuse bundle 03 transaction/history tests; do not test CSS declarations by mirroring implementation.
- **Code gate:** npm run check for implementation; includes lint, unit tests, flow integrity, types and build. New presentation-only primitives do not require tautological unit tests.
- **Desktop gate:** npm run test:desktop after user-flow changes. Extend projects, outline, outline-edit, topic-edit, appearance, reading, recovery, model-access and streaming journeys as affected. Preserve real bridge/storage/process assertions; replace old disclosure-specific selectors with equivalent saved-content assertions rather than deleting offline coverage.
- **New topic-reading flow:** register it in tests/flows/catalog.ts and ref/patterns-flow.md using the fixture/reporter. Cover overview ↔ topic, recommended non-first topic, edit independence, offline/no writes/no inference, Back/Forward and missing-target restoration. Add navigation-flow cases to bundle 03's actual integration when available.
- **Visual evidence:** actual Light/Dark empty/populated dashboard, setup/refinement, selected outline, topic reading, unavailable/unsaved/error; same-project reading with active dock; narrow and 200% long outline/topic; visible focus/disabled group and opaque fallback. Review selected central styling against the final reference and unchanged side panels/dock against matched baseline state, not different projects or viewports.
- **Manual evidence:** contrast against actual composed backgrounds, keyboard/IME/selection, reduced motion and OS screen-reader checks. Review available native host(s); explicitly record Windows/macOS/Linux checks not run. Existing title-strip host qualification remains bundle 03-owned, but verify this layout does not obstruct its safe areas.
- **Live gates:** no new live inference required for this presentation/navigation change. Fixture process/file evidence is sufficient for those regressions and does not resolve existing live-provider/accessibility/other-host qualifications.
- **Evidence records:** implementation creates validation.md with exact commands/results/reviewed captures and acceptance.md mapping R01–R16, surface coverage, panel preservation and external limits. No evidence file or screenshot in this planning task claims runtime completion.

## Acceptance Criteria

- [ ] R01–R03, R11: all listed current central surfaces visibly share the selected hierarchy and surface/action vocabulary; side panels and dock retain their design; overview preserves all real learning/evidence content.
- [ ] R04–R08: Open first topic honors the saved recommendation; independent topic open/edit actions and a complete offline saved-topic page work through the shared history with restoration/current-content/missing-target behavior.
- [ ] R09–R10: actual AI/navigation/recovery regressions preserve ownership, topic/file locality, drafts and storage-only retry with no reading-triggered inference.
- [ ] R12–R14: reviewed Light/Dark, fallback, keyboard/focus, long-content, narrow/200%, reduced-motion and contrast evidence; explicit manual/native limitations.
- [ ] R15: canonical scoped design guide, ADR/index/pattern/discovery/product links and future-feature checklist are published with honest adoption/migration status and verified primitive consumers.
- [ ] R16: required code/desktop/flow gates pass; actual captures/narratives and per-requirement evidence records are reviewed. Unrun external gates remain named.

## Rollout / Migration Plan

No user-data migration or reset. Implement shared styles with an explicit main boundary, migrate existing central pages together before declaring completion, then integrate the topic route after the navigation dependency. Preserve excluded-region baseline states and upstream concurrent work. Run full integration gates after resolving shared App/style changes. Update current-capability wording only when runtime evidence exists; do not label a partially migrated UI complete.

## Risks and Alternatives

- Global CSS can leak into side panels/dock. Add workspace roles/variables locally and compare excluded regions explicitly; avoid changing global .button.primary or h1 to achieve the reference.
- Excessive glass/blur harms contrast/performance. Opaque layered neutral surfaces reproduce the selected feel with fewer platform dependencies; translucent enhancement is optional and bounded.
- Real scope/outcomes can be much longer than sample copy. Preserve complete data with responsive columns/disclosure rather than inventing AI summaries or fixed-height clipping.
- A topic route could bypass history/cancellation. Depend on the common controller, resolve stable IDs against current content and separate saved-reading visits from project switches.
- Keeping inline topic disclosure as the only reading view would reduce navigation work but would not deliver the selected Open topic experience. Retain disclosure for context/modules where useful; implement the bounded saved-plan page without tutoring.
- Copying the full generated frame would change the side panels. Treat only its main content as the visual target, per the user's latest explicit boundary.

## Patterns and Standards Alignment

Apply [design system](../../patterns-design-system.md), [UX](../../patterns-ux.md), [renderer](../../patterns-renderer.md), [AI operations](../../patterns-ai.md), [flows](../../patterns-flow.md), [documentation](../../patterns-documentation.md) and [development/testing](../../patterns-development-testing.md). Preserve ADR-0001/0002 process/IPC boundaries, ADR-0012/0019 recovery/locality, ADR-0013 local appearance, ADR-0020 flow ownership, ADR-0021 scoped commits, ADR-0022 shared inference and ADR-0023 shared navigation. ADR-0024 title-strip work remains independently owned.

The new design differs from current generic heading/primary-button conventions and adopts a central-only glass-like visual recipe. Its scoped durable amendment and canonical guidance are required implementation deliverables. This spec/contract records the selected target and does not silently amend maintained rules or consume the next ADR number while another task is active.

## Assumptions and Open Questions

- “Main window” means the central workspace pages/context header, excluding navigation chrome, lateral panels, overlays and the separately approved bottom AI panel. This follows the user's explicit request to keep side panels as they are and the locked streaming design.
- Open topic means a saved-plan reading page, not AI lesson delivery; this carries the locked handoff's capability boundary into an implementable outcome.
- Light styling and exact CSS values are implementation adaptations of the selected Dark concept and documented roles, subject to visual/contrast acceptance; no additional design-selection round is a prerequisite.
- No material product question blocks this bounded spec. Topic runtime integration is ordered after bundle 03's controller is available; native qualification is tracked separately, not assumed passed.
- Readiness: ready for ticket authoring. Application implementation and ticket generation require their separately requested stages.
