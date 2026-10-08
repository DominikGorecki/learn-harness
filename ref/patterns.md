# Pattern index

Read this map, select the area touched by the task, then read its focused rules and linked accepted ADRs. Patterns describe current implementation constraints and adopted design standards; target guidance identifies its implementation status. [ADRs](ADRs/INDEX.md) explain why. Research records [architecture evidence](research/electron-learning-app.md) and the [user-supplied ChatGPT UI references](research/chatgpt-app-appearance.md).

| Domain | File | Governing decisions |
| --- | --- | --- |
| AI admission, streaming lifecycle, provisional activity and future producers | [AI operations](patterns-ai.md) | ADR-0022; retains ADR-0010/0012/0015/0016/0018/0019 outside scoped supersession |
| Process model and dependency direction | [Architecture](patterns-architecture.md) | ADR-0001, ADR-0003, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0019, ADR-0022, ADR-0024 |
| Preload API, IPC, validation, asset protocol | [IPC and security](patterns-ipc-security.md) | ADR-0002, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0019, ADR-0022, ADR-0024 |
| Projects, outlines, account connection, storage | [Learning and data](patterns-learning-data.md) | ADR-0003, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0019, ADR-0022 |
| Composition, visual tokens, typography, component states | [Design system](patterns-design-system.md) | ADR-0007, ADR-0013, ADR-0022, ADR-0024, ADR-0025 |
| Scoped editorial central pages, shared primitives and aperture identity | [Main workspace](patterns-main-workspace.md) | ADR-0025; retains ADR-0013/0019/0022/0023/0024 outside its scope |
| Navigation, history integration, input, progress, recovery, keyboard/focus | [UX](patterns-ux.md) | ADR-0007, ADR-0012, ADR-0013, ADR-0015, ADR-0016, ADR-0017, ADR-0019, ADR-0022, ADR-0023 |
| React organization, navigation integration, request state, safe rendering | [Renderer](patterns-renderer.md) | ADR-0001, ADR-0002, ADR-0003, ADR-0007, ADR-0013, ADR-0017, ADR-0018, ADR-0019, ADR-0022, ADR-0023, ADR-0024 |
| Documented journeys, screenshots and automatic reference refresh | [Flows](patterns-flow.md) | ADR-0004, ADR-0005, ADR-0020, ADR-0021, ADR-0022 |
| Tooling, development shutdown, diagnostics, tests, CI checks, automatic local commits | [Development and testing](patterns-development-testing.md) | ADR-0004, ADR-0006, ADR-0018, ADR-0020, ADR-0021, ADR-0022, ADR-0023 |
| Platform targets, packaging, release | [Distribution](patterns-distribution.md) | ADR-0004 |
| Progressive discovery and ADR lifecycle | [Documentation](patterns-documentation.md) | ADR-0005, ADR-0007, ADR-0013, ADR-0020, ADR-0021, ADR-0022, ADR-0023 |

Start with [AGENTS.md](../AGENTS.md) for task routing and authority. When a durable rule changes, update its focused file, this index, and [ADRs/INDEX.md](ADRs/INDEX.md) together.

[ADR-0026](ADRs/ADR-0026-illustrated-topic-content-and-openrouter-media.md) governs illustrated selected-topic chapters, immutable media publication, independent OpenRouter configuration and durable call accounting. Read [architecture](patterns-architecture.md), [AI operations](patterns-ai.md), [IPC/security](patterns-ipc-security.md) and [learning/data](patterns-learning-data.md) for these domains; sectioned Settings and the chapter reader follow [UX](patterns-ux.md), [design](patterns-design-system.md), [main workspace](patterns-main-workspace.md) and [renderer](patterns-renderer.md). Chapter/provider runtime, checkpoint recovery, sanctioned workers, authorized media serving, sectioned Settings, offline reader/generation controls and standalone replacement are implemented; cumulative/live qualification remains pending in [bundle 05](work/05-illustrated-topic-content/illustrated-topic-content.spec.md).

For UI work, read design system → UX → renderer, plus [main workspace](patterns-main-workspace.md) for current/future central pages and brand artwork, then select the relevant [flow explanation and screenshots](patterns-flow.md). That pattern owns Playwright refresh and AI narrative maintenance. New capabilities still require their task/PRD and governing domain decisions; an interaction pattern is not evidence that its feature exists.

For every feature that adds, removes or changes navigation, follow [ADR-0023](ADRs/ADR-0023-navigation-history-integration.md) through [UX history integration](patterns-ux.md#navigation-history-integration), [renderer integration](patterns-renderer.md#navigation-feature-integration), [testing evidence](patterns-development-testing.md#required-evidence) and [documentation maintenance](patterns-documentation.md#maintenance). Future real in-project destinations join the shared history when implemented. Application menus and session dashboard/project history are implemented; [acceptance](work/03-menus-and-navigation/acceptance.md) and [validation](work/03-menus-and-navigation/validation.md) distinguish local evidence from remaining qualification.

[ADR-0024](ADRs/ADR-0024-integrated-title-strip-with-native-controls.md) adopts integrated title chrome with native window controls, amending only ADR-0013's title-bar/overlay scope. The renderer controller, title strip and named native menu/chrome adapters are active. Windows code/desktop fixture and reviewed renderer evidence are recorded; required native window/menu/accessibility qualifications on Windows/macOS/Linux remain separately unresolved.
