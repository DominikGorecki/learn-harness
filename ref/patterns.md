# Pattern index

Read this map, select the area touched by the task, then read its focused rules and linked accepted ADRs. Patterns describe current implementation constraints and adopted design standards; target guidance identifies its implementation status. [ADRs](ADRs/INDEX.md) explain why. Research records [architecture evidence](research/electron-learning-app.md) and the [user-supplied ChatGPT UI references](research/chatgpt-app-appearance.md).

| Domain | File | Governing decisions |
| --- | --- | --- |
| AI admission, streaming lifecycle, provisional activity and future producers | [AI operations](patterns-ai.md) | ADR-0022; retains ADR-0010/0012/0015/0016/0018/0019 outside scoped supersession |
| Process model and dependency direction | [Architecture](patterns-architecture.md) | ADR-0001, ADR-0003, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0019, ADR-0022 |
| Preload API, IPC, validation, asset protocol | [IPC and security](patterns-ipc-security.md) | ADR-0002, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0019, ADR-0022 |
| Projects, outlines, account connection, storage | [Learning and data](patterns-learning-data.md) | ADR-0003, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0019, ADR-0022 |
| Composition, visual tokens, typography, component states | [Design system](patterns-design-system.md) | ADR-0007, ADR-0013, ADR-0022 |
| Navigation, history integration, input, progress, recovery, keyboard/focus | [UX](patterns-ux.md) | ADR-0007, ADR-0012, ADR-0013, ADR-0015, ADR-0016, ADR-0017, ADR-0019, ADR-0022, ADR-0023 |
| React organization, navigation integration, request state, safe rendering | [Renderer](patterns-renderer.md) | ADR-0001, ADR-0002, ADR-0003, ADR-0007, ADR-0013, ADR-0017, ADR-0018, ADR-0019, ADR-0022, ADR-0023 |
| Documented journeys, screenshots and automatic reference refresh | [Flows](patterns-flow.md) | ADR-0004, ADR-0005, ADR-0020, ADR-0021, ADR-0022 |
| Tooling, development shutdown, diagnostics, tests, CI checks, automatic local commits | [Development and testing](patterns-development-testing.md) | ADR-0004, ADR-0006, ADR-0018, ADR-0020, ADR-0021, ADR-0022, ADR-0023 |
| Platform targets, packaging, release | [Distribution](patterns-distribution.md) | ADR-0004 |
| Progressive discovery and ADR lifecycle | [Documentation](patterns-documentation.md) | ADR-0005, ADR-0007, ADR-0013, ADR-0020, ADR-0021, ADR-0022, ADR-0023 |

Start with [AGENTS.md](../AGENTS.md) for task routing and authority. When a durable rule changes, update its focused file, this index, and [ADRs/INDEX.md](ADRs/INDEX.md) together.

For UI work, read design system → UX → renderer, then select the relevant [flow explanation and screenshots](patterns-flow.md). That pattern owns Playwright refresh and AI narrative maintenance. New capabilities still require their task/PRD and governing domain decisions; an interaction pattern is not evidence that its feature exists.

For every feature that adds, removes or changes navigation, follow [ADR-0023](ADRs/ADR-0023-navigation-history-integration.md) through [UX history integration](patterns-ux.md#navigation-history-integration), [renderer integration](patterns-renderer.md#navigation-feature-integration), [testing evidence](patterns-development-testing.md#required-evidence) and [documentation maintenance](patterns-documentation.md#maintenance). Future real in-project destinations join the shared history when implemented. This contributor obligation is adopted now; the [application menus and initial history](work/03-menus-and-navigation/menus-and-navigation.spec.md) remain planned.
