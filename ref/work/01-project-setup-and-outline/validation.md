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

## Earlier external acceptance blockers (superseded by native CI below)

- Revalidated the clean local branch after implementation commit `5023881`; a read-only remote query confirms `codex/project-setup-and-outline` has not been published.
- The available execution environment is Linux x64. Current Windows/macOS execution evidence is absent; native CI requires the branch publication that automatic approval review rejected. The user has now explicitly approved branch publication; publication and native results are being verified.
- Real ChatGPT-plan inference, representative live outline review, and protected desktop keychain restoration remain unverified. The user-controlled live check has been requested; no result has been provided.
- Local implementation and verification are complete at this checkpoint. These external conditions prevent claiming the full PRD achieved; the requirement scope is unchanged.


## Manual browser sign-in fallback

- Added **Copy sign-in link** beside **Open browser** for a pending connection. Copying reuses the same authorization attempt and confirms the copy only after the OS clipboard write completes. Browser failures point to this recovery path.
- The named main-process capability accepts no URL or clipboard payload, keeps authorization URLs out of renderer snapshots, reports sanitized clipboard errors, and rejects copying after cancellation or completion. Late clipboard completion cannot overwrite the connected account state.
- `npm run check`: passed with 126 unit tests, lint, both type scopes and production bundles.
- `xvfb-run -a npm run test:desktop`: seven journeys passed; the artifact-only test remains intentionally skipped. The new journey disables system-browser launching, copies the real pending fixture URL through IPC and the OS clipboard, follows that URL, and completes signed authorization/model discovery without another sign-in attempt.
- Visually reviewed the manual-link account panel screenshot. This establishes local clipboard/protocol behavior; actual Windows-browser/WSL clipboard and loopback routing remain user-environment checks.
- User explicitly approved publishing `codex/project-setup-and-outline` to the configured GitHub origin for native CI.

## Native CI publication and clean-install repair

