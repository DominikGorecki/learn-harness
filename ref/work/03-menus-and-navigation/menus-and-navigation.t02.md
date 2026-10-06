# Ticket: menus-and-navigation.T02 - Add authorized native menu and chrome adapters
Status: Done — native adapters accepted; renderer strip/controller and host qualification remain under T03-T04

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

- [x] File/Edit/View/Help/compact/macOS templates contain specified commands with correct role/availability behavior.
- [x] Unknown/extra-field/nonfinite/invalid sender inputs are rejected; command subscriptions validate fixed IDs and clean up.
- [x] Recent handles and names come from current workspace; navigation callbacks only emit guarded renderer commands.
- [x] Existing Electron flows still pass without shell activation; overlay options are ready for T03.

## Manual verification

Inspect pinned Electron role/title-overlay APIs and actual bridge startup. Native popup/role activation and window behavior are exercised cumulatively in T03/T04; other OS results remain explicit.

## Completion evidence

Worker: `/root/native_menu_bridge`, GPT-6.1 Sol, high reasoning. Prerequisite T01 is committed at `a123ed6`; coordinator owns acceptance and the local commit.

Accepted by the coordinator on 2026-10-06 after source/test review and independent boundary-test confirmation. Strict named methods authorize/parse bounded requests; main derives Recent labels/handles and revalidates callbacks, while navigation only emits fixed renderer commands. Popup ownership settles on dismissal, new-document load and close; same-document/child-frame navigation preserves readiness. Integrated overlay options are available but unused by the current ordinary-title window.

- Final worker `npm.cmd run check` (session 26211): exit 0, 27 files / 310 tests passed / 3 skipped; lint, flow references, both type scopes and production bundles passed.
- Full `npm.cmd run test:desktop` (session 97800): exit 0, 15 passed / 1 packaged-only skip, 6.1 minutes. Actual receiving regression: 200,504 ms; existing AI, project, account and recovery journeys pass.
- After macOS label/mnemonic and same-document readiness corrections, final focused project desktop journey (session 81023): exit 0, 1 passed. It exercises actual bridge validation, sender/frame rejection, command filtering/unsubscribe, zoomed native popup dismissal, keyboard skip-link readiness and reload reset.
- Coordinator independent `npm.cmd exec -- vitest run tests/unit/application-menu.test.ts`: exit 0, 10 tests passed.
- `git diff --check` passed. Initial sandbox Vite temporary-config EPERM required permitted elevation; initial lint/type failures were fixed before the final passes.

Pinned Electron's `registerAccelerator:false` applies only on Windows/Linux. macOS app shortcuts therefore use fixed glyph labels without registering duplicate accelerators; native roles retain platform ownership. The final focused checks cover corrections made after the full Windows suite; fresh cumulative desktop validation remains mandatory after integration. The bridge helper's artificial Back/revision setup must be adapted to the real T03 menu publisher.

Coordinator and independent reviewer inspected all 26 changed Windows PNGs, with no actionable layout/synthetic-content defect; 15 index/manifest pairs were refreshed. The project narrative states actual assertions and evidence limits. Fixtures cleaned their apps, servers, extra webContents and profiles; the existing user app was untouched. Native role execution, popup keyboard behavior and OS window/accessibility qualification remain separate integration evidence. Independent documentation-only commit `4b2a59e` was reconciled and preserved before the T02 commit.

## Notes

- Requirements covered: R03, R04 main adapter, R14; R02/R12 chrome/menu prerequisites.
- Assumptions/open questions: no blocking product question; fixed command enums may be refined to fit actual Electron behavior without adding generic privileges.
