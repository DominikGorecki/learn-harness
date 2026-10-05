# Learning Studio

A desktop learning workspace targeting Windows, macOS, and Linux, built with Electron, React, and TypeScript. Project and account services run in Electron main; bounded Pi generation runs in a utility process. The interface pairs a slim control rail and compact project navigation with a spacious workspace inspired by the supplied ChatGPT screenshots.

The working slice includes a ChatGPT account panel with browser sign-in, verified identity, plan-usage permission, model discovery, and sign-out. Native folder projects, portable learning goals, separate model preferences, and missing-folder recovery are implemented. Description-to-outline generation uses the Pi harness in a dedicated utility process, with validated saves, cancellation, and retryable save failures. Outlines can begin with a written topic, supported folder material, or both. Scoped text/Markdown reads, source coverage, and clarification are implemented; the PRD baseline has passed native automated journeys and packaging on Windows, macOS and Linux; live-provider acceptance remains in progress. The subsequent Light/Dark UI update has separate validation recorded below.

Open **Settings → Appearance** (gear icon, or **⌘/Ctrl+,**) to choose Light or Dark. Your choice applies immediately and is remembered on this device. With no saved choice, the app starts with the OS appearance.

Use the edit icon beside **Your path through the subject** to rewrite a saved outline. Describe changes freely or refer to numbered topics, such as “Move 01 after 03”. **Rewrite outline** uses the selected project model and sends the current outline JSON as context; Pi reads further supported material as needed. A successful save updates `.edu/project.json`. Cancellation/failure preserves the prior outline and edit draft; a save failure retains the new result for storage-only retry. This uses your ChatGPT plan allowance. See [ADR-0017](ref/ADRs/ADR-0017-outline-rewrites-with-saved-context.md).

Each topic also has its own edit icon. **Rewrite topic** accepts requests such as “I would like to learn further history on this topic”, updates only that topic and its own folder, and preserves other topics and outline sections. Topic drafts are separate from each other and the whole-path draft. Existing root folders are matched by the topic ID, title, numbered title, saved topic-plan identity or an exclusive source-folder reference; ambiguous or shared folders require resolution. A matching folder receives an updated `.edu/topic.json` plan and any relevant content edits proposed by Pi. Renaming the topic keeps its existing folder association.

Pi can browse/read throughout the selected project and create or edit UTF-8 text content and parent folders. General outline requests can apply requested content changes across the project; topic edits restrict writes to their own folder while allowing project-wide reading for context. Writes are staged until the outline is validated. Cancellation, clarification or inference failure saves none of them. Save failures retain edits for retry without inference; an interrupted multi-file save is recovered on the next project load. File-size, path, link and external-edit checks still apply. Root application state is saved by the app. See [ADR-0019](ref/ADRs/ADR-0019-topic-edits-and-project-file-access.md).

Use **Connect ChatGPT** to connect an eligible account. During sign-in, **Copy sign-in link** lets you paste the link into your preferred browser if automatic browser opening does not work (for example, in WSL). Keep the app open while completing sign-in. Your connection is saved in the app data directory and restored after restart. Credentials use OS encryption where available; otherwise the account panel identifies the unencrypted local-file fallback. On Linux/WSL the connection folder and files are restricted to your user. Automated tests exercise a local signed-token protocol fixture; real ChatGPT-plan inference remains a separate acceptance gate.

![Learning Studio light workspace](ref/research/assets/appearance-workspace-light.png)

[Dark workspace](ref/research/assets/appearance-workspace-dark.png) · [Appearance settings](ref/research/assets/appearance-settings-dark.png). Captures show the running application with an isolated test project; they are separate from the supplied visual references.

## Product direction

The [product overview](docs/overview.md) describes the education harness and its Socratic learning approach. The [first milestone PRD](ref/prds/01-project-setup-and-outline.md) defines functional ChatGPT plan access, folder-based projects, model selection, and saved AI-generated outlines. The [acceptance audit](ref/work/01-project-setup-and-outline/acceptance.md) maps these requirements to code, tests, and remaining live-account and manual platform checks.

Future UI changes follow the screenshot-led [design system](ref/patterns-design-system.md) and [UX patterns](ref/patterns-ux.md). The [Light/Dark appearance update](ref/research/chatgpt-app-appearance.md) applies the user-supplied references; full milestone evidence is tracked in the [implementation validation record](ref/work/01-project-setup-and-outline/validation.md).

The project picker includes **GPT-6.1 Sol** (`gpt-6.1-sol`) and **GPT-6 Luna** (`gpt-6-luna`) as extra choices whenever the connected account's catalogue loads successfully. Both remain selectable after refresh and restart even if discovery omits them. These explicitly requested choices do not assert access for every account: each inference request still uses the connected account and can be rejected by the provider. No reply request runs automatically when loading, selecting or refreshing models.

