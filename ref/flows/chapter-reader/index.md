# Offline illustrated chapter reading

[Test implementation](../../../tests/desktop/chapter-reader.spec.ts) · [Flow patterns](../../patterns-flow.md)

Two isolated saved projects contain validated seven-section chapters and distinct deterministic educational diagrams at native 900×540 pixels. No connection is needed. The reader loads bounded four-section pages, displays exact objectives, examples, misconceptions and truthful source notes, and keeps model HTML and remote-image Markdown inert. These synthetic diagrams demonstrate layout and local raster serving, not model pedagogy.

Keyboard TOC focus and Back/Forward restore the current chapter only after the held final page settles. Cross-project same-topic IDs and rapid traversal cannot reuse old prose or acknowledge a shorter initial plan. Provider updates preserve manual scroll. Missing assets retain explanations; restoring the exact version and explicitly reloading retries local media. Typed read-only presentation disables mutation while preserving prose. Both themes, reduced motion and 600 pixels at 200% zoom have actual captures. Restart and folder relocation retain account-free local reading, unchanged source/project bytes and zero inference/metadata HTTP.

Saved illustration frames now include a muted accessible Regenerate control, disabled when mutation is unavailable or a review already owns the topic. Missing-raster frames retain that control for an otherwise authorized repair. The separate [image regeneration](../image-regeneration/index.md) and [recovery](../image-regeneration-recovery/index.md) journeys establish actual prompt/candidate/Use/Keep and storage-only behavior.

```powershell
npm run test:desktop -- tests/desktop/chapter-reader.spec.ts --grep "@chapter-reader"
```

The Light/Dark illustration checkpoints place the native raster and caption in the viewport. Each exact native frame must contain the synthetic diagram's purple and teal bars; the configured recorder publishes that verified bitmap without taking another compositor frame. Missing-media evidence frames its reserved placeholder and explanation. At minimum size and zoom, the reader exercises reachable disabled generation controls and the TOC, then captures the actual figure, caption and nearby prose without horizontal overflow.

Native ACLs, screen readers, other platforms and live pedagogical quality remain separate qualifications.

<!-- flow-captures:start -->

### windows

Last successful run: 2026-10-08T01:36:43.124Z. Source revision: 5adc9e1e35ec9a398233ed3f74d17b5003b8f6e7; source changes present: true.

[Capture metadata](screenshots/windows/manifest.json) records the test digest, image dimensions, viewport, theme, zoom and capture method.

| Screenshot | Observed checkpoint | Pixels |
| --- | --- | --- |
| [chapter-light](screenshots/windows/chapter-light.png) | Saved illustrated chapter with bounded local prose, TOC and exact objectives in Light. | 1603 × 1053 |
| [chapter-dark](screenshots/windows/chapter-dark.png) | The same offline reader in Dark, with current-content history retained. | 1603 × 1053 |
| [chapter-illustration-dark](screenshots/windows/chapter-illustration-dark.png) | The same native illustration and caption actually visible in Dark. | 1602 × 1053 |
| [chapter-illustration-light](screenshots/windows/chapter-illustration-light.png) | Useful native local raster, explanatory caption and surrounding reading in Light. | 1602 × 1053 |
| [chapter-missing](screenshots/windows/chapter-missing.png) | Missing local illustration retains its caption, alternate explanation and saved prose. | 1603 × 1053 |
| [chapter-readonly](screenshots/windows/chapter-readonly.png) | Typed main-sent read-only presentation retains chapter reading and disables mutations. | 1603 × 1053 |
| [chapter-narrow-dark](screenshots/windows/chapter-narrow-dark.png) | Dark chapter controls and reading reflow at 600 pixels and 200% zoom with reduced motion. | 752 × 877 |
| [chapter-narrow-light](screenshots/windows/chapter-narrow-light.png) | The same bounded reader in Light at minimum size and zoom. | 752 × 877 |

<!-- flow-captures:end -->
