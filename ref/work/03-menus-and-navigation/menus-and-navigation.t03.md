# Ticket: menus-and-navigation.T03 - Integrate title strip and guarded navigation
Status: Locally verified implementation — native manual qualification pending

## Source

- Spec: [Application menus and navigation history](menus-and-navigation.spec.md)
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md), [design](../../patterns-design-system.md), [UX](../../patterns-ux.md), [renderer](../../patterns-renderer.md), [AI](../../patterns-ai.md), [flows](../../patterns-flow.md).
- Decisions: ADR-0012/0013/0019/0022/0023 and the T01 amendment.

## Goal

Learners use one top strip and one guarded history pipeline through all supported navigation entry points, preserving working context.

## Scope

In scope: app controller/command adapter, extracted shell chrome/CSS, App wiring, outline disclosure/scroll/focus mementos, theme/native overlay activation, keyboard/compact menus and meaningful local desktop regressions. Out of scope: future topic pages, persistence, inference replay, general router/URL navigation and custom window buttons.

## Dependencies

- Depends on: [T01](menus-and-navigation.t01.md), [T02](menus-and-navigation.t02.md).
- Unblocks: T04.

## Implementation plan

1. Route dashboard/sidebar/breadcrumb/native-command/shortcut/button navigation through one owner. Resolve authoritative result before commit; canceled chooser/no-op and failures preserve Forward; serialize transactions and guard confirmations.
2. Retain project drafts and bounded reading mementos, restoring current content after render with stable topic/context IDs, clamped scroll and safe focus fallback. Reconcile external snapshots without fabricated visits.
3. Implement full-width theme-aware Back/Forward/toggle/File/Edit/View/Help strip, native control safe area/draggable blank space and compact Menu at narrow/zoomed sizes. Keep contextual breadcrumb; activate hidden title style/overlay via main.
4. Preserve exact project cancellation/cleanup/Saving and account-diagnostic behavior. Scoped keyboard handling supports platform Back/Forward, menu entry/arrows/Escape, editing and IME/modal guards; app accelerators run exactly once.
5. Add meaningful controller/restoration/command tests and actual Electron history/draft/menu/zoom checks during integration.

## Patterns to apply

React and the typed bridge only; core/main retain identity/AI/save ownership. Menu state is advisory; no privileged calls bypass guards. Use current Light/Dark tokens, visible focus, accessible labels and native controls. History is visits rather than undo/content versions; no-history actions remain explicit.

## Tests and verification

- Controller failure/stale/rapid-intent/restoration unit tests where behavior can fail.
- Actual Electron round-trip/branch/cancel/no-op/recovery/draft/disclosure/focus/keyboard/IME checks, menu command equivalence and viewport hit tests.
- `npm.cmd run check` and `npm.cmd run test:desktop`; use existing isolated provider/profile fixtures and preserve flow reporter.
- Coordinator reviews actual passing captures and records host/fixture/native limits.

## Acceptance criteria

- [ ] Strip order/placement, native control safe areas and theme/narrow/zoom behavior match R01/R02/R13.
- [x] Every existing destination entry point shares history semantics; rejection/cancellation/stale events leave cursor/branch unchanged.
- [x] Drafts/current-content disclosures/scroll/focus are restored; no writes/inference replay occurs.
- [x] Project guard/Saving/recovery and cross-view account diagnostics remain correct.
- [x] Menus/shortcuts/buttons agree, obey modal/IME/editing scope and have keyboard dismissal/focus restoration in the verified renderer/bridge journeys.

## Manual verification

Review real Light/Dark shell, narrow/200% controls, keyboard behavior and native popup/window behavior on available host. Do not infer OS chrome qualification from renderer captures.

## Completion evidence

Worker: `/root/navigation_integration`, GPT-6.1 Sol, high reasoning. Prerequisites T01 (`a123ed6`) and T02 (`e220926`) are accepted and committed on master. The coordinator reviewed source, independently reran 33 navigation/publication tests, and reviewed the eight navigation/projects PNGs; the read-only reviewer verified the other 44 actual Windows captures.

Final frozen-source `npm.cmd run check` (session 27446) passed lint, 28 unit files / 321 tests passed / 3 skipped, flow integrity, both type scopes and production build. Full `npm.cmd run test:desktop` (session 78527) passed 16 / 1 packaged-only skip in 6.1 minutes, including genuine receiving for 200,513 ms and both inference-owned and storage-only Saving barriers. The navigation journey verifies real traversal/branching, retained oversized drafts, current-content disclosures/scroll/focus, removed-anchor fallback, same-identity recovery refresh, editing/IME/modal scope, keyboard menu focus and both-theme compact control hit tests. The bridge helper now derives its stale advisory revision from an actual owning command.

Review corrections restore focus after same-identity recovery, preserve repeated menu-entry origin, restore the original editor before keyboard native popups, and retain readable workspace/preview regions at the actual minimum window and zoom. The native Select All callback uses the owning WebContents; a single keyboard edit/Undo passes. This does not prove OS keyboard selection of popup rows. Windows capture publication now retries only transient EPERM/EBUSY renames, with six attempts / 750 ms total, preserving locks, path checks and rollback; meaningful retry/exhaustion/nonretryable tests pass.

All owned test apps, provider servers and profiles were cleaned, including two precisely verified failed-probe roots. The user's existing app was preserved. The initial clipboard-dependent probe was replaced with zero clipboard access; its exact earlier mutation is unconfirmed and possible nontext clipboard effects remain disclosed in validation.

Implementation commit: `59ad994`. Subsequent coordinator [native Windows observations](evidence/windows/index.md) confirm title double-click maximize/restore, selected native popup keyboard actions, native minimize/activation restore/Close, appearance overlay and full-screen entry/exit. Drag/resize, clean restore-button input, minimum-window/200% native safe areas, complete native menu/editing checks, screen-reader and matching macOS/Linux qualification remain open. The first criterion therefore remains unresolved. Windows renderer/bridge and partial native success do not close these gates. T04 and whole-bundle acceptance remain open.

## Notes

- Requirements covered: R01, R02 implementation, R04 renderer, R05-R13 runtime, R14 consumer.
- Assumptions/open questions: topic navigation remains future scope; no product blocker.
