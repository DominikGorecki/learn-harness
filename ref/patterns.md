# Pattern index

Read this map, select the area touched by the task, then read its focused rules and linked accepted ADRs. Patterns describe current implementation; [ADRs](ADRs/INDEX.md) explain why. [Research](research/electron-learning-app.md) records evidence and deferred decisions.

| Domain | File | Governing decisions |
| --- | --- | --- |
| Process model and dependency direction | [Architecture](patterns-architecture.md) | ADR-0001, ADR-0003 |
| Preload API, IPC, validation, asset protocol | [IPC and security](patterns-ipc-security.md) | ADR-0002 |
| Courses, sessions, feedback, storage | [Learning and data](patterns-learning-data.md) | ADR-0003 |
| UI organization and request state | [Renderer](patterns-renderer.md) | ADR-0001, ADR-0002, ADR-0003 |
| Tooling, development shutdown, tests, CI checks | [Development and testing](patterns-development-testing.md) | ADR-0004, ADR-0006 |
| Platform targets, packaging, release | [Distribution](patterns-distribution.md) | ADR-0004 |
| Progressive discovery and ADR lifecycle | [Documentation](patterns-documentation.md) | ADR-0005 |

Start with [AGENTS.md](../AGENTS.md) for task routing and authority. When a durable rule changes, update its focused file, this index, and [ADRs/INDEX.md](ADRs/INDEX.md) together.
