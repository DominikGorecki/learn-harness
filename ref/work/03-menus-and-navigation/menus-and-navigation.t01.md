# Ticket: menus-and-navigation.T01 - Define history and title-strip boundaries
Status: Open

## Source

- Spec: [Application menus and navigation history](menus-and-navigation.spec.md)
- Scope: user-authorized whole-spec implementation; [AGENTS](../../../AGENTS.md), [README](../../../README.md), [product overview](../../../docs/overview.md), [PRD 01](../../prds/01-project-setup-and-outline.md).
- Patterns: [UX](../../patterns-ux.md), [renderer](../../patterns-renderer.md), [design](../../patterns-design-system.md), [architecture](../../patterns-architecture.md), [IPC](../../patterns-ipc-security.md), [testing](../../patterns-development-testing.md).
- Decisions: [ADR-0013](../../ADRs/ADR-0013-chatgpt-inspired-appearance.md), [ADR-0023](../../ADRs/ADR-0023-navigation-history-integration.md); next available ADR for the integrated title strip.

## Goal

Provide the bounded, extensible history/transaction foundation and adopt the title-strip decision without inventing future screens.

## Scope

In scope: pure renderer history/destination/transaction primitives and focused tests; numbered ADR amending native-title-bar scope and both indexes/constrained patterns. Out of scope: main/preload APIs, App integration, menus or topic pages.

## Dependencies

- Depends on: none.
- Unblocks: T02, T03.

## Implementation plan

1. Inspect current project identity, workspace result/subscription ordering and navigation guards.
2. Implement pure bounded history, explicit push/replace/traverse/no-op semantics, stable destination identity and one-in-flight transaction handling. Keep current variants dashboard/project only, with profile handles distinct from portable IDs.
3. Cover bootstrap, 100-entry eviction, branching, current-location no-op, traversal, canceled/rejected/stale transactions and test-only future destination values.
4. Write the next available ADR for integrated chrome with native window buttons; explicitly amend ADR-0013 only for title-bar scope and update indexes/design/renderer/architecture/IPC guidance. Mark runtime pending until integrated.

## Patterns to apply

Renderer owns presentation history; shared/main/core remain authoritative for privileged/domain behavior. No new persistence, URL navigation, privileged imports, content snapshots, fake topic routes or independent stack. ADR-0012/0022 guard/recovery semantics remain intact. Light/Dark and native control safe areas govern later shell work.

## Tests and verification

- Add focused `tests/unit/navigation-history.test.ts` and related pure transaction tests.
- Run `npm.cmd run check`; no desktop gate for unused pure modules and documentation alone. T02/T03 activate process/UI behavior and require desktop gates.
- Review affected links and `git diff --check`. Coordinator records outcomes in validation/acceptance.

## Acceptance criteria

- [ ] Pure state handles all transitions/bounds and does not record failed/canceled/stale intent.
- [ ] Current identity uses project handles; future identity is extensible without shipped placeholder kinds.
- [ ] ADR/index/pattern amendments preserve all security/window-button/theme/AI rules and distinguish pending runtime.

## Manual verification

Review pure API consumers against current source and spec; no visual runtime claim. Windows/macOS/Linux window checks belong to later activation/evidence work.

## Completion evidence

Coordinator fills after review and validation.

## Notes

- Requirements covered: R05, R06, R07, R10 foundation; R02 decision, R15 guidance.
- Assumptions/open questions: no product blocker; native external qualifications remain separate.
