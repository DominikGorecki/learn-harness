# Ticket: menus-and-navigation.T04 - Verify navigation flows and maintain contracts
Status: Open

## Source

- Spec: [Application menus and navigation history](menus-and-navigation.spec.md)
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md), [flows](../../patterns-flow.md), [testing](../../patterns-development-testing.md), [documentation](../../patterns-documentation.md), [UX](../../patterns-ux.md), [renderer](../../patterns-renderer.md).
- Decisions: ADR-0020/0021/0022/0023 and the T01 title-strip amendment.

## Goal

Current menu/history behavior has real Electron evidence and maintained contributor/flow documentation; outstanding native qualifications are recorded precisely.

## Scope

In scope: cataloged navigation journey, bridge/native command exercise, recovery/identity/branch/restoration/keyboard/zoom regression coverage, affected existing flow refresh/narratives, actual native Windows evidence where available and maintained implemented-contract wording. Out of scope: expanding product scope, weakened security, fake OS/manual/live evidence, coordinator-owned status/closure records.

## Dependencies

- Depends on: [T03](menus-and-navigation.t03.md).
- Unblocks: coordinator's fresh whole-spec review and closure audit.
- External qualification: native macOS/Linux and OS accessibility/window interaction checks need matching hosts; no local test is a substitute. Preserve unresolved required scope explicitly.

## Implementation plan

1. Register a real `navigation` flow in the existing catalog/index and exercise success, guards, missing/relinked/unknown targets, unchanged history actions, stale state and current-content restoration against actual APIs.
2. Exercise native menu commands, focused editing roles, subscription cleanup and security inputs through Electron, not only DOM simulation. Verify navigation issues no inference or write replay.
3. Capture/review both themes and narrow/zoom/disabled/available/pending states with the configured reporter; review affected existing references and update narrative contracts.
4. Record real native host evidence for control options/behavior separately from renderer screenshots. Identify checks requiring manual/native/macOS/Linux/accessibility evidence; do not falsely close them.
5. Update maintained README and constrained patterns to reflect delivered behavior, preserving history integration recipe and fixture/platform qualifications. Return exact requirement evidence to coordinator.

## Patterns to apply

Flows contain actual Electron journeys with synthetic data and reporter-owned tables; reviewed images supplement functional assertions. Every navigation feature accounts for history/identity/restoration/guards/evidence under ADR-0023. No placeholder future pages or external links.

## Tests and verification

- New navigation and extended current project/recovery/appearance/reading tests as needed for requirement gaps.
- `npm.cmd run check`, `npm.cmd run test:desktop`, `npm.cmd run test:flows`; final fresh cumulative runs belong to coordinator after all mutating workers settle.
- Native window/keyboard/OS-screen-reader outcomes need matching actual host checks; report unavailable gates explicitly.

## Acceptance criteria

- [ ] R01-R14 have explicit current-state evidence with real bridge/controller/UI behavior.
- [ ] R15 contributor integration and current runtime statements agree; future routes remain unimplemented scope.
- [ ] R16 navigation flow is cataloged, captures reviewed and affected narrative evidence maintained.
- [ ] Native window/OS qualifications are either actually verified or precisely unresolved; no broad native/manual claim from option assertions.

## Manual verification

Inspect actual screenshots and keyboard/menu/window behavior on Windows; retain explicit separate macOS/Linux and OS screen-reader qualification. Native OS interaction evidence is not equivalent to webContents renderer capture.

## Completion evidence

Coordinator fills after review and validation. Remaining required external qualifications prevent whole-bundle completion even if local code is accepted.

## Notes

- Requirements covered: R16 primary; R01-R14 cumulative evidence and regressions; R15 maintained guidance.
- Assumptions/open questions: external matching-host qualification may remain unavailable; continue all independent implementation and checks first.
