# ADR-0024: Integrated application title strip with native window controls

- Status: Accepted — title strip/menu runtime active; native qualification and bundle acceptance remain open
- Date: 2026-10-06
- Scope: application title area, native menus and bounded chrome presentation. Amends only ADR-0013's native-title-bar and native-overlay appearance restriction.

## Context

The authorized [menus/navigation implementation](../work/03-menus-and-navigation/menus-and-navigation.spec.md) places Back, Forward, sidebar toggle and application menus in one compact title strip. ADR-0013 currently requires ordinary OS title chrome and forbids overriding its appearance. A separate toolbar would preserve that decision but would not provide the requested integrated composition. Native window controls and normal platform behavior remain required.

The pinned Electron version is 44.5.1. Its [custom title-bar guidance](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar) documents hidden title style, native control overlays on Windows/Linux, retained traffic lights on macOS and title-area safe metrics. Its [window-interaction guidance](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions) explains drag regions and excluding interactive controls from them. These documented options guide implementation; they do not prove native host behavior.

## Decision

Adopt an integrated renderer application strip with Electron hidden title style and native window buttons. Windows/Linux use the native control overlay and native popup menus; macOS retains traffic lights and the system application menu, with navigation arrows and sidebar toggle in the window. Do not draw replacement minimize/maximize/close buttons. Preserve resize, drag, double-click maximize/restore and platform window lifecycle behavior. Empty strip space is draggable; controls and popup triggers are not.

Use current Light/Dark semantic tokens for the strip. Main selects bounded native overlay colors from the resolved Light/Dark mode; it accepts no caller-controlled colors, CSS or window options. An unavailable overlay update must preserve usable native buttons and renderer theming. Reserve native control safe areas using overlay metrics and platform layout rather than a fixed right padding assumption. At narrow widths/200% zoom keep arrows available and expose the same menu commands through a labelled compact Menu trigger. Preserve focus, keyboard access, readable disabled states and reduced motion.

Main owns BrowserWindow options, native menus/roles, popup positioning, overlay updates, About and window lifecycle. Renderer owns one guarded navigation/history pipeline, shell controls and scoped application shortcuts. Preload exposes only named, strictly validated menu/chrome capabilities and stripped fixed command subscriptions with unsubscribe. Menu availability is advisory; main/core still enforce authorization, known handles, operation ownership and save/cancellation rules independently. Standard editing remains native focused-surface Undo/Redo, separate from history.

## Scoped amendment and evidence

This replaces ADR-0013's requirement for an ordinary OS title bar and its prohibition on native appearance updates only for this integrated strip/native overlay. All palette, Settings, local preference, persistent partition, focus, project/draft/account preservation and security rules remain in force. No generic IPC, URL/path/clipboard/process/window-control API, router, history persistence, future topic screen or new close/quit recovery guarantee is authorized. ADR-0012/0019/0022 continue to govern AI admission, cleanup, Saving and recoverable publication.

At adoption, T01 introduced unused pure renderer navigation primitives without activating chrome or menus. T02-T03 subsequently activated the named native adapters, integrated title strip and guarded navigation owner. Local Windows code/desktop fixture and reviewed Light/Dark, narrow/zoomed renderer evidence are recorded in [acceptance](../work/03-menus-and-navigation/acceptance.md) and [validation](../work/03-menus-and-navigation/validation.md); the [navigation flow](../flows/navigation/index.md) describes the observed interaction scope. Native drag, resize, system controls, menu interaction and accessibility still need separately recorded Windows/macOS/Linux host qualification. Those required qualifications and bundle acceptance remain open; renderer screenshots and fixture success do not establish native qualification or live inference.

Current rules: [design](../patterns-design-system.md), [renderer](../patterns-renderer.md), [architecture](../patterns-architecture.md), [IPC/security](../patterns-ipc-security.md). Shared-history contributor discipline remains [ADR-0023](ADR-0023-navigation-history-integration.md).
