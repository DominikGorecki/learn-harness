# IPC and security patterns

Governed by [ADR-0002](ADRs/ADR-0002-sandboxed-capability-ipc.md) and [ADR-0008](ADRs/ADR-0008-chatgpt-plan-connection-and-pi-foundation.md).

## Capability contract

Shared contracts define named account, workspace, and outline capabilities on `window.learning`. Folder selection happens in main; callers identify previously opened projects and owned runs. Do not expose raw `ipcRenderer`, arbitrary channel names, filesystem paths, subprocess APIs, environment variables, or credentials.

`src/shared/account.ts` adds named account get/connect/cancel/reopen/copy-sign-in-link/models/disconnect capabilities and `onAccountChanged`. The subscription strips Electron event objects and returns an unsubscribe function. Account mutations accept no caller-supplied URLs or credentials; even unexpected payloads to no-input actions are rejected. The copy action writes only the active internally constructed authorization URL to the OS clipboard in main; it exposes neither the URL in snapshots nor general clipboard access. Main sends sanitized snapshots only to the owning window.

Requests/results are structured-clone-compatible DTOs. Public replies use `ApiResult<T>` with bounded error codes and safe messages. Expected application errors retain their code; unexpected failures return a generic INTERNAL message without serialized stack traces or sensitive logs.

## Authorization and runtime validation

Each main handler verifies the live owning window, exact sender webContents, the main frame, its effective origin, and its app-entry URL. A trusted origin alone does not authorize a sibling frame or another window. Production trusts `learningapp://workspace`; development trusts only `http://127.0.0.1:5173`. Mutation payloads arrive as `unknown` and pass strict field/type/length parsers before core sees them. Project/run/model membership is checked by core and account services. TypeScript types do not validate incoming values.

## Renderer restrictions

Keep `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`, and `webviewTag: false`. Deny renderer navigation, redirects, popups, embedded webviews, and browser permissions in the app's dedicated session. The account service may open its internally constructed, origin/path-allowlisted authorization URL in the system browser. No generic external-link capability is exposed.

Built HTML/assets are served through a registered secure standard custom protocol. The handler allows GET requests only and a small fixed asset-path shape under the built renderer directory. It does not turn renderer-provided paths into general filesystem access. Production CSP disallows inline scripts/styles, network connections, frames, objects, and form submission. Dev CSP permits Vite refresh scripts/styles and its exact loopback websocket. Packaged apps ignore the development renderer URL.

## Adding capabilities

Extend shared DTOs, runtime validation, and API types first; add one preload wrapper and one authorized main handler; cover the rejected inputs and real IPC journey. Keep renderer text as React text. Before adding Markdown/HTML, imports, external navigation, or model-produced actions, define their trust boundary explicitly. All event subscriptions must strip Electron event objects and return unsubscribe functions.

## Generation boundary

[ADR-0010](ADRs/ADR-0010-bounded-pi-outline-generation.md) governs the Pi worker. Tokens travel on the private main/utility port and never enter public snapshots. Only educational tools are registered. The plan request whitelist excludes unsupported fields and arbitrary endpoints. Require successful completed streams and independent outline validation before persistence. [ADR-0011](ADRs/ADR-0011-scoped-material-understanding.md) permits bounded read-only material snapshots after explicit submission. Pi lists permitted files and reads exact snapshot keys; it cannot follow symlinks, load project agent instructions, execute code, or write source files. Every cited path must appear in actual read-tool evidence. Source/model text is rendered as text, never executable markup or code.
