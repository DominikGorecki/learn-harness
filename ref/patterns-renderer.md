# Renderer patterns

Governed by [ADR-0001](ADRs/ADR-0001-typescript-electron-process-layout.md), [ADR-0002](ADRs/ADR-0002-sandboxed-capability-ipc.md), [ADR-0003](ADRs/ADR-0003-core-learning-services-and-demo-state.md), [ADR-0007](ADRs/ADR-0007-codex-inspired-design-and-ux.md), [ADR-0013](ADRs/ADR-0013-chatgpt-inspired-appearance.md), and [ADR-0017](ADRs/ADR-0017-outline-rewrites-with-saved-context.md).

Read [design system](patterns-design-system.md) for appearance and [UX](patterns-ux.md) for interaction contracts before changing a screen. This file owns renderer implementation rules.

## Organization and state

`app/App.tsx` composes project navigation, the learning workspace, and account settings. Put project views under `features/projects`, account views under `features/account`, appearance views/state under `features/settings`, reusable visual primitives under `components`, and transport result handling under `lib`. Use plain React state until complexity demonstrates a need for a state library or router. No SSR/Next.js backend runs in this desktop app.

UI reads `window.learning` through typed result handling. Backend snapshots own project/account state; local state owns project-keyed goal drafts, overlay visibility, loading, busy, and recoverable error display. Guard repeated mutations, disable conflicting controls during writes, and render the returned authoritative result. Async boot work ignores results after effect cleanup.

## Design implementation

Implement visual values through semantic CSS variables from the design system. Keep feature components responsible for content and state; reusable controls share hover, selected, focus, pending, and unavailable behavior. New theme handling must resolve to semantic tokens and preserve readable contrast. Use native dialogs for account, navigation, replacement, and conflict choices, with focus restoration and guarded keyboard commands.

Use real buttons, labelled fields/radio groups, headings, and disclosure controls. Implement the UX focus/scroll contract with refs and scoped handlers. Restore focus after overlays, associate validation messages with inputs, and announce async status without grabbing focus. Observe reduced motion; scope keyboard commands so input editing and input-method composition remain intact.

Render goals/material/model text as text; do not introduce `dangerouslySetInnerHTML` for learner/model content. Any future rich-content renderer needs an explicit trust boundary under [IPC/security](patterns-ipc-security.md). Preserve native window controls and platform lifecycle behavior.

## Local appearance state

`features/settings/appearance.ts` owns the Light/Dark preference. Apply it before the first React render through `data-theme` on the document root; CSS semantic tokens style all features. A valid stored choice takes precedence over the initial OS preference. Store only this non-sensitive presentation value in renderer-origin localStorage (`learning-studio.appearance`) in the dedicated persistent UI partition, catch unavailable storage, and keep project/account data behind the typed bridge. Appearance never writes `.edu` metadata or starts inference. OS title bars remain native.

## Asynchronous state

The workspace serializes short metadata operations and keeps drafts by project handle. Event revisions prevent a late initial query or API response from replacing newer published state. Key longer generation requests/results to their owning project and operation. Disable conflicting mutations; navigation during generation offers an explicit stay/cancel choice. Ignore stale results after view cleanup, and unsubscribe from any future event bridge. Do not simulate saving, cancellation, or provider availability in React.

Under [ADR-0017](ADRs/ADR-0017-outline-rewrites-with-saved-context.md), keep outline-edit drafts keyed to their project and saved-outline revision. The renderer sends only the project/model identifiers and learner changes; main/core load authoritative saved context. Dismissing, cancelling or failing a rewrite preserves its draft and prior saved outline; a successful save starts a fresh draft.

## Current implementation and migration evidence

The workspace uses neutral surfaces, system typography, project rows, a large goal composer, native account/navigation dialogs, and real per-project model preferences. The sidebar collapses below 880 CSS pixels; Open project and toggle-navigation shortcuts are implemented. Generation, cancellation, clarification, readable results, confirmed replacement, and save retry are implemented. Light/Dark settings are implemented under ADR-0013; command menus remain outside this milestone. ADR-0009 retires the demo and defines portable state.

For a UI implementation, exercise the real bridge/backend journey and review screenshots, focus, scroll, zoom, long content, reduced motion, and target OS appearance. Keep current capability labels truthful until backend behavior exists. The documentation-only adoption does not establish screen compliance or accessibility certification.
