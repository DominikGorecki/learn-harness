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
| T03 | Locally validated | Actual Pi transport and utility-process desktop journey, saved outline, cancellation/recovery |
| T04 | Locally validated | Bounded text/Markdown snapshot, actual Pi material tools, source evidence, desktop clarification |
| T05 | Locally validated | Six Electron journeys, real storage failure/retry, worker crash, model/usage/conflict recovery and zoom |
| T06 | In progress | All 58 IDs audited; Linux checks/package/ASAR runtime pass; native/live gates remain open |

## Completion audit

See [acceptance audit](acceptance.md): all 58 functional/scenario IDs are mapped. Local Linux evidence is complete. Real plan inference, semantic output review, native Windows/macOS execution and protected OS keychain restart remain explicit open gates.

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

## T03 — worker and desktop increment

- Added the dedicated Pi utility entry, explicit environment, private credential port, timeout/exit ownership, and process termination on cancellation or settlement.
- Core generation ownership prevents duplicate runs and conflicting settings while allowing navigation. Results retain project/model/brief identity; external-edit conflicts and failed saves preserve generated work for storage-only retry.
- UI now creates an outline from the large composer, preserves input during account recovery, displays real phases/clarification, reads lesson/module plans, confirms replacement, and retains the previous saved result on cancellation.
- `npm run check`: passed with 111 tests, lint, type scopes, and production bundles including the utility entry. Eight new ownership tests cover navigation races, late results, replacement, external edits, save retry, and independent result validation.
- All three real Electron journeys pass on Linux: account, project workspace, and actual Pi utility generation via local signed HTTP/SSE. The generation journey verifies selected model, complete `.edu` save, module disclosure, cancellation and worker cleanup, and restart reopening without another inference request.
- Visually inspected the lesson/module document in the running desktop. Refine action overlap discovered by the desktop test was corrected.
- These are local fixture results. Live provider usage and native Windows/macOS execution are not claimed.

- Linux x64 unpacked packaging passed using the installed Electron distribution: `ELECTRON_BUILDER_CACHE=/tmp/edu-harness-builder-cache npx electron-builder --dir --publish never -c.electronDist=node_modules/electron/dist`. The ordinary package command reached packaging but could not write the environment’s read-only default Electron download cache. The local-distribution override avoids that environment constraint without changing app configuration.
- Inspected `app.asar`: main, outline worker, Pi Agent Core, and Pi Responses adapter are included; Electron fuses were applied. This establishes package assembly, not live inference or installer acceptance.
- Retained a visually reviewed outline screenshot at `ref/research/assets/outline-workspace.png`, explicitly labelled as test-provider content in README.

## T04 — material understanding

- Added bounded, read-only UTF-8 text/Markdown snapshots in the utility process. Scope checks, no-follow file opens, file identity checks, hidden/secret/instruction/build exclusions, and entry/depth/file/byte budgets constrain access.
- Pi receives a permitted inventory and read tool; only successfully read snapshot paths can appear as lesson sources. Core independently validates saved coverage/source relationships. Source files remain unchanged.
- Folder-only projects can infer direction; the saved result distinguishes inferred scope from a written learner brief. Unsupported-only folders request details without inference; ambiguous material can ask one question and preserve the composer.
- `npm run check`: passed with 121 tests, lint, type scopes, and production build. Material tests include nested text, exclusions, symlinks, unsupported/binary/oversize data, unreadable file permissions, traversal limits, cancelled scans, rejected path escapes, and actual-read citations.
- Four real Electron journeys pass, including folder-only generation through actual Pi list/read/submit calls, coverage rendering, clarification followed by explicit direction, and unsupported-only recovery with no inference request. Automated fixture output does not prove live curriculum quality or semantic topic inference.
- Reviewed material setup, coverage and unsupported recovery screenshots. Snapshot capture disables finite animations so evidence represents the settled interface. The clarification state now requires input and updates its label/instructions accordingly.

## T05 — recovery and interaction review

