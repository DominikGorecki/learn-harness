# ADR-0020: Playwright-owned flow references and progressive discovery

- Status: Accepted
- Date: 2026-10-05
- Scope: desktop test tooling, replaceable visual references and contributor discovery; no application runtime capability or security change.

## Context

Manually capturing a learner's running app through computer use interrupts their desktop, depends on mutable state and requires manual image replacement. The app already has real Electron Playwright journeys, isolated profiles and provider fixtures, plus normal and native zoomed screenshot capture. The user requested that these tests refresh stored references and that each flow have a progressively discoverable explanation and screenshot index.

## Decision

Keep journey implementations in `tests/desktop/` and declare stable flow/checkpoint IDs in `tests/flows/catalog.ts`. Add `ref/patterns-flow.md` as the discovery/maintenance owner and `ref/flows/<flow-id>/index.md` as each journey's explanation. Store only the latest complete passing captures per platform beneath that flow, with a generated screenshot table and manifest. AI/contributors maintain the semantic explanation and review images after changing a journey; routine runs regenerate evidence without calling an LLM.

Use a shared test fixture and awaited run-end reporter to stage captures in test output, validate complete passing journeys and replace their owned platform sets. Preserve references for failed/skipped journeys and unexecuted flows/platforms; interrupted runs publish none. Publication failures fail the command. Use stable filenames, scoped replacement, rollback and per-flow locks. Keep native Electron capture for non-default zoom, fixture-only identity/content, local-path exclusion and metadata distinguishing revision, dirty source, time, platform and capture dimensions.

Nonvisual diagnostic/packaged-worker journeys have explanations and successful-run metadata without unnecessary screenshots. CI uploads generated references without committing. Existing historical research remains dated evidence; replaceable computer-use references are superseded. This extends ADR-0004/ADR-0005's testing/discovery conventions without weakening sandboxing, preload boundaries or packaged fuses.

## Consequences

Relevant journeys and visual states can be discovered without loading the whole gallery or driving the learner's active app. Focused runs refresh only their executed passing flows; image files and capture metadata change in the working tree and can be reviewed alongside code. A screenshot still does not establish live AI access, mastery, accessibility certification or every tested branch. Separate platform sets prevent cross-platform overwrite. Flow registration/reference consistency is an explicit quality gate; narrative accuracy still requires AI/human review. Concurrent runs in one checkout and abandoned publication locks require explicit recovery, not silent deletion of another run's state.

Current rules: [flows](../patterns-flow.md), [development/testing](../patterns-development-testing.md), [documentation](../patterns-documentation.md), [design system](../patterns-design-system.md).
