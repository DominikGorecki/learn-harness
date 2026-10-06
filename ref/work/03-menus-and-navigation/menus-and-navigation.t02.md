# Ticket: menus-and-navigation.T02 - Add authorized native menu and chrome adapters
Status: Open

## Source

- Spec: [Application menus and navigation history](menus-and-navigation.spec.md)
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md), [IPC/security](../../patterns-ipc-security.md), [architecture](../../patterns-architecture.md), [testing](../../patterns-development-testing.md), [UX](../../patterns-ux.md), [design](../../patterns-design-system.md).
- Decisions: ADR-0002/0013/0021/0022/0023 and T01's title-strip amendment.

## Goal

Native commands, bounded menu state and overlay presentation are available through authorized named capabilities.

## Scope

In scope: shared parsers/types/channels, main menu templates and IPC integration, preload/event types, native role handling, readiness/state revisioning, backend-owned recent entries, overlay helpers and tests. Out of scope: renderer title strip/history integration, direct native callbacks mutating workspaces, arbitrary external URLs/roles/channels.

## Dependencies

- Depends on: [T01](menus-and-navigation.t01.md).
- Unblocks: T03.

## Implementation plan

1. Finalize strict showApplicationMenu/setApplicationMenuState/setWindowAppearance/onApplicationCommand contracts, platform/readiness information if needed and fixed command payloads.
2. Main owns native menu/compact menu/macOS system menu, roles for edit/zoom/window/About, recent labels/handles from workspace, clamped popup anchors and monotonic advisory menu state. Navigation emits fixed commands into the renderer guard, never calls core workspace mutation from menu callbacks.
3. Add authorized handlers and stripped subscriptions with cleanup; preserve preload sandbox bundle and global bridge typing. Keep existing renderer usable until T03 activates the strip/overlay options.
4. Add boundary, menu-state/command, native role and startup/bridge tests. Main independently enforces privileges even when advisory enabled state lags.

## Patterns to apply

Main owns Electron/Node; shared stays serializable and unprivileged; preload exposes named capabilities only. Maintain owning-window/frame/origin/app-entry validation, CSP, sandbox and web-navigation denial. Native title controls remain native; renderer appearance changes only bounded overlay colors. Recent menus are profile registry views, not history storage.

## Tests and verification

- Parser/template/state unit tests and actual Electron IPC/event unsubscribe rejection checks; no copy of implementation-only assertions.
- `npm.cmd run check` and `npm.cmd run test:desktop`; focused process/bridge regression evidence as applicable.
- Coordinator records actual commands, native platform and fixture limits.

## Acceptance criteria

- [ ] File/Edit/View/Help/compact/macOS templates contain specified commands with correct role/availability behavior.
- [ ] Unknown/extra-field/nonfinite/invalid sender inputs are rejected; command subscriptions validate fixed IDs and clean up.
- [ ] Recent handles and names come from current workspace; navigation callbacks only emit guarded renderer commands.
- [ ] Existing Electron flows still pass without shell activation; overlay options are ready for T03.

## Manual verification

Inspect pinned Electron role/title-overlay APIs and actual bridge startup. Native popup/role activation and window behavior are exercised cumulatively in T03/T04; other OS results remain explicit.

## Completion evidence

Coordinator fills after review and validation.

## Notes

- Requirements covered: R03, R04 main adapter, R14; R02/R12 chrome/menu prerequisites.
- Assumptions/open questions: no blocking product question; fixed command enums may be refined to fit actual Electron behavior without adding generic privileges.
