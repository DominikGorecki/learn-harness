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
| Projects, outlines, account models, persistence | [Learning and data](ref/patterns-learning-data.md) |
| Visual composition, typography, color/spacing tokens, component states | [Design system](ref/patterns-design-system.md) |
| Learner journeys, navigation, input, recovery, keyboard/focus | [UX](ref/patterns-ux.md) |
| React components, renderer state, bridge results, safe rendering | [Renderer](ref/patterns-renderer.md) |
| Documented journeys and current screenshots | [Flows](ref/patterns-flow.md) |
| Commands, tests, lint, CI | [Development and testing](ref/patterns-development-testing.md) |
| Installers, fuses, signing, release | [Distribution](ref/patterns-distribution.md) |
| Adding or revising project guidance | [Documentation](ref/patterns-documentation.md) |

## Authority

Explicit user instructions and accepted task scope come first. Accepted ADRs govern durable decisions; focused patterns state current rules; maintained docs describe current contracts; code/tests show behavior. Research explains evidence and alternatives rather than silently overriding an accepted decision. Report contradictions and update the relevant guidance when resolving them.

Before UI work, read the design system and UX patterns, then renderer rules and ADR-0007/ADR-0013. Select only the relevant journey explanations and screenshots through [Flows](ref/patterns-flow.md); follow its Playwright refresh and AI maintenance workflow when creating or changing a flow. The project workspace follows the user-supplied ChatGPT screenshots and implemented Light/Dark appearance standard. Respect the feature scope and status in [the product overview](docs/overview.md) and [PRD 01](ref/prds/01-project-setup-and-outline.md). Do not infer implementation authority or working capabilities from draft requirements or design examples.

## Essential boundaries

- `src/core` contains learning behavior and ports; it imports no Electron, Node, or React implementation.
- `src/shared` contains serializable contracts and request validation; it has no privileged imports.
- `src/main` owns Electron/Node lifecycle, privileged adapters, and IPC authorization.
- `src/preload` exposes named methods through `contextBridge`; never expose generic IPC, filesystem access, process execution, or secrets.
- `src/renderer` uses React and the typed bridge; it imports no core/main/preload implementation.
- Keep context isolation and renderer sandboxing enabled. Main validates every request's sender and every mutation's payload.
- Project metadata is portable in `.edu`; recent locations and protected credentials belong in the application profile. Do not present protocol fixtures as live AI evidence or outline creation as mastery.
- Under ADR-0019, Pi can browse/read the selected project and stage requested text-file creation/editing. Topic edits may write only their owned topic folder and replace only their stable lesson. Main validates paths, baselines and locality and owns recoverable publication with `.edu` state; no general shell or renderer filesystem API is exposed.

## Change workflow

Inspect existing files first, preserve unrelated work, and implement the smallest useful slice. Use `npm run check` for code changes and `npm run test:desktop` for process/bridge/startup or user-flow changes. Desktop tests require a graphical session; use `xvfb-run -a npm run test:desktop` on headless Linux. Record exactly which checks ran and any environment limits. Do not weaken application security to make a test pass.

Automatically commit each completed, validated change to the branch active when the task began, including documentation, specs, tickets, and reviewed flow references. This is standing authorization for local commits; do not ask for routine commit confirmation or stop at a suggested commit message. Explicit user instructions to leave work uncommitted take precedence. Follow [the commit workflow](ref/patterns-development-testing.md#automatic-local-commits) and [ADR-0021](ref/ADRs/ADR-0021-automatic-local-commits.md): inspect branch/HEAD and existing changes, stage only task-owned files or hunks, preserve unrelated staged/unstaged/untracked work, and report the resulting commit. Do not switch branches, push, or rewrite history as part of automatic committing. If validation or committing is blocked, preserve the work and report the exact blocker.

New durable decisions require a numbered ADR plus updates to the ADR index, pattern index, and constrained focused patterns. Keep future proposals separate from implemented rules. A connected Context Bank can supply reusable conventions through `cb-discover`; it does not determine this app's source architecture. Do not modify the bank just to document local app changes.
