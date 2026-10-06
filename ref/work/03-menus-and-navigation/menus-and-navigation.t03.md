# Ticket: menus-and-navigation.T03 - Integrate title strip and guarded navigation
Status: Open

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
- [ ] Every existing destination entry point shares history semantics; rejection/cancellation/stale events leave cursor/branch unchanged.
- [ ] Drafts/current-content disclosures/scroll/focus are restored; no writes/inference replay occurs.
- [ ] Project guard/Saving/recovery and cross-view account diagnostics remain correct.
- [ ] Menus/shortcuts/buttons agree, obey modal/IME/editing scope and have keyboard dismissal/focus restoration.

## Manual verification

Review real Light/Dark shell, narrow/200% controls, keyboard behavior and native popup/window behavior on available host. Do not infer OS chrome qualification from renderer captures.

## Completion evidence

Coordinator fills after review and validation.

## Notes

- Requirements covered: R01, R02 implementation, R04 renderer, R05-R13 runtime, R14 consumer.
- Assumptions/open questions: topic navigation remains future scope; no product blocker.
