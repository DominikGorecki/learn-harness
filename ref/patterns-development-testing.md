# Development and testing patterns

Governed by [ADR-0004](ADRs/ADR-0004-quality-gates-and-native-packaging.md) and [ADR-0006](ADRs/ADR-0006-development-port-shutdown.md).

## Commands and dependency ownership

Use Node 24+ and the npm lockfile. `npm ci` restores exact versions. electron-vite builds main, preload, and renderer; bundling is separate from `tsc --noEmit`. Strict Node/browser TypeScript configs prevent accidental Node type availability in the renderer. Renderer-only packages are build dependencies because they are bundled into assets; external Node/native runtime dependencies belong in `dependencies` when introduced.

The root `postinstall` loads Electron's package entry to ensure its lazily downloaded desktop binary is present. electron-vite reads `path.txt` directly and cannot trigger this download itself. Existing installs can run `npm run postinstall`; fresh npm installs invoke it automatically. Do not skip install scripts when preparing a desktop development environment.

Preload is bundled into one `.cjs` file with `externalizeDeps: false`; sandboxed preload cannot rely on arbitrary runtime module imports. The configuration and main's preload path must agree. Main and renderer use ESM. Check peer compatibility on upgrades rather than mixing major versions blindly.

## Development shutdown

`npm run kill-dev` runs the TypeScript CLI at `scripts/kill-dev.ts` directly through Node 24. It discovers TCP listeners on the configured default port 5173, snapshots their process trees, prints target PIDs/names, and stops those processes. The user's requested cleanup includes other programs occupying the port; ownership is based on the listener and descendants, not a project-name substring. A free port is a successful no-op. `--dry-run` previews targets and `--port <number>` selects a different cleanup port without changing server configuration.

The script never signals PID 0/1, itself, or its ancestors. It rechecks PID/start-time/name identity before signals, ignores exited/zombie processes, requests SIGTERM before bounded SIGKILL on Unix, and verifies the listener and loopback bind are gone. Windows uses PowerShell for listener/process discovery and Node's immediate termination semantics. Linux uses `ss` with `lsof` fallback; macOS uses `lsof`. Discovery/permission failures produce a nonzero exit rather than claiming cleanup succeeded. Keep this tool outside application bundles.

## Required evidence

- `npm run lint`: typescript-eslint, React hooks, and dependency restrictions.
- `npm test`: focused core behavior, request parsing, state isolation, and origin/asset policy.
- `npm run build`: both type scopes plus all production bundles.
- `npm run test:desktop`: a real Electron journey using Playwright's experimental Electron API. Verifies account OAuth, native projects, Pi utility-process generation, preload/IPC, saved results, cancellation, and restart semantics.
- `npm run package`: current-OS unpacked application and hardened packaging configuration.

`npm run check` combines lint/tests/build. Extend tests for meaningful behavior and trust boundaries, not every presentation detail. Use isolated temporary profiles in desktop tests, clean up the owned process/profile, and collect screenshots. No standalone Playwright browser installation is required for Electron automation.

## Environment and CI

Headless Linux uses Xvfb. Normal commands retain sandboxing. If the host prevents sandbox startup, report that constraint; any diagnostic launch without Chromium sandboxing must be explicitly distinguished from sandbox verification and must not change application defaults.

`.github/workflows/ci.yml` checks sources and packages on native Linux, Windows, and macOS runners. Source builds, unsigned packages, graphical smoke tests, and signed installer validation are different evidence. See [distribution](patterns-distribution.md) and the actual [validation record](research/validation.md).
