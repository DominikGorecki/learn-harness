# ADR-0013: Screenshot-led ChatGPT styling and local appearance settings

- Status: Accepted; native-title-bar/overlay scope amended by [ADR-0024](ADR-0024-integrated-title-strip-with-native-controls.md)
- Date: 2026-10-04
- Scope: renderer presentation, persistent UI session, appearance preference and documentation. Amends ADR-0007's visual palette and theme scope; application services and security boundaries are unchanged.

## Subsequent scoped amendment — 2026-10-07

[ADR-0025](ADR-0025-scoped-editorial-workspace-and-aperture-identity.md) adopts the [main-workspace standard](../patterns-main-workspace.md) for central contextual header/content and artwork in existing brand/native-icon slots. It amends generic central headings/actions/composition only. Local Light/Dark preference, semantic palettes, partition/security and excluded panel/dialog rules remain in force; ADR-0024 retains its title/native-control scope. Original appearance history below remains dated evidence.

## Context

The user supplied light and dark screenshots of the current ChatGPT application, asked that they guide the UI and documentation, and explicitly requested light/dark switching in settings. The screenshots replace the earlier generic Codex reference as the primary visual reference for this change. They show a narrow icon rail, a tinted project sidebar, an inset workspace, spacious composition, rounded controls, and a restrained purple accent. The dark reference also demonstrates grouped appearance controls and visual mode previews. The original images were subsequently excluded from the current public source for privacy; the [appearance review](../research/chatgpt-app-appearance.md) retains the observations and isolated application captures.

## Decision

The native-title-bar and native appearance restrictions below describe the original decision. [ADR-0024](ADR-0024-integrated-title-strip-with-native-controls.md) supersedes only those restrictions for the integrated application strip with native window controls and bounded Light/Dark overlay presentation; runtime activation and host qualification are tracked separately. All other appearance, preference and security rules remain in force.

Use the supplied composition with Learning Studio's existing project, account, and outline vocabulary. Provide only working navigation controls. Keep native window chrome. Use a pale cool shell and white workspace in Light; use a dark tinted shell, `#181818` workspace and `#232323` raised surfaces in Dark. Apply a complete semantic token palette to every renderer surface, including dialogs, errors, forms, native select menus, outlines and focus indicators. The palette is a product adaptation, not a claim to reproduce undocumented ChatGPT tokens.

Add a Settings dialog accessible through the rail and Cmd/Ctrl+comma, with a labelled Light/Dark radio group and visual previews. Changes apply immediately without changing projects, drafts, accounts, models or active runs. Preserve keyboard focus on dismissal. At narrow sizes move the rail to the bottom so the workspace remains readable.

Remember the explicit preference in renderer-origin localStorage under `learning-studio.appearance`; it is non-sensitive, device-local presentation state, separate from portable `.edu` data. Before the first React render, apply the saved valid choice, or use the OS light/dark preference when no valid choice exists. A chosen mode remains fixed until changed; there is no separate continuously following System mode. If storage is unavailable, allow session-only changes with a clear note. Use the dedicated `persist:edu-harness` Electron partition so origin-local UI storage survives restart; register the same permissions and protocol restrictions on that exact partition. This is the only main-process change required for the UI preference. Electron documents the [persistent versus in-memory partition behavior](https://www.electronjs.org/docs/latest/api/session#sessionfrompartitionpartition-options). Do not add privileged APIs, persist credentials in the renderer, or override native window appearance.

## Consequences

Light and Dark are now authorized presentation features. All feature styles consume semantic tokens rather than assuming white backgrounds. Theme selection has no backend or inference effect. The original screenshot controls for theme imports, accent editing, fonts, search, voice and other product features are references only and are not added.

Screenshots are reference assets, not runtime UI assets or application evidence. Review actual app captures separately in both themes, including account and recovery dialogs, long outlines, narrow windows, keyboard navigation and 200% zoom. Native window chrome continues to follow the operating system; renderer appearance does not override it.

Current rules: [design system](../patterns-design-system.md), [UX](../patterns-ux.md), [renderer](../patterns-renderer.md). Reference and verification: [appearance review](../research/chatgpt-app-appearance.md).
