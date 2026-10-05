# Ticket: ai-streaming.T06 - Long-stream Electron acceptance and reviewed flow references
Status: Open

## Source

- Spec: [Shared Pi streaming](ai-streaming.spec.md), R23 and real Electron/gates sections.
- Product scope: [PRD 01](../../prds/01-project-setup-and-outline.md); fixture evidence remains separate from live allowance.
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md).
- Patterns: [flows](../../patterns-flow.md), [development/testing](../../patterns-development-testing.md), [distribution](../../patterns-distribution.md), [design system](../../patterns-design-system.md), [UX](../../patterns-ux.md).
- ADRs: [0004](../../ADRs/ADR-0004-quality-gates-and-native-packaging.md), [0018](../../ADRs/ADR-0018-development-file-diagnostics.md), [0020](../../ADRs/ADR-0020-playwright-flow-references.md), plus T01's streaming decision.

## Goal

Prove on the actual Electron/utility/bridge path that a receiving operation survives the former deadlines, saves correctly and produces passing, reviewed reference captures; qualify the packaged worker path.

## Scope

### In scope

Dedicated `ai-streaming` desktop flow, unaccelerated long-response fixture, cross-domain integrated checks, stable capture registration/narratives, current-host packaging and evidence audit.

### Out of scope

Deferring essential unit/security/user-flow tests from earlier tickets, manufactured expensive live calls, unrelated desktop infrastructure redesign, universal native/platform certification or deployment.

## Dependencies

- Depends on: [ai-streaming.T05](ai-streaming.t05.md).
- Unblocks: [ai-streaming.T07](ai-streaming.t07.md).
- External prerequisites: current-host graphical Electron session and packaging runtime. Report an unavailable gate explicitly; fixtures need no live account.

## Implementation plan

1. Add `tests/desktop/ai-streaming.spec.ts`, using the existing signed local provider/profile fixture and shared flow capture fixture. Register stable `ai-streaming` flow/tag/checkpoints and its `ref/flows/ai-streaming/index.md` with assertions, run command, limits and generated-block markers. Add discovery to flow patterns. Do not expose public timeout knobs.
2. Run one **at-least-200-second real-time response**, delivering small chunks/SSE heartbeats within the unchanged 180-second inactivity interval before a completed valid outline. Assert elapsed time, visible panel/Cancel and incomplete/unsaved status after 190 seconds, then final saved bytes/domain success. Give only this journey a justified 300-second timeout; keep the existing global 45-second limit. Neither fake clocks nor delayed final UI after fast inference satisfy this requirement.
3. Add bounded burst/structured-only/repair coverage on the actual path for prompt waiting, latest preview latency, final ordering and no uncontrolled IPC growth. Use private controlled fixture/domain barriers where checking/saving capture needs determinism; never weaken production gates. Reuse earlier cancellation/idle/health/security cases rather than duplicating every unit test here.
4. Confirm T04's >30-second model-access flow and reciprocal diagnostic/educational admission with actual provider counts, dashboard/global panel, independent proof and zero project material. Exercise unsaved-output recovery after another allowed call and topic failure/conflict file preservation across the integrated UI.
5. Capture asserted waiting, structured draft, checking/saving, unsaved/recovery and terminal states plus Light/Dark, narrow/200% zoom, long input and reduced motion across the dedicated/affected flows. Refresh through the configured reporter; open actual PNGs and maintain each affected semantic narrative. Concepts/design images are never passing references. Failed/skipped/interrupted journeys retain previous captures according to ADR-0020.
6. Run full integrated gates sequentially in one checkout: `npm run check`, `npm run test:desktop`, `npm run test:flows`, `npm run package`, then `npm run test:packaged`. Confirm both worker profiles/dependencies are included and process security remains intact. Use PowerShell on Windows; Xvfb only for headless Linux. Do not overlap capture commands or replace the reporter.
7. Update future bundle `validation.md` with exact commands/results, source revision/dirty state, environment and limits. Map R01–R23 to actual evidence in `acceptance.md`, identifying manual accessibility/live-account/native-platform qualification separately. T07 audits and finalizes documentation/evidence after any last changes; passing individual tickets is not whole-bundle closure.

## Patterns to apply

Tests drive actual Electron and named bridge, not fabricated DOM state. Use isolated sample content/profile/token fixtures and mask local paths in captures. Preserve main/utility boundaries, sandboxing, packaged fuses and safe diagnostic limits. Reporter owns generated tables/manifests; contributor owns narrative and visual review.

## Tests and verification

- Dedicated long-stream and burst flow plus existing outline/topic/model-access/recovery/appearance/reading/inference-diagnostics and packaged-worker journeys. Assert transport timing and saved bytes, not merely the presence of a screenshot.
- Gates listed above plus changed-link review and `git diff --check`. No-new-test exception not applicable; this ticket adds the real elapsed and packaged integration evidence unavailable to fake-clock tests.
- If a required local gate fails/unavailable, retain precise results and leave its acceptance unchecked. Do not label live/native external gates passed by fixture substitution.

## Acceptance criteria

- [ ] A real ≥200-second receiving stream survives both old outline cutoffs and completes a validated save with observable active UI past 190 seconds.
- [ ] Shared model diagnostics survive their old cutoff and mutual admission/privacy hold across actual process boundaries.
- [ ] Passing cataloged captures/narratives document actual states and adaptation; reference integrity checks pass.
- [ ] Full code/desktop/flow and current-host package/packaged-worker gates have explicit results without security relaxation.
- [ ] Bundle evidence names exact requirement coverage and all remaining qualification limits.

## Manual verification

Watch the long local fixture once, confirm honest waiting/activity and reachable Cancel, inspect terminal save and reviewed flow images, then review the packaged worker evidence. Record representative focus/scroll/accessibility results from T05. Live-account streaming, Sol/Luna eligibility, other native OS appearance and suspend/resume require separately authorized/available evidence; do not deliberately consume allowance for a three-minute timing demonstration.

## Completion evidence

Pending authorized implementation: real elapsed measurements, flow/capture manifests, full gate results, packaged profile coverage and acceptance evidence. No tests or captures are claimed by this planning artifact.

## Notes

- Requirements covered: primary R23; supporting R01–R21 through integrated evidence, not replacement of their primary ticket tests.
- Blockers: none for authoring. Graphical/packaging and external qualification limits must be resolved or reported during implementation.
