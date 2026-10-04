# ChatGPT screenshot reference and appearance review

Date: 2026-10-04. Source: the two screenshots explicitly supplied by the user. This is a UI and documentation change; the learning, project, account and inference contracts remain unchanged.

## Reference and interpretation

- [Light workspace reference](../../docs/chatgpt-app-light.png): a narrow outer rail, pale cool navigation, white inset workspace, generous empty space, simple project rows and a rounded composer. A small purple indicator provides emphasis.
- [Dark appearance reference](../../docs/chatgpt-app-dark.png): a dark tinted shell, nearly black workspace, raised charcoal settings groups, fine dividers and purple selection borders around mode previews.

The screenshots show different activities. Light is a project workspace; Dark is an appearance-settings page. Neither is evidence of the other product's implementation, hidden states or exact token system. Learning Studio adapts the visible structure and tone to its current learning flows. The supplied screenshots remain unmodified.

## Design brief

**Visual thesis:** A calm, spacious learning workspace with a softly tinted outer shell, clear surface layers and a small purple accent, equally deliberate in light and dark.

**Content plan:** Keep project navigation compact; make the learning question and composer the primary setup surface; keep outlines as readable documents; disclose folder context, coverage, account details and appearance settings when useful. The next action remains Open project, Create outline or the relevant recovery action.

**Interaction thesis:** Retain a brief workspace entrance, quiet hover/focus feedback and rotating disclosure affordances. Apply appearance changes immediately without moving content. Honor reduced motion throughout, and preserve the current draft and reading context when settings closes.

## Scope

- Renderer shell, navigation, input, outline and dialog styling.
- Settings → Appearance with Light/Dark visual radio choices and local preference persistence.
- A bottom control rail on narrow windows; working controls only.
- Shared semantic colors for normal, hover, selected, focus, disabled, warning and error states.

Keep native OS window controls. No custom title bar, decorative imitation of unavailable ChatGPT features, theme import/export, font editor, additional AI capability or authentication change is included.

## Validation

- `npm run check` passed: lint, 126 unit tests, both TypeScript scopes and production bundles.
- `xvfb-run -a npm run test:desktop` passed: eight desktop journeys. The packaged-worker-only test is deliberately skipped in this ordinary desktop run; packaging was not rerun for this appearance update.
- The new appearance journey verifies native radio keyboard controls, immediate light/dark styling, dialog focus restoration, unchanged learner draft and project files, persistence across process restart and page reload, and graceful session-only behavior when preference storage throws.
- The generated-outline journey verifies that changing theme preserves the reading position and saved outline without another inference request. The long-outline journey now runs in Dark, including narrow 300-CSS-pixel content at 200% zoom, reduced motion and filesystem recovery.
- Reviewed actual Light/Dark workspace and Settings captures, dark account/recovery surfaces and narrow/zoomed content. Body text and accent token contrast across canvas/navigation/raised/selected surfaces has a minimum ratio of 4.56:1 in Light and 4.83:1 in Dark; this is a focused palette check, not a complete accessibility certification.
- UI persistence required changing both session references to `persist:edu-harness`; Electron's previous in-memory partition discarded localStorage on quit. Existing sandbox, permission denial, protocol registration and account/project services remain intact.
- Local documentation links and whitespace were checked. No Context Bank content was modified.

Actual application captures (isolated test project, not the supplied references):

| Light | Dark |
| --- | --- |
| [Workspace](assets/appearance-workspace-light.png) | [Workspace](assets/appearance-workspace-dark.png) |
| [Settings](assets/appearance-settings-light.png) | [Settings](assets/appearance-settings-dark.png) |

This update was exercised on Linux under Xvfb. Windows/macOS and live-provider checks were not repeated for this presentation slice. Earlier PRD native CI results apply to their recorded commits; they do not establish native-platform verification of this appearance change.
