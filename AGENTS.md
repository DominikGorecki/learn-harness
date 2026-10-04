# Working in edu-harness

This is a TypeScript Electron application with a React learning workspace and a Node.js backend hosted by Electron main. Start small and preserve the process boundaries.

## Progressive discovery

1. Read [README.md](README.md) for scope, commands, and the source map.
2. Read [ref/patterns.md](ref/patterns.md), the pattern index. Select only the domain files relevant to the task.
3. Read [ref/ADRs/INDEX.md](ref/ADRs/INDEX.md). Open the accepted ADRs linked by those patterns before changing a durable decision.
4. Inspect the affected source and focused tests. For original evidence and alternatives, read [ref/research/electron-learning-app.md](ref/research/electron-learning-app.md).

| Work | Read next |
| --- | --- |
| Process ownership, source layout, backend services | [Architecture](ref/patterns-architecture.md) |
| Preload, IPC, schemas, protocols, permissions | [IPC and security](ref/patterns-ipc-security.md) |
| Courses, sessions, feedback, persistence | [Learning and data](ref/patterns-learning-data.md) |
| Components, navigation, accessibility, request state | [Renderer](ref/patterns-renderer.md) |
| Commands, tests, lint, CI | [Development and testing](ref/patterns-development-testing.md) |
| Installers, fuses, signing, release | [Distribution](ref/patterns-distribution.md) |
| Adding or revising project guidance | [Documentation](ref/patterns-documentation.md) |

## Authority

Explicit user instructions and accepted task scope come first. Accepted ADRs govern durable decisions; focused patterns state current rules; maintained docs describe current contracts; code/tests show behavior. Research explains evidence and alternatives rather than silently overriding an accepted decision. Report contradictions and update the relevant guidance when resolving them.

## Essential boundaries

- `src/core` contains learning behavior and ports; it imports no Electron, Node, or React implementation.
- `src/shared` contains serializable contracts and request validation; it has no privileged imports.
- `src/main` owns Electron/Node lifecycle, privileged adapters, and IPC authorization.
- `src/preload` exposes named methods through `contextBridge`; never expose generic IPC, filesystem access, process execution, or secrets.
- `src/renderer` uses React and the typed bridge; it imports no core/main/preload implementation.
- Keep context isolation and renderer sandboxing enabled. Main validates every request's sender and every mutation's payload.
- Demo content and session-only persistence are intentional. Do not present fixtures as AI output or question completion as mastery.

## Change workflow

Inspect existing files first, preserve unrelated work, and implement the smallest useful slice. Use `npm run check` for code changes and `npm run test:desktop` for process/bridge/startup or user-flow changes. Desktop tests require a graphical session; use `xvfb-run -a npm run test:desktop` on headless Linux. Record exactly which checks ran and any environment limits. Do not weaken application security to make a test pass.

New durable decisions require a numbered ADR plus updates to the ADR index, pattern index, and constrained focused patterns. Keep future proposals separate from implemented rules. A connected Context Bank can supply reusable conventions through `cb-discover`; it does not determine this app's source architecture. Do not modify the bank just to document local app changes.
