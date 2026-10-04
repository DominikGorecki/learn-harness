# Renderer patterns

Governed by [ADR-0001](ADRs/ADR-0001-typescript-electron-process-layout.md), [ADR-0002](ADRs/ADR-0002-sandboxed-capability-ipc.md), and [ADR-0003](ADRs/ADR-0003-core-learning-services-and-demo-state.md).

## Organization and state

`app/App.tsx` composes sidebar navigation, workspace, and session context. Put learning-specific views under `features/learning`, reusable visual primitives under `components`, and transport result handling under `lib`. Use plain React state until complexity demonstrates a need for a state library or router. No SSR/Next.js backend runs in this desktop app.

UI reads `window.learning` through typed result handling. Backend snapshots own session/course state; local state owns goal drafts, selected choices, active session, loading, busy, and recoverable error display. Guard repeated mutations, disable conflicting controls during writes, and render the returned authoritative result. Reopening a session remounts its view by session ID. Async boot work ignores results after effect cleanup.

## Presentation

Use a warm neutral workbench and one terracotta accent. Keep course navigation as rows, the learning surface as prose/practice, and contextual guidance as a quiet side panel. At narrower window sizes, the context panel collapses. Preserve native OS window controls and normal macOS lifecycle behavior.

Use semantic headings, forms, labelled textarea/radio groups, a skip link, visible keyboard focus, and live feedback/error status. Support reduced motion. Render goals/lesson text as text; do not introduce `dangerouslySetInnerHTML` for learner/model content. The short entrance, hover/focus changes, and feedback reveal should assist orientation without distraction.

Automation covers the desktop journey; manually review screenshots, zoom, keyboard operation, and target OS appearance before release. Automation alone does not establish accessibility compliance.
