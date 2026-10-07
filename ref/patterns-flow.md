# Flow patterns and reference index

Governed by [ADR-0020](ADRs/ADR-0020-playwright-flow-references.md), extending [ADR-0004](ADRs/ADR-0004-quality-gates-and-native-packaging.md) and [ADR-0005](ADRs/ADR-0005-progressive-pattern-and-adr-discovery.md); local contributor commits follow [ADR-0021](ADRs/ADR-0021-automatic-local-commits.md).

For behavior or UI work, choose the relevant journey below, read its `index.md`, and open only the screenshots needed for the task. Follow its test/source links for implementation evidence. [Design system](patterns-design-system.md), [UX](patterns-ux.md) and [renderer](patterns-renderer.md) remain the governing UI rules. A screenshot shows an observed state, not permission to add a feature or proof of live-provider access. Under [ADR-0022](ADRs/ADR-0022-shared-pi-streaming-lifecycle.md), all inference uses the same workbench panel. The [real long-stream](flows/ai-streaming/index.md), [candidate repair](flows/ai-streaming-repair/index.md), producer/recovery journeys and [packaged profiles](flows/packaged-worker/index.md) supply complementary evidence; use the [bundle validation](work/02-ai-streaming/validation.md) for exact timing, commands and limits. Preserve reporter ownership of generated tables and keep approved design images separate.

## Flow index

| Flow | Read when |
| --- | --- |
| [Account connection](flows/account-connection/index.md) | Authorization, credential renewal, model discovery, sign-out and restart |
| [Manual sign-in](flows/manual-sign-in/index.md) | Browser-opening failure and copied sign-in link |
| [Appearance](flows/appearance/index.md) | Light/Dark settings, surfaces, radio keyboard behavior, preference persistence |
| [Navigation](flows/navigation/index.md) | Shared history, restoration, application commands and compact title strip |
| [Projects](flows/projects/index.md) | Folder opening, goals/models, drafts, navigation, relinking and responsive setup |
| [Outline generation](flows/outline/index.md) | Explicit inference, saved outline, disclosure, cancellation and restart |
| [Outline editing](flows/outline-edit/index.md) | Whole-path requests, editor drafts, rewrite cancellation and replacement |
| [Topic editing](flows/topic-edit/index.md) | Topic draft isolation, owned-file publication and preservation of other topics |
| [Materials](flows/materials/index.md) | Folder-only setup, source coverage, clarification, unsupported files |
| [Recovery](flows/recovery/index.md) | Pending/unsaved results, storage retry, usage limits, worker loss, conflicts |
| [Topic reading](flows/topic-reading/index.md) | Authoritative saved topics, stable history, current-content fallback and reading restoration |
| [Reading](flows/reading/index.md) | Offline long outlines, narrow/zoomed layout, missing/corrupt/read-only state |
| [Model access](flows/model-access/index.md) | Extra model options, independent optional tests, session verification |
| [Diagnostics](flows/diagnostics/index.md) | Nonvisual safe main/renderer/preload logging assertions |
| [Inference diagnostics](flows/inference-diagnostics/index.md) | Nonvisual model/utility transport and request-correlation assertions |
| [Long AI streaming](flows/ai-streaming/index.md) | Real ≥200-second receiving, bounded burst delivery, truthful checking and saving |
| [Structured repair](flows/ai-streaming-repair/index.md) | Provisional candidate replacement across provider turns and independent acceptance |
| [Packaged worker](flows/packaged-worker/index.md) | Nonvisual ASAR worker/dependency verification after packaging |

## Ownership and automatic refresh

Tests remain in `tests/desktop/`. The stable catalog is [tests/flows/catalog.ts](../tests/flows/catalog.ts); each desktop test imports the [flow fixture](../tests/flows/fixture.ts), declares one `flow` annotation and matching `@<flow-id>` tag, and captures cataloged checkpoints through `flow.capture(desktop, page, '<checkpoint-id>')`. One journey owns one flow directory, even when two journeys share a spec file. Nonvisual journeys declare an empty capture catalog and explain their assertions without decorative screenshots.

