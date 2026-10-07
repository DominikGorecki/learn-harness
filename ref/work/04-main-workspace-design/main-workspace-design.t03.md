# Ticket: main-workspace-design.T03 - Adopt Sculpted aperture branding and reproducible native icons
Status: Done — local implementation accepted; named native-platform qualifications remain unrun.

## Source

- Spec: [main-workspace-design.spec.md](main-workspace-design.spec.md)
- Design: [main-workspace-design.design.md](main-workspace-design.design.md)
- Product: [overview](../../../docs/overview.md), [PRD 01](../../prds/01-project-setup-and-outline.md)
- Guidance: [AGENTS](../../../AGENTS.md), [README](../../../README.md), [patterns](../../patterns.md), [ADRs](../../ADRs/INDEX.md)

## Goal

Adopt Sculpted aperture branding and reproducible native icons.

## Scope

### In scope

Construct one editable three-page triangular vector master matching locked large glyph. Share geometry with glyph-only currentColor brand rendering. Export deterministic padded PNG size sets/Windows ICO/macOS ICNS from master and app-tile recipe. Configure fixed runtime/build resources without identity/profile/fuse changes. Audit alpha/size/consumer paths and small-size Light/Dark/mono output. Package Windows and inspect actual executable/resource/native host presentation with exact limits.

### Out of scope

All strict spec exclusions: panel/dock/title redesign, schemas, new inference producers, tutoring, identity/profile migration, release signing/publishing.

## Dependencies

- Depends on: T01
- Unblocks: T04
- External prerequisite: bundle 03 runtime controller is present at starting HEAD d258a6d; retain its separately unresolved native qualifications.

## Implementation plan

Construct one editable three-page triangular vector master matching locked large glyph. Share geometry with glyph-only currentColor brand rendering. Export deterministic padded PNG size sets/Windows ICO/macOS ICNS from master and app-tile recipe. Configure fixed runtime/build resources without identity/profile/fuse changes. Audit alpha/size/consumer paths and small-size Light/Dark/mono output. Package Windows and inspect actual executable/resource/native host presentation with exact limits.

## Patterns to apply

- Read design-system, UX, renderer, AI, flows, development/testing and distribution as applicable; ADR-0007/0013/0019/0020/0021/0022/0023/0024 retain unamended scope.
- Ownership: assets/branding; scripts icon export/audit; Mark.tsx; main fixed icon resolver/index; electron-builder.yml; package.json if needed; focused asset/resource tests and brand preview evidence.
- Renderer presentation/navigation stays unprivileged; main/build own bounded fixed icon resources. No core/shared/preload behavior changes expected.
- Preserve validated named IPC, sandboxing, .edu/profile separation, source locality, AI cancellation/save ownership and truthful authoritative status.
- Scope Light/Dark editorial/glass treatment to central content/header. Existing panels and overlays retain contracts; native qualification is distinct from fixture captures.

## Tests and verification

- npm run check; npm run test:desktop -- tests/desktop/appearance.spec.ts tests/desktop/navigation.spec.ts; npm run package; npm run test:packaged; export metadata/alpha audit and actual 16/24/32/48px/native Windows resource review.
- Add meaningful behavior regressions at affected boundary; presentation-only primitives need no mirror tests.
- Use existing isolated Electron fixtures and configured flow reporter, never live private data.
- Evidence: primary records actual commands/outcomes in validation.md and requirement mapping in acceptance.md.

## Acceptance criteria

- [x] One clean vector master supplies all outputs and selected triangular shape/gaps remain readable.
- [x] Existing brand slot dimensions/text/names/navigation stay unchanged; action icons unchanged.
- [x] ICO/ICNS/PNG export recipe is reproducible and fixed runtime/package paths resolve.
- [x] Host package/resource evidence and unrun platform/native limits are explicitly recorded.

## Manual verification

- Inspect actual both-theme relevant captures, keyboard/focus/selection, narrow/200%, reduced motion and opaque surfaces against selected reference.
- Preserve full data, visible labelled commands and usable reading/dock. Separate renderer automation from native screen-reader/window/taskbar qualification and live-provider evidence.

## Completion evidence

Worker branding used gpt-6.1-sol/high. T01 prerequisite is committed as 15802600833d551f31cf00466a7fd9b3a81b13f9; acceptance occurred on master after T02 commit 7bee459ac5e6e5c42ca1a1ac3b76736a9a365aed. The coordinator reviewed actual source, tile/preview output, alpha/container metadata and fixed consumer paths. Renderer slots remain 22px/36px and only their glyph changes.

Final npm run check passed (29 suites, 327 passed/3 skipped plus lint/flows/types/build). Appearance/navigation desktop passed 2/2; Windows package passed; packaged ASAR worker test passed 1/1. Repeat-render branding:check passed. Independent primary branding:package verified actual ASAR main, fixed runtime PNG and every one of seven executable icon frames against the exported master. Full details are in [validation](validation.md).

Actual Windows Explorer Details and Large icons showed the built executable's selected mark. Native runtime/window/taskbar review was stopped when the user ended computer use; that qualification remains unrun. Subsequent frontend checks use Playwright as requested. macOS/Linux package/native presentation, signing/installers, screen readers, cross-host export byte identity and live-provider evidence remain explicitly unqualified. Isolated export/test/native-review helper resources were cleaned.

## Notes

- Requirements covered: R17, R18; R01 (brand exception).
- No unresolved product decision; native/macOS/Linux/manual qualifications must be named honestly.
