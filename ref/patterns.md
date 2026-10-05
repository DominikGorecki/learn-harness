# Pattern index

Read this map, select the area touched by the task, then read its focused rules and linked accepted ADRs. Patterns describe current implementation constraints and adopted design standards; target guidance identifies its implementation status. [ADRs](ADRs/INDEX.md) explain why. Research records [architecture evidence](research/electron-learning-app.md) and the [user-supplied ChatGPT UI references](research/chatgpt-app-appearance.md).

| Domain | File | Governing decisions |
| --- | --- | --- |
| Process model and dependency direction | [Architecture](patterns-architecture.md) | ADR-0001, ADR-0003, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0019 |
| Preload API, IPC, validation, asset protocol | [IPC and security](patterns-ipc-security.md) | ADR-0002, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0019 |
| Projects, outlines, account connection, storage | [Learning and data](patterns-learning-data.md) | ADR-0003, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0019 |
| Composition, visual tokens, typography, component states | [Design system](patterns-design-system.md) | ADR-0007, ADR-0013 |
| Navigation, input, progress, recovery, keyboard/focus | [UX](patterns-ux.md) | ADR-0007, ADR-0012, ADR-0013, ADR-0015, ADR-0016, ADR-0017, ADR-0019 |
| React organization, request state, safe rendering | [Renderer](patterns-renderer.md) | ADR-0001, ADR-0002, ADR-0003, ADR-0007, ADR-0013, ADR-0017, ADR-0018, ADR-0019 |
| Tooling, development shutdown, diagnostics, tests, CI checks | [Development and testing](patterns-development-testing.md) | ADR-0004, ADR-0006, ADR-0018 |
| Platform targets, packaging, release | [Distribution](patterns-distribution.md) | ADR-0004 |
| Progressive discovery and ADR lifecycle | [Documentation](patterns-documentation.md) | ADR-0005, ADR-0007, ADR-0013 |

Start with [AGENTS.md](../AGENTS.md) for task routing and authority. When a durable rule changes, update its focused file, this index, and [ADRs/INDEX.md](ADRs/INDEX.md) together.

For UI work, read design system → UX → renderer and open the relevant [current application screenshots](patterns-design-system.md#current-application-screenshots). The design-system pattern also owns their [refresh procedure](patterns-design-system.md#refresh-the-screenshots). New capabilities still require their task/PRD and governing domain decisions; an interaction pattern is not evidence that its feature exists.
