# Design system patterns

Governed by [ADR-0007](ADRs/ADR-0007-codex-inspired-design-and-ux.md). Evidence and reference boundaries: [Codex desktop research](research/codex-desktop-ui.md).

**Status:** adopted visual standard for future UI work. The current demo renderer has not been migrated. Values here are Learning Studio defaults, chosen for this product; they are not measured Codex implementation tokens.

## Composition

Use a quiet desktop workspace with neutral surfaces, system sans-serif type, compact navigation, and one spacious working area. The subject, current activity, and next action establish hierarchy. Brand identification stays compact in application chrome.

The shell contains navigation, a contextual header, the primary learning surface, and optional selected-item details. Start with two regions: navigation and workspace. Open a detail pane only for useful context such as a selected lesson's objectives or an outline's sources. Keep generic learning tips within the relevant activity rather than permanently occupying a third pane.

Use rows, document sections, and disclosure for project/lesson lists. A bordered container should identify an input, interactive artifact, dialog, or a real group. Keep routine metadata quiet. Give each workspace state one primary action; account/model settings remain compact unless the learner is resolving them.

## Visual tokens

Use semantic CSS variables so components consume purpose-based values. Keep state colors distinct from brand/accent color. Prefer opaque surfaces for predictable rendering across desktop platforms; any future translucency must preserve contrast and work with an opaque fallback.

| Token role | Light target | Dark target | Purpose |
| --- | --- | --- | --- |
| `surface-canvas` | `#FFFFFF` | `#181818` | Main workspace |
| `surface-navigation` | `#F5F5F5` | `#202020` | Sidebar |
| `surface-raised` | `#FAFAFA` | `#262626` | Composer, menu, or panel |
| `text-primary` | `#171717` | `#F5F5F5` | Main text and headings |
| `text-secondary` | `#626262` | `#B0B0B0` | Supporting text |
| `border-subtle` | `#E5E5E5` | `#3A3A3A` | Decorative separators |
| `border-control` | `#808080` | `#808080` | Boundaries needed to recognize an input |
| `surface-selected` | `#EAEAEA` | `#333333` | Current navigation row |
| `accent` | `#1D4ED8` | `#60A5FA` | Focus, links, restrained selection emphasis |
| `state-success` | `#166534` | `#86EFAC` | Confirmed successful result |
| `state-warning` | `#92400E` | `#FCD34D` | Attention needed |
| `state-error` | `#B91C1C` | `#FCA5A5` | Failure and corrective action |

Primary buttons use `text-primary` as their fill and `surface-canvas` as their label color. Blue accents support orientation and focus; ordinary surfaces remain neutral. Use text and shape alongside state colors. A saved result, a completed activity, and a selected item have different meanings even when all appear positive.

The first implementation can use the light target. Dark/system theme support and appearance settings require an explicit implementation slice. Documenting paired values does not authorize a custom-theme editor, imports, or theme sharing.

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

Use a spacing scale of 4, 8, 12, 16, 24, 32, and 48 px. Default sidebar width is about 240 px, toolbar height about 48 px, and workspace inset 24–32 px. A reading/input column is normally 680–760 px wide, with wider outlines using available space. These are starting values; adapt to content and zoom rather than locking every screen to fixed dimensions.

Use 6 px corners for rows, 8 px for buttons/inputs, and 12 px for menus/panels/composers. Keep borders thin and shadows light; reserve elevation for overlays or a surface whose separation affects use. Avoid decorating every content section with a card.

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

Collapse optional details before shrinking the primary working column. Narrow the sidebar or provide a labelled toggle when the viewport cannot fit navigation and work comfortably. Provide a route to every hidden action. Preserve native window controls and normal platform window behavior; custom title bars need a separate implementation decision.

Use one primary scroll region for the active document/activity. Navigation and a genuinely independent detail document may scroll separately. Reflow long input, outlines, and text zoom without clipping controls or overlaying the primary action.

Hover/focus changes are about 100–150 ms; menu/disclosure/selection transitions about 150–200 ms. Prefer opacity and small position changes. Avoid animating an entire learning document on every response or changing panel dimensions while the learner reads. Reduced motion removes positional animation and leaves immediate state feedback.

## Review evidence

Review actual desktop screenshots and interactions for empty, populated, pending, error, and completed states. Include the minimum supported window, 200% text zoom, keyboard operation, long titles/input, and reduced motion. Verify any implemented theme separately. Compare composition and behavior with the research reference, while keeping product identity and learning vocabulary ours.
