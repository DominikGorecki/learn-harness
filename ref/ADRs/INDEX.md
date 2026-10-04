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

| [ADR-0009](ADR-0009-portable-project-workspace.md) | Accepted | Portable project metadata, native folder workspace, and retirement of demo runtime | Changing project persistence, identity, recovery, or workspace ownership |

| [ADR-0010](ADR-0010-bounded-pi-outline-generation.md) | Accepted | Bounded Pi generation, utility isolation, project-owned results and save recovery | Changing generation, worker lifecycle, inference transport, or result acceptance |

| [ADR-0011](ADR-0011-scoped-material-understanding.md) | Accepted | Bounded material snapshots, educational read tools, verified coverage and clarification | Changing source formats, file scope, material transmission, or source claims |

| [ADR-0012](ADR-0012-generation-recovery-and-navigation.md) | Accepted | Explicit cancellation before navigation and confirmed save-conflict recovery | Changing run cancellation, unsaved results, conflicts, or draft preservation |

| [ADR-0013](ADR-0013-chatgpt-inspired-appearance.md) | Accepted | User-supplied ChatGPT visual references, semantic light/dark palettes and local appearance settings | Changing renderer appearance, Settings, theme preference or visual references |

| [ADR-0014](ADR-0014-durable-account-connection.md) | Accepted | Durable profile credentials with OS encryption or disclosed private-file fallback | Changing account persistence, restoration, file migration or sign-out storage |

| [ADR-0015](ADR-0015-explicit-model-access-verification.md) | Accepted | Explicit GPT-6.1 Sol inference test and connection-session verification | Changing model diagnostics, availability evidence or verified choices |

| [ADR-0016](ADR-0016-requested-extra-model-choices.md) | Accepted | Persistent Sol/Luna picker supplements with independent optional diagnostics | Changing extra model choices, independent proof or diagnostic target ownership |

Current rules live in [the pattern index](../patterns.md). Add the next sequential ADR for a new durable decision and update all affected references in the same change. An accepted packaging approach does not mean every platform installer has been built or certified; see [validation](../research/validation.md).
