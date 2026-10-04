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
| T02 | Locally validated | Atomic project storage, native folder IPC, responsive workspace, restart/relink desktop journey |
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

## T02 — desktop workspace increment

- Retired the original fixture course/session runtime and demo-specific tests; retained the platform boundaries. ADR-0009 records portable project ownership and recovery.
- Implemented native folder selection, cancellation/relink, dashboard/project navigation, independent model preferences, substantial learning-goal drafts, and saved-outline rendering.
- Real Electron journeys pass for signed account connection and project open/save/model selection, separate drafts, restart persistence, missing-folder relink, keyboard focus, 600px navigation, reduced motion, and 200% zoom. Opening an empty project leaves its folder untouched.
- Visually reviewed the normal and narrow workspace plus native Electron capture at 200% zoom. Playwright screenshot capture at non-default Electron zoom cropped to CSS dimensions; native `capturePage` records the actual window. Layout assertions check both main and containing workspace overflow.
- Current workspace screenshot is retained at `ref/research/assets/project-workspace.png`. Provider/profile names in this image belong to a local test fixture.
- `npm run check`: 82 current tests pass, lint, type scopes, and production build. The count decreased because 29 retired demo-specific tests were removed; the project/backend/security/account tests remain.
- Full milestone generation, live ChatGPT inference, and native Windows/macOS verification remain pending.

## T03 — Pi engine increment

- Added the educational prompt grounded in `docs/socratic-learning.md`, bounded tool schemas, independent outline validation, and actual Pi Agent Core/Pi AI Responses transport.
- Requests use the selected model and explicit delegated token; whitelist plan-supported fields, group tools under the learning namespace, and send developer instructions. API-key credentials and arbitrary remote endpoints are rejected.
- A successful terminal event is required before tool effects. Incomplete/missing/failed streams cannot produce accepted results. Requests, responses, turns, and elapsed time are bounded; no automatic provider retries or coding tools are enabled.
- `npm run check`: passed with 103 tests, lint, both type scopes, and build. Twenty-one additional tests exercise real HTTP/SSE through Pi, argument repair, source fabrication rejection, clarification, cancellation, timeout, error classification, and malformed outlines.
- This engine is not yet exposed by the desktop; utility-process ownership, generation IPC, and UI follow in the next T03 increment. Local streamed fixtures are not live ChatGPT inference evidence.
- Protocol reference checked 2026-10-04: [models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) and [preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).
