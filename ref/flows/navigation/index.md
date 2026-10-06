# Shared application navigation

[Test implementation](../../../tests/desktop/navigation.spec.ts) · [Flow patterns](../../patterns-flow.md)

## Starting conditions

Isolated profile, two saved offline outlines sharing stable lesson IDs and an empty draft project. Native chooser responses use only owned temporary folders.

## Journey and assertions

Traverse actual project visits, restore disclosures, focus and main scroll, preserve Forward on same-location clicks and chooser cancellation, branch to a project with an oversized goal draft, and invoke the real native View command callback. Scope commands during editing, composition and a modal. Remove a remembered topic in current saved content and verify safe heading fallback. Reach and repair a known unavailable destination without adding a visit. Hit-test compact controls at 600 x 480 and 200% zoom in both themes.

The recorded Windows journey enters the top-level menus with F10 and an Alt mnemonic, restores the original editor focus for the native popup, invokes its actual Select All role callback, then dismisses back to that editor. It verifies full selection, keyboard text replacement and Undo. This exercises the owning native popup and focused role callback; it does not select a native popup row with OS keyboard input.

## Run and refresh

```powershell
npm run test:desktop -- tests/desktop/navigation.spec.ts
```

## Evidence limits

Offline fixtures establish current-content navigation and renderer hit tests. Native callbacks establish View command wiring and the owning popup's focused Select All role execution, followed by keyboard replacement/Undo. Native popup-row keyboard interaction, other editing roles, full window controls and OS screen-reader behavior require separate host evidence. [Acceptance](../../work/03-menus-and-navigation/acceptance.md) and [validation](../../work/03-menus-and-navigation/validation.md) retain the unresolved Windows/macOS/Linux qualifications and distinguish this local evidence from bundle completion.

<!-- flow-captures:start -->

### windows

Last successful run: 2026-10-06T13:40:05.798Z. Source revision: 2169435211413ceb985de2557e52e76baacdb497; source changes present: true.

[Capture metadata](screenshots/windows/manifest.json) records the test digest, image dimensions, viewport, theme, zoom and capture method.

| Screenshot | Observed checkpoint | Pixels |
| --- | --- | --- |
| [reading-restored-light](screenshots/windows/reading-restored-light.png) | Restored Light reading context after traversing real project history. | 1603 × 1053 |
| [reading-current-dark](screenshots/windows/reading-current-dark.png) | Current Dark outline after removing a remembered stable topic. | 1603 × 1053 |
| [compact-light](screenshots/windows/compact-light.png) | Reachable title-strip controls at 600 by 480 and 200% zoom in Light. | 752 × 603 |
| [compact-dark](screenshots/windows/compact-dark.png) | Reachable title-strip controls at 600 by 480 and 200% zoom in Dark. | 752 × 603 |

<!-- flow-captures:end -->
