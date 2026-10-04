# Renderer patterns

Governed by [ADR-0001](ADRs/ADR-0001-typescript-electron-process-layout.md), [ADR-0002](ADRs/ADR-0002-sandboxed-capability-ipc.md), [ADR-0003](ADRs/ADR-0003-core-learning-services-and-demo-state.md), and [ADR-0007](ADRs/ADR-0007-codex-inspired-design-and-ux.md).

Read [design system](patterns-design-system.md) for appearance and [UX](patterns-ux.md) for interaction contracts before changing a screen. This file owns renderer implementation rules. The current demo has not been migrated to the newly adopted visual standard.

## Organization and state

`app/App.tsx` composes sidebar navigation, workspace, and session context. Put learning-specific views under `features/learning`, reusable visual primitives under `components`, and transport result handling under `lib`. Use plain React state until complexity demonstrates a need for a state library or router. No SSR/Next.js backend runs in this desktop app.

UI reads `window.learning` through typed result handling. Backend snapshots own session/course state; local state owns goal drafts, selected choices, active session, loading, busy, and recoverable error display. Guard repeated mutations, disable conflicting controls during writes, and render the returned authoritative result. Reopening a session remounts its view by session ID. Async boot work ignores results after effect cleanup.

## Design implementation

Implement visual values through semantic CSS variables from the design system. Keep feature components responsible for content and state; reusable controls share hover, selected, focus, pending, and unavailable behavior. New theme handling must resolve to semantic tokens and preserve readable contrast. No new UI dependency or component library is mandated by the documentation update.

Use real buttons, labelled fields/radio groups, headings, and disclosure controls. Implement the UX focus/scroll contract with refs and scoped handlers. Restore focus after overlays, associate validation messages with inputs, and announce async status without grabbing focus. Observe reduced motion; scope keyboard commands so input editing and input-method composition remain intact.

Render goals/material/model text as text; do not introduce `dangerouslySetInnerHTML` for learner/model content. Any future rich-content renderer needs an explicit trust boundary under [IPC/security](patterns-ipc-security.md). Preserve native window controls and platform lifecycle behavior.

## Asynchronous state

The current demo uses a small global mutation guard. When project-specific asynchronous work is introduced, key requests/results/drafts to their owning project/activity and operation so a late response cannot overwrite the newly selected workspace. Disable conflicting mutations while keeping unrelated navigation usable. Ignore stale results after view cleanup, and unsubscribe from any future event bridge. Do not simulate saving, cancellation, or provider availability in React.

## Current implementation and migration evidence

The demo currently has warm surfaces, terracotta actions, Georgia headings, demo session navigation, and a fixed explanatory context panel that hides in narrower windows. Those observations describe existing code, while ADR-0007 and the design/UX files govern future changes. Account/model selection, folder-based projects, generation, persistence, theme settings, command menus, and new shortcuts are not yet implemented.

For a UI implementation, exercise the real bridge/backend journey and review screenshots, focus, scroll, zoom, long content, reduced motion, and target OS appearance. Keep current capability labels truthful until backend behavior exists. The documentation-only adoption does not establish screen compliance or accessibility certification.