Open **Account settings → Test GPT-6.1 Sol** or **Test GPT-6 Luna** to check access with a short reply using a small amount of your plan allowance. Successful tests show a separate verification state for each model during the current connection session. Failed or cancelled tests preserve both choices and any other model's successful verification. Refresh retains verification; reconnect and restart reset verification badges while keeping the extra choices. Tests send no learning-project content.

For troubleshooting, run the app with `npm run dev`, repeat the selected test, and copy the single `[Sol model test]` or `[Luna model test]` JSON summary from the launch terminal together with the account-panel message. It reports HTTP status, stream event counts, known returned model/status values, recognized provider error codes, boolean text evidence (`hasStreamedText` and `hasFinalText`), byte count, elapsed time and the specific outcome. A matching completed response can verify text delivered in deltas even when the final event omits its output array. Tokens, account identity, request headers, prompts, reply text and raw provider errors are excluded. Unrecognized provider values are labeled `unrecognized`. Unpackaged runs also save the summary as a structured `model.test` event in the development log. A missing completion, incomplete reply or model mismatch remains inconclusive; an explicit `model_not_found` identifies a provider rejection for this connection. Do not copy the saved connection file or full unrelated terminal output.

## Development logs

`npm run dev` automatically writes UTF-8 JSONL files to `logs` inside the app data directory (Windows: `%APPDATA%\Learning Studio\logs`). The launch terminal prints the actual directory. Unpackaged previews and desktop tests also log; tests use their isolated profile. Packaged apps do not enable development file logging. No additional setup or dependency is required.

Each line has `schemaVersion`, UTC `timestamp`, `sessionId`, `sequence`, main `pid`, `level`, `source`, `event`, and `data`. Logs cover startup/shutdown, windows, IPC outcomes/timings, account/workspace/generation state, utility lifecycle, material counts, inference transport/terminal events, tool names/turns, model-test summaries, renderer/preload failures and console occurrence metadata. Match `data.requestId` to follow one IPC request through provider/utility work; use `workerId` for a worker and `runId`/`projectId` for generation state.

Files rotate at 5 MiB; the ten most recent owned files are retained across launches (about 50 MiB maximum). A bounded queue reports `logging.dropped` during overload. File writes are asynchronous; unavailable storage prints a fixed warning and the app continues. Normal shutdown waits up to two seconds for pending rows, while forced exits can lose buffered diagnostics. Main fatal exceptions get a synchronous safe marker.

Logs exclude credentials, account identity, URLs/paths, request/reply bodies, prompts, outlines, source material and raw provider/error messages. Arbitrary console strings/objects record occurrence/length metadata; known structured diagnostics retain their safe details. Error records retain type and the first app bundle line/column, without message, function names or absolute stack paths. External npm/Vite output and Chromium's raw debug streams are outside these application logs. See [ADR-0018](ref/ADRs/ADR-0018-development-file-diagnostics.md).

Read the current launch in PowerShell:

```powershell
$logFile = Get-ChildItem -LiteralPath "$env:APPDATA\Learning Studio\logs" -Filter 'session-*.jsonl' |
  Sort-Object Name | Select-Object -Last 1
Get-Content -LiteralPath $logFile.FullName -Wait
# Filter already-written rows by event:
Get-Content -LiteralPath $logFile.FullName | ConvertFrom-Json |
  Where-Object event -eq 'ipc.failed' | Format-List
```

## Saved connection

Login information is stored in `connection/chatgpt.json` under the app data directory:

- Linux/WSL: `~/.config/Learning Studio` (or `$XDG_CONFIG_HOME/Learning Studio`).
- Windows: `%APPDATA%\Learning Studio`.
- macOS: `~/Library/Application Support/Learning Studio`.

The app restores the connection and refreshes expired access tokens when possible. **Sign out of this app** removes the saved credentials. A revoked connection or unreadable credential file still requires reconnecting. On devices without OS keychain encryption, the file is unencrypted and relies on filesystem permissions; account settings disclose this. Login information never belongs in a learning project's `.edu` folder.

## Open-source privacy

Keep credentials, copied application profiles, private learning projects, local logs, and signing keys out of contributions. `.gitignore` excludes these common locations and file types, but it does not remove previously tracked files or protect files added with force. Use isolated test data in screenshots and diagnostic artifacts, review their visible content, and use a GitHub noreply email for commits if you do not want your personal email published.

The [privacy audit](ref/research/privacy-audit.md) records the reviewed source/history/artifacts, local cleanup, and remaining public-history exposure. Deleting private material in a new commit does not erase it from older commits, other branches, forks, or cached copies.

## Run locally

Use Node.js 24+ and npm. Node is a development requirement; a packaged app contains its own runtime.

```bash
npm ci
npm run dev
```

