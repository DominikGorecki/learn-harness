# Shared application navigation

[Test implementation](../../../tests/desktop/navigation.spec.ts) · [Flow patterns](../../patterns-flow.md)

## Starting conditions

Isolated profile, two saved offline outlines sharing stable lesson IDs and an empty draft project. Native chooser responses use only owned temporary folders.

## Journey and assertions

Traverse actual project visits, restore inline Preview topic plan/context disclosures, focus and main scroll, preserve Forward on same-location clicks and chooser cancellation, branch to a project with an oversized goal draft, and invoke the real native View command callback. Scope commands during editing, composition and a modal. Remove a remembered topic in current saved content and verify safe heading fallback. Reach and repair a known unavailable destination without adding a visit. Hit-test compact controls at 600 x 480 and 200% zoom in both themes.

Reject an unknown profile handle through the real selection service, and inject one owning IPC BUSY or INTERNAL result before any selection mutation; current identity and Forward remain intact. Hold a chooser's real resolution and deliver duplicate commands while pending, then reject a valid stale revision through the real preload consumer. Settings, account, independent labelled Edit outline/Edit topic commands, editor drafts, disclosures and sidebar changes retain the branch. The separate [topic-reading flow](../topic-reading/index.md) covers real stable topic destinations and missing-topic canonicalization. Relink a moved folder under the same profile handle, externally rename its saved metadata, and traverse the retained branch using that current name without adding a visit.

The recorded Windows journey enters the top-level menus with F10 and an Alt mnemonic, restores the original editor focus for the native popup, invokes its actual Select All role callback, then dismisses back to that editor. It verifies full selection, keyboard text replacement and Undo. This exercises the owning native popup and focused role callback; it does not select a native popup row with OS keyboard input.

## Run and refresh

```powershell
npm run test:desktop -- tests/desktop/navigation.spec.ts
```

## Evidence limits

Offline fixtures establish current-content navigation and renderer hit tests. Native callbacks establish View command wiring and the owning popup's focused Select All role execution, followed by keyboard replacement/Undo. Native popup-row keyboard interaction, other editing roles, full window controls and OS screen-reader behavior require separate host evidence. [Acceptance](../../work/03-menus-and-navigation/acceptance.md) and [validation](../../work/03-menus-and-navigation/validation.md) retain the unresolved Windows/macOS/Linux qualifications and distinguish this local evidence from bundle completion.

The injected BUSY/INTERNAL replies establish rejected-transition behavior at the owning IPC boundary; they do not establish genuine backend admission or sender authorization. Independent bridge tests retain sender/frame evidence. Chooser responses use owned folders rather than native chooser interaction.

<!-- flow-captures:start -->

### windows

Last successful run: 2026-10-07T23:07:57.338Z. Source revision: b0324d3bc9401083538c49b7cc5d53231f1677c2; source changes present: true.

[Capture metadata](screenshots/windows/manifest.json) records the test digest, image dimensions, viewport, theme, zoom and capture method.

| Screenshot | Observed checkpoint | Pixels |
| --- | --- | --- |
| [reading-restored-light](screenshots/windows/reading-restored-light.png) | Restored Light reading context after traversing real project history. | 1603 × 1053 |
| [reading-current-dark](screenshots/windows/reading-current-dark.png) | Current Dark outline after removing a remembered stable topic. | 1603 × 1053 |
| [compact-light](screenshots/windows/compact-light.png) | Reachable title-strip controls at 600 by 480 and 200% zoom in Light. | 752 × 603 |
| [compact-dark](screenshots/windows/compact-dark.png) | Reachable title-strip controls at 600 by 480 and 200% zoom in Dark. | 752 × 603 |

<!-- flow-captures:end -->
