# Main-workspace implementation validation

Status: In progress — no bundle-completion claim.
Started: 2026-10-07. Branch: master. Starting HEAD: d258a6d7ed5b869ec0cad2faa280e7c6915e84fc. Baseline index/worktree clean.

## Schedule and ownership

Four source-linked tickets cover R01–R18. Dependencies are acyclic: T01 → T02/T03 → T04. One mutating worker runs at a time in this shared checkout; the coordinator reviews, validates, updates records and commits before releasing dependents.

| Ticket | Dependency | Role / model / effort | Reason | Validation |
| --- | --- | --- | --- | --- |
| T01 | None | Frontend, gpt-6.1-sol, high | Scoped CSS, complete form states and the durable boundary require careful visual integration. | Code gate, projects/appearance desktop, reviewed captures |
| T02 | T01 | Frontend/navigation, gpt-6.1-sol, high | Stable topic resolution interacts with transaction races, restoration and AI ownership. | Code gate, topic/history/offline/edit/AI desktop |
| T03 | T01 | Branding/packaging, gpt-6.1-sol, high | One vector construction must supply verified native resources without weakening hardened packaging. | Code, desktop, exports, Windows package/ASAR evidence |
| T04 | T01–T03 | Documentation, gpt-6.1-sol, medium; coordinator acceptance | Canonical guidance must reflect final consumers and honest qualifications. | Links, fresh integrated code/full desktop/flows, contrast/visual review |

Read-only workspace_audit (gpt-6.1-sol, high) examines navigation hazards. Workers follow delegated spec-implement-ticket; primary owns records/statuses/commits. Existing unrelated agents are not assigned implementation work.

## Evidence

Baseline discovery verified the integrated bundle 03 controller and existing local acceptance; its unresolved native qualifications remain separate. Planning references are selected designs, not delivered captures.

Actual checks and acceptance results will be appended per ticket and at final integration. Native macOS/Linux, live-provider and OS screen-reader checks cannot be inferred from Windows renderer fixtures.

## T01 — accepted foundation

Worker workspace_foundation used gpt-6.1-sol/high. Primary inspected all source/new files, scoped selectors, ADR/index/initial canonical guidance and all nine actual projects/appearance PNGs; compared panel composition and confirmed excluded-region CSS and navigation unchanged.

- Worker and fresh primary npm run check: passed; lint, 28 unit files, 321 tests passed/3 skipped, flows, both type scopes and build.
- Worker npm run test:desktop -- tests/desktop/projects.spec.ts tests/desktop/appearance.spec.ts: final 2/2 passed, normal Electron sandbox/context isolation retained.
- Composer label/action/focus endpoint minima: Light 5.455/6.297/5.571; Dark 7.195/6.950/5.557. Real gradient-disabled opaque fallback retains draft/action focus; 200% Create target hit test and reduced motion passed.
- 176 local links resolve; git diff --check passed.
- First sandbox Vitest attempt failed EPERM before tests ran; authorized execution passed. A test-only DOM type reference was fixed before final checks. No application security weakening.

R01/R02/R11–R14 foundation covered; outline/topic, active dock, branding and final consumer/evidence coverage remain later tickets. Native/manual screen reader, IME and other hosts are unrun qualifications, not inferred from these captures. Fixture-owned processes/profile/provider cleaned up.

T01 commit: 15802600833d551f31cf00466a7fd9b3a81b13f9.

## T02 — accepted saved reading and navigation

Worker topic_workspace (gpt-6.1-sol/high); two read-only reviewers inspected navigation/AI races and 26 selected/runtime images. Primary inspected source/new files and actual overview/topic/read-only/editor/minimum Receiving/Saving images.

