# Main-workspace patterns

Governed by [ADR-0025](ADRs/ADR-0025-scoped-editorial-workspace-and-aperture-identity.md), a scoped amendment to [ADR-0007](ADRs/ADR-0007-codex-inspired-design-and-ux.md)/[ADR-0013](ADRs/ADR-0013-chatgpt-inspired-appearance.md). Read the [design system](patterns-design-system.md), [UX](patterns-ux.md), [renderer](patterns-renderer.md) and relevant [flows](patterns-flow.md) alongside this standard.

**Status:** adopted and implemented across current central pages, including saved overview/topic reading and the Sculpted aperture brand/native resources. [Bundle 04 acceptance](work/04-main-workspace-design/acceptance.md) and [validation](work/04-main-workspace-design/validation.md) distinguish local migration/evidence from final integration and remaining live/native/manual qualifications. Adoption alone does not establish those qualifications.

## Reference and region

The selected [Quiet action groups reference](../docs/design/component-designs/02-project-overview/project-overview-final.png) governs central presentation. Use a strong subject/task heading, generous readable spacing, faint lilac wash, soft neutral rows/forms and restrained labelled action groups. Use complete real data rather than matching sample lengths. The bitmap is a design target; actual [projects](flows/projects/index.md), [appearance](flows/appearance/index.md), [outline](flows/outline/index.md), [topic reading](flows/topic-reading/index.md), [reading](flows/reading/index.md) and [recovery](flows/recovery/index.md) captures show implemented adaptations, with each manifest's recorded freshness and limits.

`App.tsx` places `.main-workspace` on the scrollable central `main` and `.main-workspace-header` on the contextual header. [workspace.css](../src/renderer/src/workspace.css) owns the scoped recipe; [Workspace.tsx](../src/renderer/src/components/Workspace.tsx) loads it. Do not put these classes/tokens on `.studio-workspace`, which also contains the AI dock. Avoid global heading/button/palette changes. All new selectors are central/header scoped; feature class consumers explicitly choose their region. Rail, sidebar/drawer, account/Settings/detail panels, title strip and overlays retain their existing design. The approved ADR-0022 workbench remains an independent sibling.

## Shared primitives and consumers

All primitives in `Workspace.tsx` are renderer presentation only and accept content/callbacks from their feature.

| Primitive | Role / current consumers |
| --- | --- |
| `WorkspacePage` | Labelled central section, wide or reading measure; Dashboard, ProjectSetup, OutlineView, TopicView, App loading/folder recovery |
| `WorkspaceHeader` | Eyebrow, one focus-anchored h1, full lead and optional authoritative status; same consumers |
| `WorkspaceActions` / `WorkspaceAction` | Related independent real buttons, optional named group, neutral or quiet primary; Dashboard, ProjectSetup, OutlineView, TopicView, TopicContentControls, App recovery/dismissal |
| `WorkspaceRow` | Opaque soft group without interaction ownership; Dashboard project rows, OutlineView topic rows, TopicView module plans |
| `WorkspaceSection` | Semantic document section with heading/count; Dashboard project list, OutlineView learning path, TopicView plans and ChapterReader document sections |
| `WorkspaceContext` | Responsive context columns; OutlineView scope/level and outcomes |
| `WorkspaceMessage` | Wrap-capable plain feedback with alert/status semantics; App project/model/AI/generation issues and unsaved-review recovery |

The actual consumers are [App.tsx](../src/renderer/src/app/App.tsx), [Dashboard.tsx](../src/renderer/src/features/projects/Dashboard.tsx), [ProjectSetup.tsx](../src/renderer/src/features/projects/ProjectSetup.tsx), [OutlineView.tsx](../src/renderer/src/features/projects/OutlineView.tsx), [TopicView.tsx](../src/renderer/src/features/projects/TopicView.tsx), [ChapterReader.tsx](../src/renderer/src/features/projects/ChapterReader.tsx) and [TopicContentControls.tsx](../src/renderer/src/features/projects/TopicContentControls.tsx). Setup covers empty/material-led input, refinement and clarification with full drafts, model preferences, goal saves, explicit generation and material/allowance disclosure; its existing [ProjectModel.tsx](../src/renderer/src/features/projects/ProjectModel.tsx) control consumes the scoped composer/header treatment. Dashboard preserves names, paths, availability and outline status. App covers loading, unavailable-folder recovery, project/model/AI/generation messages and retained unsaved-result review. OutlineView covers both saved and proposed-unsaved documents; TopicView reads current saved plans or chapters. ChapterReader provides bounded inert rich prose, TOC, ordered objectives/examples/misconceptions, synthesis, local images/captions and source notes. TopicContentControls supplies explicit generation and domain-owned recovery with cached estimates. Existing dialogs, AI panel and sidebar consumers do not adopt these primitives by inheritance.

