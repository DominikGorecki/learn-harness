# Implementation validation

## Baseline — 2026-10-04

- Product/design baseline commit: `0922282`.
- Implementation spec commit: `a326463`.
- `npm run check`: passed; 55 tests, lint, both type scopes, production build.
- `xvfb-run -a npm run test:desktop`: passed; one real Electron demo journey on Linux.
- Pi 1.0.2 published packages inspected in a temporary research directory; no dependency is installed in the app yet.
- Live ChatGPT plan sign-in/inference: not exercised.
- Windows/macOS native execution: not exercised.

## Ticket evidence

| Ticket | Status | Evidence |
| --- | --- | --- |
| T01 | Locally validated | Signed OAuth fixture, credential/model lifecycle, account IPC and desktop panel |
| T02 | Open | Persistent project workspace pending |
| T03 | Open | Intent-to-outline generation pending |
| T04 | Open | Material understanding pending |
| T05 | Open | Integrated recovery and interaction review pending |
| T06 | Open | Full acceptance and native/live evidence pending |

## Completion audit

Pending implementation. Audit every PRD requirement and AC-01 through AC-14 against actual code, tests, runtime behavior, screenshots, saved artifacts, and live/native evidence before closing the goal.

## T01 — ChatGPT account foundation

- Pinned Pi AI/Pi Agent Core 1.0.2 and JOSE 6.2.12; npm reported zero known dependency vulnerabilities at installation.
- Implemented Learning Studio registration, issued-client reuse, PKCE, a loopback callback, JWKS signature/issuer/audience/expiry/nonce verification, separate plan permission, renewal, model discovery, and sign-out.
- Credentials use OS protected storage where supported, otherwise explicit session-only storage. This Linux automation environment uses the disclosed session-only mode; protected persistence is exercised through the encryption port in adapter tests.
- `npm run check`: passed with 92 tests, lint, both type scopes, and production bundles.
- Real Electron account fixture journey verifies signed OAuth, model discovery, safe snapshots, sign-out, and dialog focus restoration. The existing demo journey also passes.
- Visually inspected `test-results/account-account-panel-comp-371b6--signs-out-through-real-IPC/account-protocol-fixture.png`: account panel follows the neutral design direction. The background demo is intentionally replaced by T02.
- This is a local protocol fixture, not actual OpenAI authorization. Live plan usage/inference and Windows/macOS native execution remain outstanding.

## T02 — storage increment

- Added versioned portable project/outline contracts, scoped `.edu/project.json` persistence, atomic replacement with external-edit detection, and the application-local project registry.
- Core workspace operations support opening/deduplication, separate model preferences, substantial briefs, moved-folder recovery, and project-owned updates.
- `npm run check`: passed with 111 tests, lint, type scopes, and build. Tests include corruption/future versions, failed replacement, symlink boundaries, unchanged source files, two-project restart persistence, and moved folders.
- This increment does not yet expose project operations in the desktop; native IPC and the new workspace UI are the next T02 checkpoint.
