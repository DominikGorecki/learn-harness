# Main-workspace patterns

Governed by [ADR-0025](ADRs/ADR-0025-scoped-editorial-workspace-and-aperture-identity.md), a scoped amendment to [ADR-0007](ADRs/ADR-0007-codex-inspired-design-and-ux.md)/[ADR-0013](ADRs/ADR-0013-chatgpt-inspired-appearance.md). Read the [design system](patterns-design-system.md), [UX](patterns-ux.md), [renderer](patterns-renderer.md) and relevant [flows](patterns-flow.md) alongside this standard.

**Status:** selected standard adopted; shared foundation and central forms migrated. Overview/topic reading and identity/native-icon implementation remain assigned to later [bundle 04](work/04-main-workspace-design/main-workspace-design.spec.md) tickets. Acceptance and host/manual qualifications are recorded by that bundle. Do not infer complete migration from adoption.

## Reference and region

The selected [Quiet action groups reference](../docs/design/component-designs/02-project-overview/project-overview-final.png) governs central presentation. Use a strong subject/task heading, generous readable spacing, faint lilac wash, soft neutral rows/forms and restrained labelled action groups. Use complete real data rather than matching sample lengths. The selected bitmap is a design target; actual [projects](flows/projects/index.md)/[appearance](flows/appearance/index.md) captures show its implemented form adaptation.

`App.tsx` places `.main-workspace` on the scrollable central `main` and `.main-workspace-header` on the contextual header. [workspace.css](../src/renderer/src/workspace.css) owns the scoped recipe; [Workspace.tsx](../src/renderer/src/components/Workspace.tsx) loads it. Do not put these classes/tokens on `.studio-workspace`, which also contains the AI dock. Avoid global heading/button/palette changes. All new selectors are central/header scoped; feature class consumers explicitly choose their region. Rail, sidebar/drawer, account/Settings/detail panels, title strip and overlays retain their existing design. The approved ADR-0022 workbench remains an independent sibling.

## Shared primitives and consumers

All primitives in `Workspace.tsx` are renderer presentation only and accept content/callbacks from their feature.

| Primitive | Role / current consumers |
| --- | --- |
| `WorkspacePage` | Labelled central section, wide or reading measure; Dashboard, ProjectSetup, App loading/folder recovery |
| `WorkspaceHeader` | Eyebrow, one focus-anchored h1, full lead and optional authoritative status; same consumers |
| `WorkspaceActions` / `WorkspaceAction` | Related independent real buttons, optional named group, neutral or quiet primary; dashboard opening, setup create/save/examples, App recovery/dismissal |
| `WorkspaceRow` | Opaque soft group without interaction ownership; dashboard project rows |
| `WorkspaceSection` | Semantic document section with heading/count; dashboard project list |
| `WorkspaceContext` | Responsive context columns; available for overview adoption, no current consumer yet |
| `WorkspaceMessage` | Wrap-capable plain feedback with alert/status semantics; App project/model/AI/generation issues and unsaved-review recovery |

Setup retains labelled full drafts, model preferences, goal saves, explicit generation, material/allowance disclosure and stable folder disclosure/focus anchors. Dashboard retains project name, full path, availability and outline information. App callbacks/history/AI admission remain existing owners. Outline/reading adaptation is pending; do not claim current consumers for an unused primitive.

## Tokens and geometry

Values are product choices, not measurements of the generated bitmap. Existing state/focus/text tokens remain those of the design system.

| Scoped token | Light | Dark |
| --- | --- | --- |
| `workspace-wash` | `rgba(121,68,202,.045)` | `rgba(181,138,248,.055)` |
| `workspace-surface` | `#F6F6F8` | `#202022` |
| `workspace-highlight` | `#FCFCFD` | `#28282D` |
| `workspace-edge` | `#E2E2E8` | `#3C3C44` |
| `workspace-hover` | `#EEEEF3` | `#303037` |
| `workspace-action-text` | `#7040B5` | `#C6A2FA` |
| `workspace-radius` | 16px | 16px |
| `workspace-heading-size` | 40px, 28px narrow | 40px, 28px narrow |

Headings use system sans, weight 600, line-height 1.2. Reading text is 16px/1.65; controls/supporting disclosure 14px, secondary status 13px. Wide page maximum is 1080px including 32px side insets; reading/composer maximum is 824px including those insets (760px content). Normal top/section spacing is 32–40px; narrow side inset is 16px and heading 28px at 640 CSS px or less. Context columns stack from a 260px minimum; rows/actions wrap without hiding commands. Action groups have a 12px radius and fine separation; commands are at least 40px tall. Native text selection and the one primary scroll region remain intact.

The glass appearance is fully opaque gradients between neutral highlight/surface colors. No backdrop-filter, native acrylic/Mica, window transparency, continuously animated wash or repeated-row blur is used. Disabled commands retain labels; errors/saved status retain text and existing state meanings. Focus uses the existing 2px accent outline with 3px offset; composer focus surrounds the labelled form. Page entrance is immediate and reduced motion suppresses scoped transitions. Async messages announce without stealing focus.

## Selected identity and pending asset adoption

The [Sculpted aperture handoff](../docs/design/component-designs/03-learning-studio-logo/learning-studio-logo-selection.md) and [final reference](../docs/design/component-designs/03-learning-studio-logo/learning-studio-logo-final.png) establish exactly three separated broad pages, two rising sides and a shallow bottom around an upright triangular opening. Retain top/lower-diagonal gaps and the taller silhouette. Production glyph fill is flat; a restrained lilac-on-charcoal tile is reserved for native icons. Keep Learning Studio text, slot dimensions/control names, decorative accessibility and functional icons unchanged. Replacing existing brand glyphs is the only panel exception.

The current `Mark.tsx` radial spark and default native icons are still pending replacement. Later implementation must record one editable master, verified asset/consumer paths, clear space/minimum size, Light/Dark/monochrome treatment, reproducible ICO/ICNS/PNG export commands/size sets and small-size/package/native evidence. The approved PNG is not a production vector or qualified icon. No app ID, profile-path, signing, publishing or installer migration is authorized here.

## Future central-page checklist

1. Identify task/beneficiary and central scope, retaining excluded panels/dock/title boundaries.
2. Name shared page/header/context/section/row/action consumers and explain any justified deviation.
3. Preserve complete empty/loading/ready/pending/needs-input/error/unsaved/recovery states; derive saved status from backend publication.
4. Name entry points, stable destination identity, history effects, authoritative resolution/fallback, scroll/disclosure/focus restoration and active AI ownership. Explicitly identify no-history changes. Use the existing ADR-0023 owner.
5. Review real Light/Dark, long text, narrow/200% zoom, opaque fallback, keyboard/focus/selection/contrast and reduced-motion evidence. Keep full content and all actions reachable with the independent AI dock open.
6. Refresh the actual flow through the configured reporter, inspect PNGs and maintain its narrative. Update this consumer inventory when contracts change. Record live/native/screen-reader limits separately; concepts and fixture captures do not establish those qualifications.