- Aligned navigation with the PRD: Stay here or Cancel and switch; await cancellation settlement. Saving completes atomically and cannot be falsely reported as cancelled.
- Kept unsaved generated output visible across unavailable-project reopening. Ordinary save retry consumes no inference. External metadata conflicts require explicit review/confirmation, reload validated state, verify portable identity, and preserve current unrelated model preference.
- Added account locking during generation, availability rechecks, discoverable keyboard shortcuts, duplicate-title folder labels, accessible completion announcements, and bounded header layout at high zoom.
- Oversized pasted descriptions remain intact in the field; a linked validation message explains the 32,000-character submission limit instead of silently truncating input.
- `npm run check`: passed with 122 tests, lint, both type scopes, and production builds. Core tests cover atomic-save cancellation rejection and confirmed conflict recovery without another provider call.
- Six real Electron journeys pass. Recovery adds actual filesystem-induced save failure and restoration, storage-only retry, unavailable model preference retention, allowance errors, account-cancel draft preservation, IME-safe submission, deliberate worker termination, stay/cancel navigation, and confirmed external-edit recovery.
- Reading coverage includes 20 lessons with long titles/text, offline saved models/outlines, 600px windows at 200% zoom, reduced motion, read-only inspection on this Linux host, and corrupt-state preservation. Windows permission semantics remain a native-platform acceptance concern.
- Visually reviewed pending generation, generated-but-unsaved, and long-outline high-zoom captures. Screenshots show real application state with deterministic local provider content.

## T06 — local acceptance audit and packaged runtime

- Mapped all 44 functional requirements and 14 acceptance scenarios in `acceptance.md`; automated ID comparison found 58/58 represented. Local Markdown links across README, AGENTS, docs and ref resolve.
- Final local source gate: `npm run check` passes with 122 tests, lint, both type scopes and production bundles. All six main Electron journeys pass; the artifact-only worker test is deliberately skipped in ordinary desktop runs and enabled through `npm run test:packaged` after packaging.
- Linux x64 package assembly passes with the local Electron distribution override documented under T03. The ordinary default-cache packaging path remains constrained by this environment’s read-only home cache.
- Actual hardened packaged app launched in an isolated XDG profile under Xvfb. It rendered the empty workspace while RunAsNode, Node options, development-renderer and fixture/profile overrides were supplied and ignored. No production fuse or sandbox setting was weakened. The owned process group and temporary profile were cleaned up. Screenshot reviewed and retained at `ref/research/assets/packaged-linux-workspace.png`.
- Read the binary fuse wire: RunAsNode, Node options, Node CLI inspection and extra file-protocol privileges are disabled; ASAR-only loading and integrity validation are enabled.
- `xvfb-run -a npm run test:packaged` passes: the actual packaged ASAR worker loads Pi dependencies, performs list/read/submit HTTP/SSE against the local fixture, and returns verified source coverage. A development host supplies automation; this is distinct from the hardened-app startup check above.
- `npm audit --omit=dev --audit-level=high`: zero reported vulnerabilities.
- Audit improvements: the composer always discloses possible folder-material transmission, including files added after initial opening; the learning prompt explicitly avoids treating sophisticated material as evidence of learner proficiency.
- Native CI now retains desktop captures even on success and checks the packaged worker after target-OS packaging. Actual current Windows/macOS runs are still required.
- Requested user-controlled live sign-in/inference feedback asynchronously. No real credentials were accessed or fabricated, and no live provider success is claimed.

## T06 — known-project identity regression fix

- A focused follow-up audit reproduced two failures: missing metadata for an initialized project appeared as a fresh writable project, and a preference mutation after a detected identity mismatch could adopt another project’s metadata.
- Centralized known-identity validation across activation, metadata mutation and generation preparation. Missing or different project identities now require recovery. This also protects operations after restart when no loaded-project cache exists.
- Two regression tests failed before the fix and pass afterward; they verify byte preservation and successful recovery after restoring the original metadata. The real desktop reading journey additionally checks missing-metadata recovery without initialization.
- `npm run check`: passed with 124 tests, lint, both type scopes and production bundles.
- All six desktop journeys pass, including the new recovery case; the artifact-only test is intentionally skipped in this ordinary desktop command. Linux package assembly and hardened packaged startup also pass after the fix.
- Native CI publication remains pending explicit user approval after automatic review rejected the branch push. No remote publication or live ChatGPT inference has occurred.

## External acceptance blockers

- Revalidated the clean local branch after implementation commit `5023881`; a read-only remote query confirms `codex/project-setup-and-outline` has not been published.
- The available execution environment is Linux x64. Current Windows/macOS execution evidence is absent; native CI requires the branch publication that automatic approval review rejected. Explicit publication approval has been requested and has not been received.
- Real ChatGPT-plan inference, representative live outline review, and protected desktop keychain restoration remain unverified. The user-controlled live check has been requested; no result has been provided.
- Local implementation and verification are complete at this checkpoint. These external conditions prevent claiming the full PRD achieved; the requirement scope is unchanged.
