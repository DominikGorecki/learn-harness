# Development and testing patterns

Governed by [ADR-0021](ADRs/ADR-0021-automatic-local-commits.md), [ADR-0020](ADRs/ADR-0020-playwright-flow-references.md), [ADR-0004](ADRs/ADR-0004-quality-gates-and-native-packaging.md) and [ADR-0006](ADRs/ADR-0006-development-port-shutdown.md).

## Automatic local commits

The user's standing instruction authorizes a local commit for each completed, validated change on the branch active at task start. It includes code, documentation, planning artifacts and reviewed flow references. It overrides skill defaults that only suggest a commit or require separate commit authorization. An explicit request to leave changes uncommitted takes precedence. Read-only work with no changes needs no commit; this workflow adds no Git hook or CI commit behavior.

1. Record the named active branch, HEAD and staged/unstaged/untracked changes before editing. Preserve unrelated work. Do not create or switch branches for automatic committing.
2. Complete the scoped change and required validation. For documentation-only changes, review the diff, verify affected relative links and run `git diff --check`; code and desktop changes retain the gates below. Fix failures caused by the change. Record actual failures or environment limits; do not label unfinished work complete.
3. Recheck branch and HEAD before committing. Reconcile unexpected changes without discarding another actor's work. A detached HEAD or changed branch requires resolution before committing; do not silently choose a destination.
4. Review and stage only task-owned files or hunks, including related guidance and reviewed generated references. Avoid blanket staging. Preserve unrelated index entries and any unrelated hunks in shared files using selective staging and a scoped commit method.
5. Create a local commit with a concise imperative subject, following an applicable ticket convention. Do not ask again for routine commit permission, amend existing commits, rewrite history or push under this authorization. In delegated work, the coordinator owns staging and commits; workers return scoped changes and evidence.
6. Inspect the resulting commit and final status to confirm the intended changes were committed and unrelated work remains intact. Report the branch, commit SHA and validation results. If required validation or committing is blocked, preserve edits and report the exact blocker and remaining uncommitted work; never claim an unsuccessful commit succeeded.

## Commands and dependency ownership

Use Node 24+ and the npm lockfile. `npm ci` restores exact versions. electron-vite builds main, preload, and renderer; bundling is separate from `tsc --noEmit`. Strict Node/browser TypeScript configs prevent accidental Node type availability in the renderer. Renderer-only packages are build dependencies because they are bundled into assets; external Node/native runtime dependencies belong in `dependencies` when introduced.

The root `postinstall` loads Electron's package entry to ensure its lazily downloaded desktop binary is present. electron-vite reads `path.txt` directly and cannot trigger this download itself. Existing installs can run `npm run postinstall`; fresh npm installs invoke it automatically. Do not skip install scripts when preparing a desktop development environment.

Preload is bundled into one `.cjs` file with `externalizeDeps: false`; sandboxed preload cannot rely on arbitrary runtime module imports. The configuration and main's preload path must agree. Main and renderer use ESM. Check peer compatibility on upgrades rather than mixing major versions blindly.

## Development shutdown

`npm run kill-dev` runs the TypeScript CLI at `scripts/kill-dev.ts` directly through Node 24. It discovers TCP listeners on the configured default port 5173, snapshots their process trees, prints target PIDs/names, and stops those processes. The user's requested cleanup includes other programs occupying the port; ownership is based on the listener and descendants, not a project-name substring. A free port is a successful no-op. `--dry-run` previews targets and `--port <number>` selects a different cleanup port without changing server configuration.

The script never signals PID 0/1, itself, or its ancestors. It rechecks PID/start-time/name identity before signals, ignores exited/zombie processes, requests SIGTERM before bounded SIGKILL on Unix, and verifies the listener and loopback bind are gone. Windows uses PowerShell for listener/process discovery and Node's immediate termination semantics. Linux uses `ss` with `lsof` fallback; macOS uses `lsof`. Discovery/permission failures produce a nonzero exit rather than claiming cleanup succeeded. Keep this tool outside application bundles.

