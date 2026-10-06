# Design system patterns

Governed by [ADR-0013](ADRs/ADR-0013-chatgpt-inspired-appearance.md), which amends the palette and theme scope in [ADR-0007](ADRs/ADR-0007-codex-inspired-design-and-ux.md). Primary visual direction comes from the user-supplied light workspace and dark settings screenshots. Their originals are excluded from public source for privacy. Interpretation and isolated application captures: [appearance review](research/chatgpt-app-appearance.md).

**Status:** adopted visual standard, implemented in the project workspace and account panel. Values here are Learning Studio defaults, chosen for this product; they are not measured Codex implementation tokens.

## Current application screenshots

Before UI/design work, choose the relevant journey through the [flow index](patterns-flow.md), read its explanation and open only its relevant platform screenshots. Start with [appearance](flows/appearance/index.md) for Light/Dark composition, [outline](flows/outline/index.md) for saved learning documents, [topic editing](flows/topic-edit/index.md) for the scoped editor and [reading](flows/reading/index.md) for narrow/zoomed content.

Playwright refreshes passing flows in place under `ref/flows/`; each flow index records its test and observed checkpoints. See [flow maintenance](patterns-flow.md#creating-or-changing-a-flow) for capture/replacement and AI review. These are isolated Electron renderer captures, separate from the dated [appearance research](research/chatgpt-app-appearance.md) and proposal images under `docs/design/`. The manual computer-use gallery is superseded. Visual evidence supplements the adopted rules and does not establish live-provider access, backend correctness, mastery or accessibility certification.

## Composition

[ADR-0022](ADRs/ADR-0022-shared-pi-streaming-lifecycle.md) adopts the [selected bottom split panel](../docs/design/component-designs/01-generation-streaming/generation-streaming-selection.md) for all inference. Its timeline uses connected actual-activity icons, with planned upcoming steps distinct from completed work; the wider side shows selectable provisional content. Use existing Light/Dark tokens and responsive workbench space without obstructing navigation. The panel is implemented; [actual streaming references](flows/ai-streaming/index.md) and [outline adaptation](flows/outline/index.md) show the observed Light/Dark, provisional, waiting and publication states. [AI operations](patterns-ai.md) owns lifecycle rules and qualification limits. This reference does not authorize changes to saved outline row styling.

Use a quiet desktop workspace with a slim outer icon rail, softly tinted project navigation, an inset primary surface, system sans-serif type, and generous working space. The subject, current activity, and next action establish hierarchy. Brand identification stays compact in application chrome.

The shell contains navigation, a contextual header, the primary learning surface, and optional selected-item details. The outer rail contains only working dashboard, folder and Settings actions; project navigation and workspace form the two main regions. At narrow widths the rail becomes a bottom strip and project navigation remains a drawer. Open a detail pane only for useful context such as a selected lesson's objectives or an outline's sources. Keep generic learning tips within the relevant activity rather than permanently occupying a third pane.

Use rows, document sections, and disclosure for project/lesson lists. A bordered container should identify an input, interactive artifact, dialog, or a real group. Keep routine metadata quiet. Give each workspace state one primary action; account/model settings remain compact unless the learner is resolving them.

## Visual tokens

Use semantic CSS variables so components consume purpose-based values. Keep state colors distinct from brand/accent color. Prefer opaque surfaces for predictable rendering across desktop platforms; any future translucency must preserve contrast and work with an opaque fallback.

| Token role | Light target | Dark target | Purpose |
| --- | --- | --- | --- |
| `surface-shell` | `#EAF4F5` | `#1C2424` | Outer rail and window inset |
| `surface-canvas` | `#FFFFFF` | `#181818` | Main workspace and dialogs |
| `surface-navigation` | `#F5FAFB` | `#1B1E1E` | Project navigation |
| `surface-raised` | `#F5F5F5` | `#232323` | Settings groups and feedback |
| `text-primary` | `#222426` | `#F3F3F3` | Headings and learning text |
| `text-secondary` | `#60656A` | `#B3B6B8` | Supporting text |
| `text-muted` | `#656B71` | `#A1A5A8` | Quiet metadata |
| `border-subtle` | `#E1E6E8` | `#343738` | Decorative separation |
| `border-control` | `#858A90` | `#787D82` | Essential control boundaries |
| `surface-selected` | `#E7EDEF` | `#303334` | Current navigation |
| `accent` | `#7944CA` | `#B58AF8` | Focus, selected mode and small indicators |
| `state-success` | `#22663B` | `#87DBA2` | Confirmed result |
| `state-warning` | `#8A4B0D` | `#EFC17D` | Attention needed |
| `state-error` | `#AD3030` | `#FFAAAA` | Failure and recovery |

Primary buttons use `text-primary` as their fill and `surface-canvas` as their label color. Purple accents support orientation and focus; ordinary surfaces remain neutral. Use text and shape alongside state colors. A saved result, a completed activity, and a selected item have different meanings even when all appear positive.

Light and Dark are implemented through Settings → Appearance. Show visual previews with native radio semantics, apply changes immediately and remember the explicit choice on this device. With no saved choice, initialize from OS appearance; this is not a continuously following System mode. Themes cover every renderer surface, including account/recovery dialogs, selects and focus states. Custom palettes, theme import/export and font editing remain out of scope. Current native window chrome follows the OS; [ADR-0024](ADRs/ADR-0024-integrated-title-strip-with-native-controls.md) authorizes bounded Light/Dark native overlay presentation during later integrated-strip activation.

## Typography and spacing

Use the native system sans-serif stack for chrome, headings, and learning prose. Reserve monospace for literal code, paths, or material that benefits from it. The default UI has no editorial serif heading. Font selection must work offline without external font requests.

| Role | Default size / line height | Weight |
| --- | --- | --- |
| Workspace heading | 24–28 px / 1.25 | 600 |
| Section heading | 18–20 px / 1.35 | 600 |
| UI labels and controls | 14 px / 1.45 | 400–500 |
| Learning prose | 16 px / 1.65 | 400 |
| Secondary metadata | 12–13 px / 1.45 | 400 |

Use sentence case. Essential information uses readable body text; small uppercase tracking is optional for a short section label. Long titles and learner text wrap. Metadata may truncate only when the full value remains available by keyboard-accessible disclosure or tooltip.

Use a spacing scale of 4, 8, 12, 16, 24, 32, and 48 px. Default outer rail width is 56 px, project sidebar width is 264 px (224 px at intermediate sizes), toolbar height about 53 px, and workspace inset 24–40 px. A reading/input column is normally 680–760 px wide, with wider outlines using available space. These are starting values; adapt to content and zoom rather than locking every screen to fixed dimensions.

Use 10 px corners for navigation rows, 12 px for ordinary buttons, 18–20 px for inset workspace/dialogs, and 24 px for the learning composer. Keep borders thin and shadows light; reserve elevation for overlays or a surface whose separation affects use. Avoid decorating every content section with a card.

## Component contracts

| Component | Visual and interaction states |
| --- | --- |
| Navigation/project row | Default, hover, current, focus, and unavailable. Selection changes the row background; an activity marker also has an accessible text meaning. Secondary menus remain reachable without hover. |
| Primary/secondary button | Clear label, focus, pressed, pending, disabled, and failure recovery. One dominant button per task. Explain unavailable actions when the cause matters. |
| Learning input/composer | Visible label, editable draft, focus, validation, and pending state. Place the submit action within reach of the input; keep contextual controls compact. |
| Lesson/outline disclosure | Title and useful summary remain visible; expanded content aligns with the reading column. Preserve selection and reading position. |
| Menu/dialog | Group related choices, label destructive actions, indicate keyboard focus, and give a clear dismissal route. Use the native folder dialog for folder selection. |
| Progress/feedback row | Sit near the current task, communicate state with text, and retain a useful next action. Avoid repeatedly moving the surrounding document. |

Interactive targets should usually be at least 32 px high in desktop chrome, with larger primary buttons and roomy list rows. Verify text contrast against its actual surface (target 4.5:1 for ordinary text, 3:1 for large text); essential control/focus indicators target 3:1. Decorative dividers are separate from essential input boundaries. Disabled controls still need an understandable reason and readable surrounding context.

## Adaptation and motion

Collapse optional details before shrinking the primary working column. Narrow the sidebar or provide a labelled toggle when the viewport cannot fit navigation and work comfortably. Provide a route to every hidden action. Preserve native window controls and normal platform window behavior.

Under [ADR-0024](ADRs/ADR-0024-integrated-title-strip-with-native-controls.md), the integrated title strip is an accepted implementation target, with runtime activation/native qualification pending. Windows/Linux arrange Back, Forward, sidebar toggle and File/Edit/View/Help above the workspace; macOS keeps system menus and native traffic lights. Use Light/Dark tokens, draggable empty space, non-draggable controls and actual native control safe metrics. At narrow widths/200% zoom keep arrows and a labelled compact Menu reachable without overlap. Main owns native controls/overlay/menu behavior. Actual renderer captures and separate host checks are required before claiming compliance.

Use one primary scroll region for the active document/activity. Navigation and a genuinely independent detail document may scroll separately. Reflow long input, outlines, and text zoom without clipping controls or overlaying the primary action.

Hover/focus changes are about 100–150 ms; menu/disclosure/selection transitions about 150–200 ms. Prefer opacity and small position changes. Avoid animating an entire learning document on every response or changing panel dimensions while the learner reads. Reduced motion removes positional animation and leaves immediate state feedback.

## Review evidence

Review actual desktop screenshots and interactions for empty, populated, pending, error, and completed states. Include the minimum supported window, 200% text zoom, keyboard operation, long titles/input, and reduced motion. Verify any implemented theme separately. Compare composition and behavior with the supplied screenshots, while keeping product identity and learning vocabulary ours.