- Worker and independent primary npm run check: passed; 28 unit files, 324 tests passed/3 skipped, lint/flows/types/build.
- Final frozen-source npm run test:desktop -- tests/desktop/topic-reading.spec.ts tests/desktop/navigation.spec.ts tests/desktop/reading.spec.ts tests/desktop/outline.spec.ts tests/desktop/outline-edit.spec.ts tests/desktop/topic-edit.spec.ts tests/desktop/recovery.spec.ts tests/desktop/model-test.spec.ts: 8/8 passed (1.8m). Final test:flows and diff check passed.
- Non-first recommendation, full saved reading, exact original/final bytes, no inference, 40 topics, rename/deletion/Forward, per-destination scroll/disclosure/focus, edit trigger return, disappearing editor topic and held real-selection subscription/reply gap covered.
- Real operation/file fixtures preserve owner/request count/bytes during Receiving, Cancelling and Saving; dashboard/other-project guards and storage-only retry remain. Distinct proposed result disables its reading commands; saved history remains readable. Create-outline request recovery now navigates to the retained input through the shared controller.
- Minimum 600x480 at 200% Receiving and Saving retain a fully painted/hit-testable >=32px Back to outline. Central short-height commands reduce from 40px to 32px and contextual header stays 32px; dock/chrome/panels remain unchanged.
- Opaque endpoint contrast lower bounds (primary/secondary/muted/action/focus): Light 13.47/5.09/4.66/5.88/5.20; Dark 11.80/6.42/5.28/6.20/4.96. Final composed-state contrast review remains T04.

Review resolved two race/recovery defects and the minimum-size geometry failure before the final passes. Read-only renderer coverage is an explicitly typed main-sent fixture over real files, not Windows ACL evidence. The model-test dashboard PNG privacy mask crosses part of its dock header; use other captures/assertions for that header. Native ACL/screen-reader/IME/other-host/live-provider qualifications remain unrun. Owned wrappers/barriers/apps/profiles/projects were cleaned. R03–R10 and outline/topic R11–R14 are locally accepted; whole-bundle coverage/branding remains T03/T04.

T02 commit: 7bee459ac5e6e5c42ca1a1ac3b76736a9a365aed.

## T03 — accepted identity and native resources

Worker branding (gpt-6.1-sol/high) supplied one editable three-path master, generated currentColor renderer geometry and deterministic native tile exports. Primary inspected source and actual previews/runtime images. Existing brand text, slot dimensions, functional icons, app identity/profile, ASAR/fuses and protected process boundaries remain unchanged.

- Final worker npm run check passed: 29 suites, 327 passed/3 skipped, lint/flows/types/build. Appearance/navigation desktop passed 2/2. Windows x64 npm run package passed; npm run test:packaged passed 1/1 for outline/Sol/Luna ASAR workers.
- npm run branding:check passed actual repeated render digests and alpha/padding/container audits. Final worker and independent primary npm run branding:package passed: fixed 256px runtime PNG, extracted actual ASAR main and executable RT_GROUP_ICON group 1 with all seven 16/24/32/48/64/128/256px PNG frame hashes match.
- Independent read-only Pillow metadata audit confirmed all RGBA exports, alpha 0..255, PNG dimensions, seven ICO/ICNS representations and transparent padding of 1/1/2/3/4/9/19/39/79px at 16/24/32/48/64/128/256/512/1024px. Three high-opacity cores survive at all reviewed glyph sizes. Partially painted edge merging at small sizes is explicitly recorded in the asset README; no claim of complete alpha disconnection is made.
- Actual built Learning Studio.exe was reviewed in Windows Explorer Details and Large icons; selected mark appeared correctly. The initial Explorer capture timeout/minimized state was resolved before review. No learner profile or packaged GUI was opened. Subsequent runtime/window/taskbar qualification was stopped when the user ended computer use and remains unrun. The owned isolated helper/profile was cleaned and the Explorer window restored.
- Initial default export helper exited 2147483651 and default code check failed before tests with EPERM realpath. Reviewed normal-host execution passed with sandbox/context isolation/network denial intact. No application security weakening. Diff check passed.

Reproducibility is qualified on the pinned Windows Electron/Chromium runtime. macOS/Linux packaging, Dock/launcher/platform masks, signing/installers, cross-host byte identity, native screen-reader/IME and live-provider qualifications remain unrun. The user requested Playwright for frontend checks going forward; remaining renderer acceptance follows isolated Playwright Electron fixtures. R17/R18 and the R01 brand-only exception are locally accepted with these named limits.