`dev` starts a loopback Vite server and the desktop window, with renderer refresh and main/preload rebuilds. The development server uses `127.0.0.1:5173` and fails if the port is occupied. Open the Electron window to use the app; the renderer expects its preload bridge.

The install hook downloads Electron's desktop binary, which electron-vite requires before launch. For an existing dependency tree installed before this hook was added, run `npm run postinstall` once. Future `npm ci`/`npm install` runs perform this setup automatically.

The `Local: http://127.0.0.1:5173/` line means the renderer server started successfully. To stop it from another terminal or free the port before restarting:

```bash
npm run kill-dev
npm run dev
```

`kill-dev` prints and stops whichever process owns TCP port 5173, along with its child processes, including another application occupying that port. It succeeds when the port is already free. On Linux/macOS it first requests termination, then forces surviving processes to exit after three seconds; Windows terminates through Node's process API. Process identities are checked again before signalling.

```bash
npm run kill-dev -- --dry-run      # show targets without stopping them
npm run kill-dev -- --port 5174    # free a different TCP port
```

The script runs directly with Node 24 and has no additional npm dependencies. It uses `ss` on Linux (with `lsof` fallback), `lsof` on macOS, and PowerShell on Windows. It reports errors when it cannot identify or stop the listener. Clearing a different port does not change the application's configured development port.

```bash
npm run check          # lint, focused tests, both type scopes, production build
npm run test:desktop   # build and exercise the real Electron application
npm start             # open the most recent production build
npm run package       # build an unpacked app for the current OS in dist/
npm run test:packaged # exercise the packaged Pi worker after packaging
```

On headless Linux, run desktop tests with `xvfb-run -a npm run test:desktop`; Electron's normal desktop system libraries are required. No browser download is needed for this smoke test because Playwright drives Electron's bundled Chromium.

## Source map

```text
src/
  main/                 Electron lifecycle and Node backend composition
    auth/               Protected ChatGPT account and provider adapters
    storage/            Atomic project and profile persistence
    ipc/                Authorized request handlers
    security/           CSP, trusted-origin policy, local asset protocol
  preload/              Small typed contextBridge capability API
  renderer/
    index.html
    src/
      app/              Workbench and navigation
      components/       Shared visual pieces
      features/projects/ Dashboard, setup, and outline views
      features/account/  Account connection panel
      lib/              Typed bridge result handling
  core/workspace/       Platform-independent project service and storage ports
  core/generation/      Run ownership, result acceptance, save recovery
  shared/               DTOs, channels, errors, runtime request parsers
tests/
  unit/                 Core behavior and boundary policy
  desktop/              Real Electron smoke journey
ref/
  patterns.md           Pattern index
  patterns-*.md         Focused current rules
  ADRs/INDEX.md          Decision index
  ADRs/ADR-*.md          Numbered decisions and rationale
  research/             Source-linked research and validation evidence
```

The layout follows electron-vite's process directories. Core and shared are small project-specific additions that keep behavior testable and the renderer unprivileged. Renderer-only dependencies are bundled and installed as development dependencies so the shipped app contains the bundles rather than a redundant dependency tree.

## Architecture

```mermaid
flowchart LR
  React[React UI] --> Preload[Typed preload API]
  Preload --> Main[Main IPC authorization and validation]
  Main --> Service[Workspace service]
  Service --> Repository[Project files and profile registry]
  Main --> Account[Protected account service]
  Main --> Generation[Generation service]
  Generation --> Worker[Pi utility process]
  Worker --> ChatGPT[ChatGPT plan Responses]
```

Use [AGENTS.md](AGENTS.md) for progressive discovery, [patterns](ref/patterns.md) for current rules, [ADRs](ref/ADRs/INDEX.md) for rationale, and the [research brief](ref/research/electron-learning-app.md) for primary sources and alternatives. The [validation record](ref/research/validation.md) distinguishes actual local results from configured platform targets.

## Distribution

Run the matching command on its target OS:

```bash
npm run dist:win       # Windows NSIS installer
npm run dist:mac       # macOS DMG
npm run dist:linux     # Linux AppImage
```

These commands never publish. The included GitHub Actions workflow checks and packages on native Windows/macOS/Linux runners, uploading unsigned build artifacts. It is a CI baseline, not a public release pipeline. Final app identity/icons, Windows signing, macOS signing/notarization, architecture coverage, installer acceptance, and update policy remain release work.

## Extend the workspace

Add learning behavior to core, define a serializable request/result in shared, expose one preload method, authorize/validate it in main, then implement its renderer state. Async ports separate workspace behavior from project files and the profile registry. Add AI access through a privileged adapter with explicit submission and bounded lifecycle. Expensive parsing, indexing, or inference belongs in workers/utility processes rather than blocking Electron main.
