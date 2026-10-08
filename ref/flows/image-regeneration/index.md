# Individual image candidate review

[Test implementation](../../../tests/desktop/image-regeneration.spec.ts) · [Flow patterns](../../patterns-flow.md)

A saved two-image chapter uses distinct deterministic 900x540 educational diagrams. The native image dialog edits a prompt, shows the selected fixed model and cached one-image estimate, and preserves the original marker through one actual image request. Candidate review uses its recorded model instead of a later selected-model quote. Restart restores review with no replay; account-free Use publishes only the selected illustration and its corrected native caption/alt. Both originals, other prose and learner files remain retained. Light/Dark and 600px/200% reduced-motion captures verify actual native raster pixels.

The recorded Electron assertions passed against isolated local fixtures. Screen readers, native ACLs and live pedagogical/provider quality remain separate qualifications.

```powershell
npm.cmd run test:desktop -- tests/desktop/image-regeneration.spec.ts --grep "@image-regeneration"
```

<!-- flow-captures:start -->

### windows

Last successful run: 2026-10-08T01:48:01.180Z. Source revision: d549f8b96365b020c2c477e9adb44bfd198d06f9; source changes present: false.

[Capture metadata](screenshots/windows/manifest.json) records the test digest, image dimensions, viewport, theme, zoom and capture method.

| Screenshot | Observed checkpoint | Pixels |
| --- | --- | --- |
| [prompt-light](screenshots/windows/prompt-light.png) | Pinned image prompt, original educational raster and one-image quote in Light. | 1602 × 1053 |
| [prompt-dark](screenshots/windows/prompt-dark.png) | The same editable prompt and current original in Dark. | 1602 × 1053 |
| [comparison-dark](screenshots/windows/comparison-dark.png) | The same explicit candidate comparison in Dark, independent of current selected model. | 1602 × 1053 |
| [comparison-light](screenshots/windows/comparison-light.png) | Original and actual decoded candidate, retained model identity and native caption/alt editing in Light. | 1602 × 1053 |
| [comparison-narrow-light](screenshots/windows/comparison-narrow-light.png) | Candidate review at 600 pixels and 200% zoom with reduced motion in Light. | 752 × 877 |
| [comparison-narrow-dark](screenshots/windows/comparison-narrow-dark.png) | The same bounded candidate review and reachable Keep in Dark. | 752 × 877 |

<!-- flow-captures:end -->