## Required evidence

The [ADR-0022 AI integration](patterns-ai.md) requires deterministic admission, cancellation/cleanup, stale-correlation, immutable preview, frame/history bounds and 100 ms batching regressions, plus real named bridge rejection/subscription tests. Its transport/producer migration must also prove received streams beyond old deadlines, silence/worker health separately, valid protocol tail/EOF acceptance, independent model proof and bounded safe diagnostics. Long-stream fixtures, packaged-worker and actual panel flows remain pending at foundation adoption; no fixture establishes live-provider eligibility. Keep all existing code/desktop gates and flow reporters.

Unpackaged Electron runs automatically write main-owned development diagnostics under `<userData>/logs` ([ADR-0018](ADRs/ADR-0018-development-file-diagnostics.md)). The launch terminal prints the directory. JSONL records use UTC timestamps, session/sequence identifiers, levels, process sources, fixed events and safe scalar metadata; IPC request IDs correlate downstream worker/provider events. Ten files of at most 5 MiB bound retained disk usage, and a bounded queue reports overload. Tests use isolated profiles. Packaged apps do not enable this logger. Normal shutdown drains for at most two seconds; forced termination can lose pending rows. Existing safe model summaries remain printed and also enter the file. Never add payload dumps or raw messages; follow the diagnostic boundary in IPC/security.

- `npm run lint`: typescript-eslint, React hooks, and dependency restrictions.
- `npm test`: focused core behavior, request parsing, state isolation, and origin/asset policy.
- `npm run build`: both type scopes plus all production bundles.
- `npm run test:desktop`: a real Electron journey using Playwright's experimental Electron API. Verifies account OAuth, native projects, Pi utility-process generation, preload/IPC, saved results, cancellation, and restart semantics.
- `npm run test:flows`: checks flow registration, indexes, capture tables, PNG digests and reference links. Included in `npm run check`.
- `npm run package`: current-OS unpacked application and hardened packaging configuration.
- `npm run test:packaged`: explicitly exercise the current artifact’s ASAR worker and runtime dependencies through a development Electron host. Run after packaging, with Xvfb on headless Linux. This does not disable packaged fuses or substitute for hardened-app startup verification.

`npm run check` combines lint, unit tests, flow-reference checks and build. Extend tests for meaningful behavior and trust boundaries, not every presentation detail. Use isolated temporary profiles in desktop tests, clean up the owned process/profile, and collect screenshots. Resolve temporary project roots with `realpath` before calling storage/worker adapters, matching the workspace service contract; macOS temporary directories and Windows short paths can otherwise produce aliases. No standalone Playwright browser installation is required for Electron automation.

## Flow reference refresh

Each desktop journey declares a stable flow annotation/tag and uses `tests/flows/fixture.ts`. The configured reporter stages screenshots in `test-results` and replaces only the complete passing flow/platform sets under `ref/flows`, regenerating each flow index's capture block. Failed/skipped journeys preserve earlier references; interrupted runs publish none. See [flow patterns](patterns-flow.md) for progressive discovery, focused commands, publication recovery and AI-maintained explanations. Do not override the configured reporter when refreshing references. CI uploads `ref/flows` with diagnostics without committing. This tooling stays outside application bundles and does not expose a renderer filesystem API.

## Environment and CI

Headless Linux uses Xvfb. Normal commands retain sandboxing. If the host prevents sandbox startup, report that constraint; any diagnostic launch without Chromium sandboxing must be explicitly distinguished from sandbox verification and must not change application defaults.

`.github/workflows/ci.yml` checks sources and packages on native Linux, Windows, and macOS runners. Source builds, unsigned packages, graphical smoke tests, and signed installer validation are different evidence. See [distribution](patterns-distribution.md) and the actual [validation record](research/validation.md).
