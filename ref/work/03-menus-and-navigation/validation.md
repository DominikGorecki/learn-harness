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

## Remaining qualification

Native Windows/macOS/Linux window controls, drag/resize/menu/keyboard and OS screen-reader checks are separate from renderer screenshot and fixture evidence. Record exact available-host outcomes during implementation; unexecuted mandatory scope remains unresolved.
