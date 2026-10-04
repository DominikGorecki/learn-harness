# Renderer patterns

Governed by [ADR-0001](ADRs/ADR-0001-typescript-electron-process-layout.md), [ADR-0002](ADRs/ADR-0002-sandboxed-capability-ipc.md), [ADR-0003](ADRs/ADR-0003-core-learning-services-and-demo-state.md), and [ADR-0007](ADRs/ADR-0007-codex-inspired-design-and-ux.md).

Read [design system](patterns-design-system.md) for appearance and [UX](patterns-ux.md) for interaction contracts before changing a screen. This file owns renderer implementation rules.

## Organization and state

`app/App.tsx` composes project navigation, the learning workspace, and account settings. Put project views under `features/projects`, account views under `features/account`, reusable visual primitives under `components`, and transport result handling under `lib`. Use plain React state until complexity demonstrates a need for a state library or router. No SSR/Next.js backend runs in this desktop app.

UI reads `window.learning` through typed result handling. Backend snapshots own project/account state; local state owns project-keyed goal drafts, overlay visibility, loading, busy, and recoverable error display. Guard repeated mutations, disable conflicting controls during writes, and render the returned authoritative result. Async boot work ignores results after effect cleanup.

## Design implementation

Implement visual values through semantic CSS variables from the design system. Keep feature components responsible for content and state; reusable controls share hover, selected, focus, pending, and unavailable behavior. New theme handling must resolve to semantic tokens and preserve readable contrast. No new UI dependency or component library is mandated by the documentation update.

Use real buttons, labelled fields/radio groups, headings, and disclosure controls. Implement the UX focus/scroll contract with refs and scoped handlers. Restore focus after overlays, associate validation messages with inputs, and announce async status without grabbing focus. Observe reduced motion; scope keyboard commands so input editing and input-method composition remain intact.

Render goals/material/model text as text; do not introduce `dangerouslySetInnerHTML` for learner/model content. Any future rich-content renderer needs an explicit trust boundary under [IPC/security](patterns-ipc-security.md). Preserve native window controls and platform lifecycle behavior.

## Asynchronous state

The workspace serializes short metadata operations and keeps drafts by project handle. Event revisions prevent a late initial query or API response from replacing newer published state. Key longer generation requests/results to their owning project and operation. Disable conflicting mutations while keeping unrelated navigation usable. Ignore stale results after view cleanup, and unsubscribe from any future event bridge. Do not simulate saving, cancellation, or provider availability in React.

## Current implementation and migration evidence

The workspace uses neutral surfaces, system typography, project rows, a large goal composer, native account/navigation dialogs, and real per-project model preferences. The sidebar collapses below 880 CSS pixels; Open project and toggle-navigation shortcuts are implemented. Generation, theme settings, and command menus remain pending. ADR-0009 retires the demo and defines portable state.

For a UI implementation, exercise the real bridge/backend journey and review screenshots, focus, scroll, zoom, long content, reduced motion, and target OS appearance. Keep current capability labels truthful until backend behavior exists. The documentation-only adoption does not establish screen compliance or accessibility certification.