## Saved documents and navigation

The overview presents complete scope/level/outcomes, ordered topics, source coverage, assumptions, additions and generation context. **Open first topic** resolves `startingLessonId`, which need not be row one. **Edit outline**, **Open topic** and **Edit topic** remain separate labelled buttons; title navigation never encloses editing. **Your learning path** ordinals/counts describe saved structure. Proposed unsaved output displays **Not saved yet**, retains full preview disclosures and disables its topic-opening commands with a save explanation; it creates no saved-topic route.

TopicView presents the current saved question, overview, objectives, prerequisites, module purpose/task and sources, with **Back to outline** and **Edit topic**. Reading works offline without an account and starts no inference, lesson execution or mastery assessment. Read-only saved data remains readable; mutations retain their authoritative availability rules.

Under ADR-0026, a published chapter becomes the primary saved-topic document; its original plan moves into **Topic plan** disclosure. **Generate Content**, deliberate text-only generation, confirmed whole regeneration, Complete images and explicit checkpoint recovery share quiet central action groups. Saved chapters put general generation/model/estimate detail in a secondary disclosure; outstanding planned or retry estimates remain beside recovery. Native image dimensions reserve layout and missing media retain caption/alternative explanation and prose. Keep the independent AI dock usable without dimming saved reading. The [chapter reader](flows/chapter-reader/index.md) and [commands](flows/chapter-commands/index.md) provide scoped renderer/main evidence; fixture diagrams do not establish live instructional quality.

`ChapterReader` places a muted accessible regenerate overlay inside each saved image frame, including missing-raster explanation frames. Its [image dialog](../src/renderer/src/features/projects/ImageReplacementDialog.tsx) remains excluded from the central page recipe and uses native modal composition with semantic Light/Dark surfaces and a scrollable comparison body. One retained review owns the topic's image actions; explicit Use/Keep/Retry changes no navigation destination. See the [image regeneration journey](flows/image-regeneration/index.md).

Use the single ADR-0023 owner in [app/navigation/useNavigation.ts](../src/renderer/src/app/navigation/useNavigation.ts) and [destination.ts](../src/renderer/src/app/navigation/destination.ts). Session history retains at most 100 dashboard/project/topic visits. A topic identity is the profile project handle plus stable saved lesson ID; titles, paths and revisions are not identity. Resolve against current authoritative saved data after renames/rewrites. Missing topics canonicalize to the owning current overview with an explanation; unavailable projects resolve normal recovery. Failed/cancelled/stale transactions retain history. Module expansion is disclosure, not a module destination.

[mementos.ts](../src/renderer/src/app/navigation/mementos.ts) and [view-memento-dom.ts](../src/renderer/src/app/navigation/view-memento-dom.ts) retain per-destination scroll, stable disclosure and safe focus only for retained session destinations. Restore after authoritative content renders, clamp scroll, drop missing/disabled/hidden anchors and focus the heading without scrolling. Drafts, refinement visibility and domain-owned recovery remain separately owned; traversal never restores old content or undoes a save. Editor dismissal returns to its actual trigger; a deleted edited topic closes safely to the current heading.

Chapter presentation stays unready until every bounded local page for the current selection/revision has assembled into stable DOM. Delayed or stale reads cannot acknowledge history against a short initial plan, reuse another project's chapter or reset manual scroll after ordinary provider/progress updates. Chapter TOC, section/image focus and Topic plan/generation disclosure use bounded stable anchors. These actions, reload, provider setup, generation and saves do not add destinations.

Same-project saved overview/topic navigation uses the current snapshot without `selectProject`; it remains available during Receiving, Cancelling and Saving without changing the ADR-0022 operation owner. Dashboard/other-project departure keeps Stay here / Cancel and switch, awaited cleanup and Saving rejection with a fresh command required after settlement. No competing inference producer or independent history stack is introduced.

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

Headings use system sans, weight 600, line-height 1.2. Reading text is 16px/1.65; controls/supporting disclosure 14px, secondary status 13px. Wide page maximum is 1080px including 32px side insets; reading/composer maximum is 824px including those insets (760px content). Normal top/section spacing is 32–40px; narrow side inset is 16px and heading 28px at 640 CSS px or less. Context columns stack from a 260px minimum; rows/actions wrap without hiding commands. Action groups have a 12px radius and fine separation; commands normally have a 40px minimum height. At viewport height <=420 CSS px, central commands use 32px minimum height with 4px/10px padding and the contextual header uses a compact 32px minimum height. At simultaneous narrow/short size, that header avoids wrapping while keeping model/account controls reachable. These exceptions are scoped to central content/header, preserving dock/chrome/panels. Native text selection and the one primary scroll region remain intact.

