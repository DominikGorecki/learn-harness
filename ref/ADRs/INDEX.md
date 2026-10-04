# Architecture decision index

Read the records selected by the task's focused patterns. Records describe adopted decisions within their stated scope. ADR-0007 adopts design/documentation standards; it does not claim a migrated UI. Release work and unimplemented product capabilities remain outside implemented runtime scope.

| ADR | Status | Decision | Read when |
| --- | --- | --- | --- |
| [ADR-0001](ADR-0001-typescript-electron-process-layout.md) | Accepted | TypeScript, React, electron-vite, process-oriented source layout | Changing frameworks, folders, compilation, or dependency direction |
| [ADR-0002](ADR-0002-sandboxed-capability-ipc.md) | Accepted | Sandboxed renderer and authorized capability IPC | Changing preload, IPC, protocols, permissions, or trust boundaries |
| [ADR-0003](ADR-0003-core-learning-services-and-demo-state.md) | Accepted | Platform-independent learning service with in-memory demo state | Changing domain behavior, fixtures, storage, or AI integration |
| [ADR-0004](ADR-0004-quality-gates-and-native-packaging.md) | Accepted | Focused gates, desktop smoke, native packaging configuration | Changing tests, CI, installers, or release tooling |
| [ADR-0005](ADR-0005-progressive-pattern-and-adr-discovery.md) | Accepted | Indexed patterns and decision records | Changing contributor discovery or documentation conventions |
| [ADR-0006](ADR-0006-development-port-shutdown.md) | Accepted | Explicit port-owner shutdown with process identity checks | Changing kill-dev, target selection, or shutdown behavior |
| [ADR-0007](ADR-0007-codex-inspired-design-and-ux.md) | Accepted | Codex-inspired visual direction and separate design/UX guidance | Changing appearance, learner interaction, or UI documentation ownership |
| [ADR-0008](ADR-0008-chatgpt-plan-connection-and-pi-foundation.md) | Accepted | Protected ChatGPT plan connection and Pi runtime foundation | Changing account identity, delegated inference access, credentials, or account model discovery |

Current rules live in [the pattern index](../patterns.md). Add the next sequential ADR for a new durable decision and update all affected references in the same change. An accepted packaging approach does not mean every platform installer has been built or certified; see [validation](../research/validation.md).
