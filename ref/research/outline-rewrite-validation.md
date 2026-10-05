# Outline rewrite validation

Date: 2026-10-04. Platform: Windows. Decision: [ADR-0017](../ADRs/ADR-0017-outline-rewrites-with-saved-context.md).

## Checks run

- `npm run check`: passed outside the restricted execution environment; lint, 169 unit tests passed / 2 skipped, both TypeScript scopes and production bundles.
- `npm run test:desktop`: passed outside the restricted launcher environment; 10 journeys passed / 1 packaged-artifact test skipped. Chromium sandboxing and application security defaults remained enabled.
- `npx playwright test tests/desktop/outline-edit.spec.ts`: passed again after strengthening zoom verification and capturing the native Electron surface.
- `npx vitest run tests/unit/generation-service.test.ts tests/unit/pi-outline-engine.test.ts`: 36 tests passed during implementation.
- `git diff --check`: passed.

The first sandboxed check stopped at three development-process tests because Windows denied `Get-NetTCPConnection`. The first sandboxed desktop run failed before application startup with Electron's install-directory AppContainer ACL check (breakpoint exception). Running the checks outside that restricted environment resolved both limitations without changing ACLs or disabling sandboxing. The first new editor journey then exposed an initial-focus issue; explicit focus after `showModal()` fixed it before the successful full desktop run.

## Observed behavior

The real preload/IPC, core service, Pi utility process and signed local Responses fixture exercise dialog opening/dismissal without inference, keyboard focus restoration, full oversized draft preservation, offline connection recovery, active-model selection, IME-safe submission, cancellation with prior outline preservation, numbered reordering plus content revision, `.edu/project.json` persistence and reopening after restart. Unit fixtures also cover rewrite failure, saved context on regeneration and every Pi repair turn, inherited source evidence, rejection of invented references and storage-only retry.

Reviewed Light and Dark dialog captures and a native capture at a 600×640 desktop content size with 200% zoom. The dialog remains within the viewport, its content scrolls vertically, and action buttons wrap and remain reachable. Captures are emitted by the editor journey in its `test-results` output directory.

These are protocol-fixture and native Windows checks. Live ChatGPT inference, educational quality of arbitrary change requests, macOS/Linux runtime checks and packaged distribution were not exercised for this change.
