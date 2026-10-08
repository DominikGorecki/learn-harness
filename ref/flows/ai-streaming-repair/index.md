# Structured candidate repair

[Test implementation](../../../tests/desktop/ai-streaming.spec.ts) · [Flow patterns](../../patterns-flow.md)

## Starting conditions

An isolated empty learning project and signed local provider fixture. Both responses contain genuine structured function-call arguments and completed Responses events.

## Journey and assertions

1. The first provisional outline is visible but references a missing starting lesson. Authoritative bytes remain unchanged before and after its clean EOF; independent tool validation rejects it.
2. Pi issues one repair turn. Its distinct candidate replaces the earlier preview, with correlated turn/revision evidence and no stale candidate afterward.
3. The valid second candidate completes through clean EOF and becomes the exact saved document. The fixture receives exactly two inference requests; no partial output is published.

## Run and refresh

```powershell
npm run test:desktop -- tests/desktop/ai-streaming.spec.ts --grep "@ai-streaming-repair( |$)"
```

The normal 45-second test budget and configured reporter apply. Failed journeys preserve previous references.

## Evidence limits

Actual Electron/Pi/bridge and storage behavior is exercised using synthetic local responses, without live inference. This does not establish curriculum quality, account eligibility, accessibility certification or other-platform behavior. Temporary local paths are masked.

<!-- flow-captures:start -->

### windows

Last successful run: 2026-10-08T01:47:21.202Z. Source revision: d549f8b96365b020c2c477e9adb44bfd198d06f9; source changes present: false.

[Capture metadata](screenshots/windows/manifest.json) records the test digest, image dimensions, viewport, theme, zoom and capture method.

| Screenshot | Observed checkpoint | Pixels |
| --- | --- | --- |
| [repair-first-draft](screenshots/windows/repair-first-draft.png) | A genuine first structured draft is provisional and has not entered saved project state. | 1603 × 1053 |
| [repair-replacement](screenshots/windows/repair-replacement.png) | The second provider turn replaces the rejected candidate rather than appending it. | 1603 × 1053 |
| [repair-saved](screenshots/windows/repair-saved.png) | Only the independently valid replacement becomes the saved outline. | 1603 × 1053 |

<!-- flow-captures:end -->
