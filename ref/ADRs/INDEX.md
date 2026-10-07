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

| [ADR-0017](ADR-0017-outline-rewrites-with-saved-context.md) | Accepted | Selected-model outline rewrites with saved JSON orientation and inherited source evidence | Changing outline edits, generation context or source provenance across revisions |

| [ADR-0018](ADR-0018-development-file-diagnostics.md) | Accepted | Main-owned bounded development JSONL diagnostics with safe metadata across processes | Changing file logging, diagnostic fields, privacy, retention or failure collection |

| [ADR-0019](ADR-0019-topic-edits-and-project-file-access.md) | Accepted | Isolated topic rewrites, project-wide Pi text-file tools and recoverable multi-file saves | Changing topic editing, project content writes, folder ownership or file-save recovery |

| [ADR-0020](ADR-0020-playwright-flow-references.md) | Accepted | Per-flow explanations, platform-specific passing Playwright screenshots and generated capture indexes | Changing flow discovery, screenshot publication, freshness or AI maintenance |

| [ADR-0021](ADR-0021-automatic-local-commits.md) | Accepted | Standing authorization for scoped, validated local commits on the active branch | Changing contributor commit defaults, task completion or preservation of unrelated work |
| [ADR-0022](ADR-0022-shared-pi-streaming-lifecycle.md) | Accepted; five producers and panel implemented | Shared AI lease, Pi streaming/inactivity and workbench panel; supersedes only ADR-0010 elapsed deadlines and ADR-0015/0016 direct diagnostic transport/deadline | Changing inference ownership, transport acceptance/liveness, previews, cancellation or adding future AI producers |
| [ADR-0023](ADR-0023-navigation-history-integration.md) | Accepted; contributor discipline and initial session history implemented; qualification open | Every navigation feature/change accounts for shared history, restoration, recovery and evidence; future in-project destinations join it when implemented | Adding, removing or changing destinations, navigation entry points or history behavior |
| [ADR-0024](ADR-0024-integrated-title-strip-with-native-controls.md) | Accepted; runtime active, native qualification open | Integrated title strip with native controls and bounded theme overlay; amends only ADR-0013 native-title-bar scope | Changing title-area composition, native menus, overlay theme or control safe areas |
| [ADR-0025](ADR-0025-scoped-editorial-workspace-and-aperture-identity.md) | Accepted; central foundation/forms migrated; remaining migration/qualification open | Scoped Quiet action groups central design and Sculpted aperture identity; amends only generic central presentation/brand artwork | Changing central page design, shared workspace vocabulary or brand/native-icon artwork |

Current rules live in [the pattern index](../patterns.md). Add the next sequential ADR for a new durable decision and update all affected references in the same change. An accepted packaging approach does not mean every platform installer has been built or certified; see [validation](../research/validation.md).
