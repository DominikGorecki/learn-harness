# Application menus and navigation — implementation validation

Status: In progress
Implementation started: 2026-10-06
Branch: master
Starting revision: 9e2bb14904da1849b8497e64e1694b5d337d3ab2

The coordinator owns this record, ticket acceptance and commits. [Spec](menus-and-navigation.spec.md), [ticket map](menus-and-navigation.tickets.md) and eventual acceptance record define full scope. Baseline unrelated work: untracked `docs/design/component-designs/02-project-overview/project-overview-sheet-04-prompt.md`; preserve it and subsequent independent design edits.

## Preparation

Read spec and current source/guidance. No existing tickets belonged to this bundle. Created T01-T04 under authorized spec-implement preparation; all R01-R16 have owners and an acyclic dependency graph. Runtime and native evidence remain unverified at this point.

## Actual checks and accepted commits

Preparation commit: `67165c0` (`docs: plan menus and navigation implementation tickets`). The explicit user request to commit existing changes includes the complete ticket set now; later implementation commits retain their own ticket completion evidence.

T01 accepted after coordinator review of the pure modules, tests, ADR-0024 and affected indexes/patterns. Worker: `/root/history_foundation`, GPT-6.1 Sol, high reasoning. Runtime activation is still pending.

- Initial worker check encountered `EPERM` while Vite created a temporary config file; no failed application test was reported. The permitted elevated retry passed.
- Worker `npm.cmd run check`: 26 test files passed; 300 tests passed, 3 skipped. Lint, flow references, both type scopes and production build passed.
- Coordinator `npm.cmd exec -- vitest run tests/unit/navigation-history.test.ts tests/unit/navigation-transaction.test.ts`: 2 files, 18 tests passed.
- Coordinator fresh `npm.cmd run check` on 2026-10-06 before the T01 commit: passed with the same 26 files / 300 passed / 3 skipped; lint, flow references, both type scopes and production bundles passed.
- Coordinator relative-link check: 185 links verified across ticket/acceptance/validation documents and affected guidance. `git diff --check` passed.

No desktop gate was run for unused pure modules and documentation; process/UI activation in later tickets requires it. The unrelated project-overview work advanced master through `8eaa710` and was preserved. The T01 implementation commit carries this evidence; its exact SHA is available from the branch history.

## T02 accepted native adapters

Worker: `/root/native_menu_bridge`, GPT-6.1 Sol, high. Prerequisite T01: `a123ed6`. Coordinator reviewed all source/tests and independently confirmed the 10 menu boundary tests. Read-only review found no remaining authorization/membership/popup defect after corrections.

- Final `npm.cmd run check`, session 26211: exit 0; 27 files, 310 tests passed / 3 skipped; lint, flow references, both type scopes and production build pass.
- Full `npm.cmd run test:desktop`, session 97800: exit 0; 15 passed / 1 packaged-only skip in 6.1 minutes. Actual receiving lasted 200,504 ms, with 56 bridge frames and one burst preview; fixture evidence does not establish live account access.
- Final focused `npm.cmd run test:desktop -- --grep 'real folders, project preferences'`, session 81023: exit 0, 1 passed after macOS label/mnemonic and fragment-readiness corrections. Those corrections have fresh code/focused bridge evidence; fresh cumulative desktop validation follows T03/T04 integration.
- Coordinator `npm.cmd exec -- vitest run tests/unit/application-menu.test.ts`: exit 0, 10 passed.
- Initial lint/type issues were fixed; Vite temporary-config EPERM required permitted elevation. `git diff --check` passed.
- All 26 changed Windows PNGs were reviewed by the coordinator/reviewer with no actionable layout/content issue; 15 flow index/manifest pairs refreshed. The coordinator updated the project-flow explanation and explicit renderer/native evidence limits.

Native title-strip options remain unused until T03. Fixed command subscriptions strip events/filter malformed values and unsubscribe. New-document load clears menu readiness; skip-link fragment and child-frame navigation preserve it. All fixture apps, servers, extra webContents and profiles were cleaned; the user app was untouched. Branch master advanced independently through documentation-only `4b2a59e`; those additions were inspected and preserved. The T02 commit carries this evidence; record its SHA in later integration evidence rather than embedding its future SHA here.

## T03 locally verified implementation

Worker: `/root/navigation_integration`, GPT-6.1 Sol, high; prerequisites `a123ed6` and `e220926`. Coordinator and `/root/integration_review` reviewed the actual diff and all 52 published Windows PNGs. Review found and resolved same-identity recovery focus, repeated menu-entry origin and keyboard native-editor focus issues. No actionable source/visual finding remained in that review.

- Final frozen-source `npm.cmd run check`, session 27446: exit 0; 28 files / 321 tests passed / 3 skipped, lint, flow references, both type scopes and production build pass.
- Final frozen-source full `npm.cmd run test:desktop`, session 78527: exit 0; 16 passed / 1 packaged-worker skip in 6.1 minutes. Publication and reference integrity passed. Actual receiving lasted 200,513 ms; latest bridge delivery was 133 ms, with 57 bridge frames and one burst preview. Fixture evidence does not establish live account eligibility.
- Coordinator `npm.cmd exec -- vitest run tests/unit/navigation-controller.test.ts tests/unit/navigation-history.test.ts tests/unit/navigation-transaction.test.ts tests/unit/flow-references.test.ts`: exit 0; 4 files / 33 passed. Initial sandbox execution of the earlier navigation-only run hit Vite temporary-config EPERM; the permitted elevated retry passed 24 tests.
- Coordinator post-publication `npm.cmd run test:flows`: exit 0. Relative-link check verified 170 links in 21 task Markdown files; final image review covered all 52 published PNGs. `git diff --check` passed before staging.
- Actual navigation proves traversal/branch/current no-op/chooser cancellation, project-isolated stable disclosures and main scroll/focus, retained oversized goal drafts, current-content fallback, repaired same-identity recovery, modal/IME/editing scope and compact control hit tests in both themes. Native owning popup Select All callback and single keyboard edit/Undo pass; OS row selection is not inferred.
- Inference Saving and storage-only retry Saving reject the departure and do not resume it after settlement; fresh navigation succeeds. The long-stream traversal leaves the fixture inference count at one, while save retry stays storage-only.