Every ordinary Playwright run using [the project configuration](../playwright.config.ts), including focused runs and CI, stages captures in ignored `test-results/`. The [reporter](../tests/flows/reporter.ts) publishes completed passing journeys at run end into `ref/flows/<flow-id>/screenshots/<windows|linux|macos>/`, replacing that platform's entire set, removing retired images and updating the generated section of its `index.md`. Passing flows can refresh even if another test fails. Failed, skipped and interrupted journeys retain their previous references; an interrupted run publishes none. The packaged-worker flow normally skips and refreshes only through `npm run test:packaged` after packaging.

The manifest records capture time (UTC), platform, source HEAD and whether source changes were present, test SHA-256, PNG digests/dimensions, viewport, theme, zoom and capture method. Source changes include uncommitted tests; HEAD alone does not identify an uncommitted build. A capture is fixture evidence and is not a visual snapshot-comparison baseline. Read the recorded age and coverage limits; unexecuted platforms/checkpoints are not newly verified.

The recorder captures renderer content directly without foreground mouse driving or native OS chrome. Normal captures use Playwright with animations disabled and local absolute-path elements masked; zoomed captures use Electron `webContents.capturePage()` and require local paths to be collapsed. Use sample goals, projects and fixture account identity, never a live learner profile. Captures do not alter application security or require live inference. Existing tests own their isolated project/profile cleanup.

Publication validates completeness and PNG digests before replacing a reference set. A per-flow exclusive lock prevents overlapping runs from losing index changes. A publication error fails the command; it must not silently claim refreshed references. After an interrupted publisher process, inspect that no run still owns `.capture.lock` before removing that exact lock file and rerunning. Do not remove screenshots preemptively: the publisher handles replacement and rollback. Do not run concurrent capture commands in the same checkout; separate CI platform jobs have separate checkouts. CI uploads generated references with diagnostic artifacts and does not commit them.

## Creating or changing a flow

1. Read this index, the relevant flow's `index.md`, its selected screenshots, governing patterns and test/source. Explain the journey's starting conditions, observable outcomes, meaningful failure/recovery branches and exact assertion scope.
2. Choose a stable lowercase hyphenated flow ID. Add or update its catalog entry, owning spec filename and stable checkpoint IDs/captions. Create `ref/flows/<flow-id>/index.md` if needed, with purpose, starting conditions, ordered journey/assertions, run command, evidence limits and one `<!-- flow-captures:start -->` / `<!-- flow-captures:end -->` block. Preserve unrelated prose and historical research. The runner creates platform capture directories automatically.
3. Create/update the actual E2E test using the shared fixture, one flow annotation and matching tag. Keep real bridge/backend assertions and the existing sandbox/process boundaries. Place each capture after the assertion that establishes its intended state. Use consistent window content dimensions, theme and zoom for matching views; the manifest records the actual values. Do not replace a journey with CSS/DOM simulation just to obtain a screenshot.
4. Run the affected flow, for example `npm run test:desktop -- tests/desktop/topic-edit.spec.ts --grep "@topic-edit( |$)"`. Use `npm run test:desktop` for all ordinary journeys. No LLM is required for routine regeneration; do not replace the configured reporter with a CLI `--reporter` override, because that omits publication. On headless Linux use `xvfb-run -a`.
5. Open the newly generated relevant PNGs and inspect layout, visible state and synthetic content. The tests update the screenshot table and metadata automatically; the AI/contributor updates the narrative above the generated block to match the tested sequence, assertions, recovery behavior and limits. Keep captions in the catalog aligned with checkpoint behavior. Do not hand-edit the generated block or claim a skipped/failed run refreshed it.
6. Add/update the global flow table here when introducing or changing a discovery entry. Link to the flow from relevant patterns when useful; avoid embedding every flow's details or images in the main index. Retiring a flow requires removing its test registration, catalog entry, index row and owned directory together; do not delete historical research assets.
7. Run `npm run test:flows` to check catalog/discovery links, registration, generated tables, manifests, PNG digests and obsolete/missing files. Code changes also require `npm run check`; changes to desktop journeys require the relevant/full desktop checks under [development/testing](patterns-development-testing.md). Review the changed-file list and `git diff --check`, and report exactly what ran. Include reviewed, task-owned refreshed references in the [automatic local commit](patterns-development-testing.md#automatic-local-commits); the reporter and CI continue to publish artifacts without creating Git commits.

The previous manual computer-use gallery under `ref/screenshots/current/` is superseded by these flow references. Historical appearance research and design explorations remain separate and dated. The [initial validation record](research/flow-reference-validation.md) distinguishes actual Windows results from unexecuted platform/packaging targets.
