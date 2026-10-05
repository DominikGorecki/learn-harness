# Topic editing and project file access validation

Date: 2026-10-04. Host: native Windows. Governing decision: [ADR-0019](../ADRs/ADR-0019-topic-edits-and-project-file-access.md).

Implemented a topic edit icon/dialog, independent topic drafts, one-lesson result localization, matching root-folder plans, whole-project text-file tools and staged/recoverable file publication. Existing unrelated workspace changes were preserved.

## Executed checks

- `npm run check`: passed on the final code. ESLint, 188 unit tests, both TypeScript scopes and all production bundles passed. Three existing Windows exclusions skipped POSIX credential permissions, a POSIX log-directory link check and a POSIX unreadable-material scenario.
- `npm run test:desktop`: 13 passed, one packaged-worker test skipped because no ASAR was supplied. This exercised native Electron/account/appearance/projects/materials/generation/recovery/editor/logging journeys against the local signed HTTP/SSE fixture. It ran before the final conflict-cleanup and draft-preservation refinements.
- `npm run test:desktop -- tests/desktop/topic-edit.spec.ts tests/desktop/recovery.spec.ts tests/desktop/materials.spec.ts`: three passed after the file-conflict cleanup and access-disclosure changes.
- `npm run test:desktop -- tests/desktop/topic-edit.spec.ts tests/desktop/outline-edit.spec.ts`: two passed on the final editor code, including preservation of another topic's unsent draft after saving the selected topic.
- `git diff --check`: passed.

Initial sandboxed Vitest startup could not create its Vite temporary configuration (`EPERM`). The required commands passed with normal approved filesystem permissions; no application security setting was relaxed. An intermediate lint failure in the first draft-cleanup implementation was fixed by handling backend save notifications in a subscribed callback.

## Evidence and limits

The topic desktop journey drives the actual Pi agent in its utility process. It reads another topic as context, stages edits to existing topic notes and a new nested history file, cancels without publishing files, then saves and reopens the revised topic. A deliberately overbroad fixture proposal changes the project title/outcomes, reorders lessons and changes another topic; independently localized saved output preserves those fields and the other topic's bytes. Selected-model requests, bounded input, IME-safe submission, focus restoration and independent drafts are checked.

Unit coverage includes forged requests/results, missing/stable topic IDs, out-of-topic writes, general project-wide content saves, ambiguous/shared/linked folders, changed-file preservation without a leftover journal, save compensation and storage-only retry. Simulated interruption before and after the outline commit verifies recovery; unknown external bytes retain the recovery record. Confirmed outline conflicts apply only the topic onto latest unrelated content/goals.

Actual isolated screenshots in Playwright `test-results` were reviewed in Light, Dark and at 200% zoom/narrow size. The editor stays within the viewport and scrolls to its primary action. Test artifacts are ignored and contain fixture learning data only.

No live account inference, macOS/Linux run or new package build was performed for this change. Fixtures prove process/tool/storage behavior, not a live model's interpretation or educational quality. Tools currently create/edit bounded UTF-8 text; binary authoring, execution, deletion and tutoring sessions remain outside this slice.
