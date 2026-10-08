# Sectioned provider settings and request history

[Test implementation](../../../tests/desktop/openrouter-settings.spec.ts) · [Flow patterns](../../patterns-flow.md)

## Starting conditions

An isolated app profile, ordinary-key loopback metadata HTTP fixture, and two validated historical image ledger records. The historical records establish exact known cost and unknown cost with independent discarded/save-failed publication states; they are synthetic storage evidence, not live billed requests.

## Journey and assertions

Open Settings on OpenRouter, switch categories with a password draft, choose Appearance immediately, dismiss by Escape and verify trigger focus and secret clearing. Save an ordinary fixture key through the real named bridge and actual non-inference HTTP; verify six durable metadata requests and a cached one-image quote with a plain-language basis. An injected safe quote rejection settles to Estimate unavailable without HTTP. Invalid key replacement preserves the previous credential bytes. A saved unavailable model stays selected with its reason.

Refresh enough metadata calls to paginate real durable history, inspect exact app costs separately from key-wide usage, apply purpose/model/outcome/inclusive UTC date filters, and inspect unknown/known billing and publication details. Injected safe page/filter read failures clear outdated rows and disable stale Next cursors; explicit Retry history restores the requested result. A failed metadata refresh retains timestamped stale prices and usage. A held real key-validation acknowledgement crosses close/reopen without clearing the new draft; a deferred native modal reopening tolerates delivery of an old close event. Keyboard focus remains trapped in the native dialog. Both themes at 600 pixels/200% zoom and reduced motion keep key, refresh, removal, filter and pagination controls reachable. Restart performs no HTTP, preserves model/history/costs, and key removal retains historical costs and unknowns through another restart. Settings/categories/filters/theme changes add no history or AI activity. Safe DTOs and actual development diagnostics exclude fixture secrets and hostile provider labels/errors.

## Run and refresh

```powershell
npm run test:desktop -- tests/desktop/openrouter-settings.spec.ts
```

## Evidence limits

The journey exercises isolated Electron renderer/preload/main, real loopback metadata HTTP and durable profile storage. Historical image costs are explicitly seeded fixtures; no image generation or paid live-provider test runs here. The separate [provider admission journey](../openrouter-settings-admission/index.md) covers actual active-provider BUSY feedback and cancellation. Injected quote/history failures are typed main reply fixtures, not claims of native storage failure. Captures establish renderer layout and keyboard/focus behavior, not native OS accessibility, screen-reader qualification, actual account funds or live model eligibility.

<!-- flow-captures:start -->

### windows

Last successful run: 2026-10-08T01:58:08.372Z. Source revision: d549f8b96365b020c2c477e9adb44bfd198d06f9; source changes present: false.

[Capture metadata](screenshots/windows/manifest.json) records the test digest, image dimensions, viewport, theme, zoom and capture method.

| Screenshot | Observed checkpoint | Pixels |
| --- | --- | --- |
| [settings-unavailable-light](screenshots/windows/settings-unavailable-light.png) | The saved Seedream choice remains visible with its catalog absence reason in Light. | 1603 × 1053 |
| [settings-usage-light](screenshots/windows/settings-usage-light.png) | Exact app spend, unresolved cost count and separately labelled key-wide usage in Light. | 1603 × 1053 |
| [settings-history-light](screenshots/windows/settings-history-light.png) | Filtered chapter-image history and unknown billing independent of save failure. | 1603 × 1053 |
| [settings-stale-dark](screenshots/windows/settings-stale-dark.png) | Dark connection recovery retains last-known pricing after failed metadata refresh. | 1603 × 1053 |
| [settings-narrow-dark](screenshots/windows/settings-narrow-dark.png) | OpenRouter connection controls reflow at 600 pixels and 200% zoom in Dark with reduced motion. | 752 × 802 |
| [settings-narrow-light](screenshots/windows/settings-narrow-light.png) | The same reflowed connection controls in Light. | 752 × 802 |

<!-- flow-captures:end -->
