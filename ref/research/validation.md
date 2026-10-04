# Skeleton validation

- Environment: Linux x64 under WSL2, Node 24.11.1, Electron 44.5.1.
- Date: 2026-10-04.
- Scope: the implemented local skeleton, not a signed public release.

## Confirmed local evidence

| Check | Result |
| --- | --- |
| Context Bank health and canonical guidance retrieval | Healthy; root/capability indexes and the ADR skill read successfully. Bank content was not changed. |
| Dependency installation | Installed and locked; npm reported no known vulnerabilities at installation time. |
| `npm run check` | Passed: ESLint, 55 tests in five Vitest files, both strict TypeScript scopes, and production bundles. |
| Real Electron smoke | Passed using Xvfb and the bundled Chromium; no `--no-sandbox` override. Covers named bridge methods, absent renderer Node globals, invalid input rejection, incorrect/correct feedback, reload survival, and reset after process restart. |
| Linux unpacked package | Built successfully with ASAR and the configured package-time fuses. |
| Linux x64 AppImage | Built successfully; local artifact is `dist/Learning Studio-0.1.0.AppImage` (about 120 MB). |
| Package readback | ASAR contains only package metadata and the compiled main/preload/renderer tree, with no source, tests, skills, or redundant renderer dependencies. Configured disabled/enabled fuse values were read back from the Linux executable. |
| Development command | `npm run dev -- --remote-debugging-port=9223` started the fixed loopback renderer; a separate browser automation connection completed the web lesson through the real Node service. The owned dev process was stopped afterward. |
| Packaged Linux runtime | Launched `dist/linux-unpacked/edu-harness` with its hardened fuses and isolated profile. The ASAR-backed custom protocol served the renderer with production CSP, no renderer `require`, and a successful practice-remembering lesson through IPC. The process was stopped afterward. |
| Documentation links and visual review | Project guidance links resolve. The default workspace screenshot was inspected and retained at [assets/workspace.png](assets/workspace.png); all three course choices are visible at the default window size. |

## Development shutdown follow-up

`npm run kill-dev` was validated against controlled TCP listeners, including an unrelated Node fixture with a child and one that ignores SIGTERM. Dry-run leaves them alive, actual shutdown stops the listener/descendants, and repeated cleanup succeeds on the free port. Invalid ports/options are rejected before process lookup. Tests also cover target selection and protection of the caller's ancestors.

A live `npm run dev` check on Linux started Vite and Electron. Dry-run listed the observed ten-process listener tree; `kill-dev` stopped it, escalated one remaining process, and verified port 5173 was free. A subsequent invocation reported already free. Windows/macOS discovery implementations are present but were not exercised in this Linux session.

The check exposed missing Electron binary setup after dependency installation: this Electron package downloads lazily, while electron-vite reads its `path.txt` directly. The new root postinstall hook loads Electron's entry point first. A clean `npm ci` exercised the hook and downloaded the binary automatically; desktop automation also passed. Existing installs can run `npm run postinstall` once.

The production renderer bundle is minified (about 231 kB before compression); main and the single CommonJS preload are built separately. Desktop tests use a temporary profile, close their owned processes, and remove the profile. Screenshots are captured after finite animations complete.

## Verification limits

Windows and macOS targets and native CI jobs are configured but have not run in this local Linux session. Signing, macOS notarization, installer acceptance, update delivery, arm64 coverage, long-term storage, and real tutoring/learning effectiveness were not verified. The smoke journey verifies the application boundary and functionality; it is not an independent OS sandbox audit or accessibility certification.

## Sandbox-specific tooling notes

This workspace restricts writes to home-directory caches. Local tool execution used writable `/tmp` caches: `UV_CACHE_DIR` for Context Bank, `npm_config_cache` for npm, `electron_config_cache` for Electron's installer, and `XDG_CACHE_HOME`/`ELECTRON_BUILDER_CACHE` for packaging/runtime caches. These are harness accommodations, not required app configuration; normal user commands remain those in [README.md](../../README.md).