The initial integrated suite exposed a real minimum-window reading-region regression; focused validation also found inadequate preview space. Compact 32-pixel title/context rows and a 36-pixel bottom rail retain 32-pixel controls and pass the existing reading, preview, painted-prose and overflow checks without weakening them. Failed focused editing probes were corrected for Electron's normalized role/callback signature and Undo grouping before final verification.

Two passing capture publications hit transient Windows EPERM renames. The test-only publisher now retries only Windows EPERM/EBUSY, six attempts and 750 ms total, and preserves its ownership/link/lock checks, complete-set replacement and rollback. Five injected transient-success/exhaustion/nonretryable cases pass; final publication required no manual stale-reference substitution.

An early editing probe attempted text-only clipboard read/restore. It recorded no prior formats and its exact mutation is unconfirmed, so possible nontext clipboard effects cannot be excluded; no clipboard contents were emitted. The final test contains no clipboard API access. The coordinator disclosed this limitation to the user.

All fixture apps, servers and profiles were cleaned. Two precisely verified failed-probe roots were removed individually; no test-owned Electron process, navigation profile or capture lock remained. The existing user app and its children were preserved. Independent master commit `2169435` contains only logo design artifacts and was inspected/preserved. T03 is a locally verified implementation, not whole-bundle closure; T04 and required native/manual scope remain open.

## Remaining qualification

### Partial native Windows evidence after T03

T03 is committed as `59ad994`. On 2026-10-06 the coordinator used the installed computer-use skill and `@oai/sky` for actual Windows input/capture against a uniquely titled isolated production-build window (Electron 44.5.1, 125% display scaling). No input targeted the existing user app. The [native Windows record](evidence/windows/index.md) retains six reviewed JPEGs, their dimensions/digests/source revision, exact actions and limits separately from renderer flow references.

Confirmed: full-width Light/Dark strip and native controls; title-space double-click maximize/restore; native File popup via F10/Down and Escape focus return; View mnemonic and actual Down/Enter popup-row activation of Toggle sidebar; Ctrl+comma Appearance and Dark overlay update; native maximize/minimize, activation restore, F11 full-screen entry/exit and native Close followed by verified process exit. Only settled synthetic fixture images were retained. No clipboard API/role or inference was used.

Drag attempts yielded no reliable position-change proof; native resize/system-menu movement, clean restore-button input, focused Edit row selection/all accelerators/About, minimum-window/200% native control safe areas and OS screen-reader behavior remain unverified. An occluded restore-button input reported an error; a subsequently restored state does not establish that action's clean success. The initial Node REPL launch timed out with no owned Electron process remaining; a normal Node desktop-fixture environment launched successfully. An initial capture approval timeout recovered through fresh selection/retry. These are explicit observation limits, not passed checks.

All owned processes/helper files and both exact temporary profile roots were cleaned; Temp containment and reparse-point checks preceded recursive removal. Process inspection confirmed the original user app and its children were preserved.

### T04 maintained-contract audit

Read-only `/root/t04_audit`, GPT-6.1 Sol/high, inspected R01-R16 against actual source/tests at `59ad994`. It found no demonstrated source defect, but identified focused remaining evidence gaps: controller-integrated API rejection/rapid/stale command handling, relink/rename through retained history, held cancellation cleanup through traversal, explicit no-history save/model/editor assertions, diagnostic history traversal and immediate saved-byte stability after traversal. Those regressions and fresh cumulative gates remain T04 work; unit/platform-option evidence alone does not close them.

The same worker completed a bounded maintained-documentation assignment across 15 files describing already implemented behavior and existing tested flows. The coordinator inspected the actual diff/source, preserved ADR adoption context, reviewed all six retained native images and updated the task-owned ledgers. README, both indexes and constrained patterns now agree on runtime implementation and unresolved qualification; flow prose describes the actual Select All callback, Saving barrier and inference-count assertions without inventing stronger checks.

Coordinator `npm.cmd run test:flows` passed (exit 0). A task-scoped check verified 316 relative file links in 21 Markdown documents and all six native JPEG digests/file formats. `git diff --check` passed; source/tests and generated flow-capture blocks were unchanged. Code/full desktop gates were not rerun for this documentation/evidence-only change; T04 regression changes and fresh final cumulative gates remain required. The coordinator owns this record, native evidence and ticket lifecycle. Updating current capability wording does not mark T04 or the bundle complete.

Matching-host/manual-record availability for macOS/Linux and screen-reader qualification has been requested while independent Windows work continues.

Native Windows/macOS/Linux window controls, drag/resize/menu/keyboard and OS screen-reader checks are separate from renderer screenshot and fixture evidence. Record exact available-host outcomes during implementation; unexecuted mandatory scope remains unresolved.