The glass appearance is fully opaque gradients between neutral highlight/surface colors. No backdrop-filter, native acrylic/Mica, window transparency, continuously animated wash or repeated-row blur is used. Disabled commands retain labels; errors/saved status retain text and existing state meanings. Focus uses the existing 2px accent outline with 3px offset; composer focus surrounds the labelled form. Page entrance is immediate and reduced motion suppresses scoped transitions. Async messages announce without stealing focus. Target ordinary text contrast 4.5:1 and large text/essential controls/focus 3:1 against actual composed surfaces; decorative edges may remain quieter. Review opaque gradients and solid fallback, full long titles/content, minimum 600px content window at 200% Electron zoom, keyboard hit targets and saved reading with the independent dock open. Default, hover/pressed, focus, disabled/pending and error/recovery states retain visible labels and local feedback; AI never dims or makes the whole saved document inert.

Adjacent grouped commands meet at their divider with no horizontal gap and have square corners beside it on both sides; only the group's outer command corners remain rounded. A single-command group keeps all four command corners rounded.

## Selected identity and native resources

The [Sculpted aperture handoff](../docs/design/component-designs/03-learning-studio-logo/learning-studio-logo-selection.md) and [final reference](../docs/design/component-designs/03-learning-studio-logo/learning-studio-logo-final.png) establish exactly three separated broad pages, two rising sides and a shallow bottom around an upright triangular opening. Retain top/lower-diagonal gaps and the taller silhouette. Production glyph fill is flat; a restrained lilac-on-charcoal tile is reserved for native icons. Keep Learning Studio text, slot dimensions/control names, decorative accessibility and functional icons unchanged. Replacing existing brand glyphs is the only panel exception.

The sole editable master is [sculpted-aperture.svg](../assets/branding/sculpted-aperture.svg). [Mark.tsx](../src/renderer/src/components/Mark.tsx) consumes generated [brand-geometry.ts](../src/renderer/src/components/brand-geometry.ts) using `currentColor`; existing theme accent/primary-text colors and monochrome treatments change fill only. Marks remain decorative beside exact **Learning Studio** text, preserving existing 22px/36px slots. Keep the viewBox's roughly 7% clear space and three gaps; 16px is the minimum reviewed glyph size. Partial antialiasing may join edges at small sizes; the three high-opacity cores remain separate.

Derived [app-icon.svg](../assets/branding/app-icon.svg) supplies the native tile: flat `#CEAEF3` glyph, opaque charcoal `#343940`–`#202329` rounded square and transparent outside padding. Glyph-only art belongs in existing renderer brand slots; the tile belongs in native resources. [Asset documentation](../assets/branding/README.md) owns exact geometry, alpha-review method, outputs and exporter limitations. PNG tiles cover 16/24/32/48/64/128/256/512/1024px; ICO covers 16/24/32/48/64/128/256px; ICNS covers 16/32/64/128/256/512/1024px. [electron-builder.yml](../electron-builder.yml) consumes `assets/branding/icon.ico`, `icon.icns` and Linux `icon-512.png`, and copies only `icon.png` to fixed `resources/branding/icon.png` for main's BrowserWindow resource.

Run `npm run branding:export`, then `npm run branding:check`; package with `npm run package`, audit with `npm run branding:package`, and exercise ASAR workers with `npm run test:packaged`. Checked-in exports and [exports.json](../assets/branding/exports.json) use pinned Electron/Chromium rendering; builds do not regenerate artwork or call AI. Windows byte reproducibility, packaged resource frames and actual Explorer Details/Large icons were exercised. Runtime/taskbar presentation was not completed; macOS/Linux native packaging/presentation, cross-host byte identity, signing and installers remain unrun qualifications. Generated previews and approved concepts do not establish those gates. No app ID/profile-path/signing/publishing/installer migration is authorized.

## Future central-page checklist

1. Identify task/beneficiary and central scope, retaining excluded panels/dock/title boundaries.
2. Name shared page/header/context/section/row/action consumers and explain any justified deviation.
3. Preserve complete empty/loading/ready/pending/needs-input/error/unsaved/recovery states; derive saved status from backend publication.
4. Name entry points, stable destination identity, history effects, authoritative resolution/fallback, scroll/disclosure/focus restoration and active AI ownership. Explicitly identify no-history changes. Use the existing ADR-0023 owner and ADR-0022 coordinator/profile/panel for any separately authorized inference producer.
5. Review real Light/Dark, long text, narrow/200% zoom, opaque fallback, keyboard/focus/selection/contrast and reduced-motion evidence. Keep full content and all actions reachable with the independent AI dock open.
6. Refresh the actual flow through the configured reporter, inspect PNGs and maintain its narrative. Update this consumer inventory when contracts change. Record live/native/screen-reader limits separately; concepts and fixture captures do not establish those qualifications.