- Published the approved branch at `05fc6b4`; [run 37228181858](https://github.com/DominikGorecki/learn-harness/actions/runs/37228181858) started on all three native operating systems.
- The first run exposed an incomplete lockfile: npm 11.19 required the missing optional `undici@7.30.0` entry. Added the npm-generated entry without changing any existing dependency version.
- A fresh isolated install with npm 11.19 now passes (`npm ci`, including Electron binary installation and the application postinstall). The local sandbox needed `electron_config_cache=/tmp/edu-harness-electron-cache` because its home cache is read-only. Audit reported zero vulnerabilities. Native execution results remain pending the repaired branch run.

## Native test-fixture and Windows cleanup corrections

- [Run 37228302785](https://github.com/DominikGorecki/learn-harness/actions/runs/37228302785) passed the full Linux job, including desktop journeys, AppImage packaging and packaged Pi worker verification.
- macOS temporary directories use `/var` aliases and Windows uses short user-directory paths. Some tests incorrectly passed these aliases directly to adapters that require the canonical root supplied by the workspace service. Temporary project fixtures now resolve `realpath` first; application path and symlink protections remain intact.
- Windows also exposed a real `kill-dev` no-op failure: `Get-NetTCPConnection -LocalPort` returned a lookup error after successful shutdown. Discovery now enumerates connections with error reporting enabled and filters afterward, allowing a free port to return an empty list while preserving actual discovery failures.
- `npm run check`: 126 tests, lint, types and production bundles passed after the corrections. `xvfb-run -a npm run test:desktop`: seven passed, with the artifact-only test intentionally skipped. Windows/macOS re-execution is still required.

## Native viewport fixture correction

- [Run 37228487262](https://github.com/DominikGorecki/learn-harness/actions/runs/37228487262) passed the complete Linux and macOS jobs, including unsigned packaging and packaged Pi runtime verification. Windows source checks and five desktop journeys passed, including copied-link authorization.
- Two Windows desktop assertions incorrectly expected a 600px outer window to provide 600px of content. Windows borders left 584px (292 CSS pixels at 200% zoom). Responsive tests now use `setContentSize`, preserving the exact 300px zoomed-content assertion and all overflow/accessibility checks across native window frames.
- Local `npm run check` passes (126 tests, lint, types and build); `xvfb-run -a npm run test:desktop` passes seven journeys, with the artifact-only test intentionally skipped.

## Recovery keyboard synchronization

- The next native run passed the corrected responsive journeys on Windows, then exposed an intermittent Linux recovery-test failure before its first inference request. `selectOption` had returned while the asynchronous model preference save still disabled the form, allowing the following keyboard submission to arrive too early.
- The recovery fixture now waits for the create action to become enabled before exercising both IME suppression and keyboard submission. No production guards or test assertions were removed.
- `npm run check` passes with 126 tests. The focused real Electron recovery journey passes through `xvfb-run -a npm run test:desktop -- tests/desktop/recovery.spec.ts`.

## Native acceptance checkpoint

- [Run 37228974576, attempt 2](https://github.com/DominikGorecki/learn-harness/actions/runs/37228974576), for implementation/test commit `ca25b74723fbc11d5852b328aa286edfce02474c`, is **successful on Windows, macOS and Linux**. Each job completed source checks, all seven ordinary desktop journeys, native unsigned packaging (NSIS/DMG/AppImage), and the separate packaged ASAR Pi worker check. The artifact-only test is intentionally skipped in ordinary desktop runs and then executed after packaging.
- Windows needed one unchanged job retry after its first attempt exceeded the 10-second PowerShell discovery window in a developer-tool test. The retry passed source, desktop, packaging and packaged-runtime gates. This transient runner sensitivity is recorded rather than hidden by a blanket retry policy or weaker assertions.
- Reviewed native macOS and Windows artifact screenshots for the manual sign-in panel, project workspace and long-outline 200% zoom state, in addition to the local Linux captures. Native artifacts remain attached to their workflow runs.
- The user-approved branch is published. Manual copied-link sign-in is covered through the actual clipboard and signed protocol fixture on all three operating systems. Actual WSL/Windows browser routing and live ChatGPT consent/inference still require the learner's environment and account.
- Updated the PRD status, acceptance audit, T06 ticket and README to reflect actual native execution. Remaining gates are live-plan inference and representative output review, protected OS credential restoration, and manual chooser/Windows-permission checks. The full PRD goal remains incomplete.
- Final documentation-only updates passed `git diff --check` and focused local Markdown link validation (zero missing targets). They do not change the tested application or test sources.

## Durable connection follow-up — ADR-0014

- The user reported repeated sign-in after restart and required persistent login information in the app's per-user data directory. An isolated Electron probe confirmed this WSL/Linux environment reports `encryptionAvailable: false` with backend `basic_text`; the default app profile resolves to `/home/dardawk/.config/Learning Studio`. The temporary probe profile was removed. No learner credentials were read or copied.
- Replaced the memory-only fallback with a durable, versioned `connection/chatgpt.json` envelope. OS encryption remains preferred. Without it, local credentials are unencrypted and protected by owner-only POSIX directory/file permissions, with an accurate account-panel disclosure. Windows normally uses DPAPI and inherited profile ACLs.
- Added bounded private-file reads, ownership/nonregular/symlink checks, `0700` connection directories and `0600` files on POSIX. Protected storage failures preserve the previous bytes rather than silently downgrading. Legacy encrypted files migrate, valid local files upgrade when a keychain becomes available, and sign-out clears both canonical and legacy credentials.
- `npm run check`: passed with 134 unit tests, lint, both type scopes and production bundles.
- `xvfb-run -a npm run test:desktop`: eight journeys passed; the packaged-worker-only test is deliberately skipped in this ordinary desktop command. The account journey signs in through the signed local fixture, expires only the isolated saved test credential, restarts Electron, restores and renews without a second authorization, signs out, and confirms another restart remains disconnected.
- The restart/refresh result on this host exercises the local-file fallback. The same desktop journey includes the OS-encrypted branch when a keychain is available, but Windows/macOS native runs were not repeated in this follow-up. Real-account renewal remains distinct from protocol-fixture evidence.
- Documentation links and `git diff --check` pass. Updated ADRs, focused patterns, README paths and AUTH-04 evidence; previous memory-only sessions require one fresh sign-in to create a durable connection.
