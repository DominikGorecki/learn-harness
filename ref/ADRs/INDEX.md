# Architecture decision index

Read the records selected by the task's focused patterns. All records below describe implemented skeleton decisions; release work and future AI/persistence choices remain outside their accepted scope.

| ADR | Status | Decision | Read when |
| --- | --- | --- | --- |
| [ADR-0001](ADR-0001-typescript-electron-process-layout.md) | Accepted | TypeScript, React, electron-vite, process-oriented source layout | Changing frameworks, folders, compilation, or dependency direction |
| [ADR-0002](ADR-0002-sandboxed-capability-ipc.md) | Accepted | Sandboxed renderer and authorized capability IPC | Changing preload, IPC, protocols, permissions, or trust boundaries |
| [ADR-0003](ADR-0003-core-learning-services-and-demo-state.md) | Accepted | Platform-independent learning service with in-memory demo state | Changing domain behavior, fixtures, storage, or AI integration |
| [ADR-0004](ADR-0004-quality-gates-and-native-packaging.md) | Accepted | Focused gates, desktop smoke, native packaging configuration | Changing tests, CI, installers, or release tooling |
| [ADR-0005](ADR-0005-progressive-pattern-and-adr-discovery.md) | Accepted | Indexed patterns and decision records | Changing contributor discovery or documentation conventions |
| [ADR-0006](ADR-0006-development-port-shutdown.md) | Accepted | Explicit port-owner shutdown with process identity checks | Changing kill-dev, target selection, or shutdown behavior |

Current rules live in [the pattern index](../patterns.md). Add the next sequential ADR for a new durable decision and update all affected references in the same change. An accepted packaging approach does not mean every platform installer has been built or certified; see [validation](../research/validation.md).
