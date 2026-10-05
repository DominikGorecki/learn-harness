# Flow reference validation — 2026-10-05

Validated the tooling in [ADR-0020](../ADRs/ADR-0020-playwright-flow-references.md) on Windows using Node 26.10.0, Playwright 1.63.0 and Electron 44.5.1. [Flow patterns](../patterns-flow.md) own the refresh/maintenance procedure. No application runtime code or security configuration changed.

- `npm run check`: passed lint, 195 unit tests (3 platform-dependent skips), registration/reference validation, both TypeScript scopes and production builds.
- `npm run test:desktop`: passed 13 journeys; packaged-worker skipped because this ordinary run has no packaged ASAR input. Published 30 Windows PNGs and 13 successful-run manifests, with test/source/image metadata and generated index tables. No Linux/macOS run or new package build was performed.
- Publication unit tests covered whole-set replacement and retired images, preservation of authored prose/other platforms, incomplete/corrupt captures, overlapping locks, failed/skipped/interrupted journeys, final retry selection and explicit command failure on publication errors.
- The initial desktop run rejected the projects zoom capture because a closed folder disclosure retained a bounding rectangle. The recorder now restricts that path selector to open disclosures. The full rerun passed, and passing journeys in the earlier partly failed suite had correctly published independently.
- Visually inspected one representative PNG from each of the 11 visual flows, including Light/Dark panels, saved/unsaved outlines and native zoom captures. Zoom and internally scrolling views are viewport evidence; each flow describes its coverage limits. Fixture identity/content is synthetic. PNG checks validate every stored digest/dimension and screenshot table.

The sandbox initially denied Vite's temporary configuration write under `node_modules/.vite-temp`. Project checks and Electron launches completed through the approved execution path with normal application sandboxing retained. Superseded replaceable JPGs in `ref/screenshots/current` were removed after successful capture publication; historical research/design assets and unrelated contributor changes were preserved.

These are UI reference captures, not pixel-comparison baselines or live-provider evidence. Routine tests update images/tables; contributor/AI review maintains journey prose. The packaged-worker flow retains its unexecuted placeholder until `npm run package` and `npm run test:packaged` succeed.
