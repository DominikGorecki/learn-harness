# Codex desktop UI reference and learning-workspace adaptation

Historical reference: the later user-supplied ChatGPT screenshots and [appearance review](chatgpt-app-appearance.md) supersede this page as the primary visual reference under ADR-0013.

- Researched: 2026-10-04.
- Request: update this application's UI/UX patterns using the latest Codex desktop experience as inspiration.
- Deliverable: documentation and design standards. Application code and the saved demo screenshot are unchanged.

## Current reference

The former Codex app documentation now redirects to ChatGPT Learn. The official [changelog](https://learn.chatgpt.com/docs/changelog) records Codex joining the ChatGPT desktop app on July 9, 2026. The current [desktop guide](https://learn.chatgpt.com/docs/app) describes a shared workspace for projects, chats, and reviewable outputs. The reference here is the Codex desktop experience within that app.

Reviewed the live official documentation and visually inspected its rendered navigation/Add-menu, project-list, and Appearance illustrations in a browser. Those are documentation illustrations, not captures of an installed Codex build. Theme choices and releases can change the appearance; the measurements and tokens below are our own design decisions.

## Evidence and adaptation

| Official reference | Verified observation | Learning Studio adaptation |
| --- | --- | --- |
| [Projects and chats](https://learn.chatgpt.com/docs/projects) | Projects organize related work; the illustrated sidebar uses compact rows, hierarchy, selection, and small activity markers. | Give learning projects and their supported activities clear navigation. Preserve place and drafts when moving between workspaces. A project continues to mean the ordinary folder described in our product overview. |
| [Features](https://learn.chatgpt.com/docs/features) | The navigation/Add-menu illustration groups primary navigation and contextual actions with sparse icons and short labels. | Keep frequent actions visible and group secondary actions in labelled menus. Add controls only for available capabilities. |
| [Appearance settings](https://learn.chatgpt.com/docs/reference/settings#appearance) | The illustration presents light/dark/system themes, a system UI font, separate code font, neutral foreground/background values, and configurable accent colors. | Adopt neutral surfaces, system sans-serif typography, one accessible blue accent, and semantic tokens. Specify theme-ready values without requiring theme customization as part of the first milestone. |
| [Commands](https://learn.chatgpt.com/docs/reference/commands) | The reference exposes navigation, command-menu, sidebar, and font-size shortcuts with platform-specific bindings. | Define keyboard access and discoverable shortcuts for supported learning actions. Keep multiline learning input editable without accidental submission. |
| [Work with files](https://learn.chatgpt.com/docs/artifacts-viewer) | The desktop experience previews outputs alongside a conversation and supports focused review. | Treat an outline or learner artifact as a readable working document. Show sources and selected-item details when they help review the current result. |
| [Long-running work](https://learn.chatgpt.com/docs/long-running-work) | The app has visible progress controls and keeps ongoing work in its conversation context. | Keep project identity, drafts, progress, cancellation, and recoverable results understandable when outline generation is introduced. |

These adaptations are project design judgments. The sources establish the reference behavior; they do not prescribe our lesson hierarchy, backend, palette values, dimensions, or inference integration.

## Adopted design direction

Visual thesis: a quiet desktop learning workspace, with neutral surfaces, clear sans-serif type, compact navigation, and a spacious primary task area.

Content plan: project navigation; a contextual workspace header; a topic/goal input or current learning document; and optional details for the selected material, lesson, or result. The first milestone's concrete surfaces remain those in [PRD 01](../prds/01-project-setup-and-outline.md).

Interaction thesis: stable navigation that preserves place, small transitions for selection/disclosure, and immediate visible feedback near the action that triggered it. Motion is removed under reduced-motion preferences.

Use our own Learning Studio identity and learner-facing vocabulary. The reference does not introduce Git, terminals, plugins, tool logs, model reasoning controls, floating pets, or multi-agent management into the learning product. Those capabilities need separate requirements if they become useful.

## Documentation ownership and migration

- [Design system](../patterns-design-system.md): composition, tokens, typography, component states, responsive layout, and motion.
- [UX](../patterns-ux.md): orientation, navigation, input, progress, recovery, accessibility, and learning interaction.
- [Renderer](../patterns-renderer.md): React boundaries, state ownership, request handling, focus/scroll implementation, and safe rendering.
- [ADR-0007](../ADRs/ADR-0007-codex-inspired-design-and-ux.md): adoption of this direction and separation of responsibilities.

The existing renderer still uses warm surfaces, terracotta actions, Georgia headings, and a fixed explanatory side panel. The new standards supersede that earlier visual direction for future UI changes. No project persistence, folder opening, account connection, generation, theme settings, search, or new keyboard shortcuts have been implemented by this documentation update.

## Validation for this update

Check local Markdown links, inspect the diff, and verify the pattern/ADR/agent routes. No application tests are needed for documentation-only changes. A later UI implementation must validate the actual screens, keyboard journey, zoom, contrast, reduced motion, request states, and target desktop platforms.

Completed: local link resolution and whitespace/diff checks; a scoped before/after comparison of the existing overview, PRD, and README; and numerical contrast checks for 56 documented foreground/surface pairs across the light/dark targets. Essential control borders were adjusted to meet the 3:1 target on selected surfaces as well. These checks validate the documentation and proposed palette, not the current rendered interface.
