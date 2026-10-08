# Image replacement recovery and explicit cleanup

[Test implementation](../../../tests/desktop/image-regeneration.spec.ts) · [Flow patterns](../../patterns-flow.md)

Actual utility/ledger/checkpoint/candidate fault barriers prove pre-dispatch failure has zero image POST and terminal failure has one POST without an accepted candidate. Restart does not replay interrupted attempts. Retry save and Keep are storage-only. Missing original raster bytes remain repairable from exact current metadata. Close during held metadata preparation cancels the owned operation and waits cleanup with global/provider admission retained. Synthetic loopback calls are not live provider qualification.

The recorded Electron assertions passed against isolated local fixtures. Screen readers, native ACLs and live pedagogical/provider quality remain separate qualifications.

```powershell
npm.cmd run test:desktop -- tests/desktop/image-regeneration.spec.ts --grep "@image-regeneration-recovery"
```

<!-- flow-captures:start -->

### windows

Last successful run: 2026-10-08T00:14:26.845Z. Source revision: ad32e087bfd3e4352d5d57d980ec95660921e75f; source changes present: true.

[Capture metadata](screenshots/windows/manifest.json) records the test digest, image dimensions, viewport, theme, zoom and capture method.

| Screenshot | Observed checkpoint | Pixels |
| --- | --- | --- |
| [candidate-save-recovery](screenshots/windows/candidate-save-recovery.png) | Accepted candidate bytes retained after a real immutable-write failure, with storage-only Retry save. | 1603 × 1053 |

<!-- flow-captures:end -->
