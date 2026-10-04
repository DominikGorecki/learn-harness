# IPC and security patterns

Governed by [ADR-0002](ADRs/ADR-0002-sandboxed-capability-ipc.md).

## Capability contract

`src/shared/contracts.ts` is the transport contract. Expose named methods on `window.learning`, currently `listCourses`, `listSessions`, `startSession`, and `submitAnswer`. Do not expose raw `ipcRenderer`, arbitrary channel names, filesystem paths, subprocess APIs, environment variables, or credentials.

Requests/results are structured-clone-compatible DTOs. Public replies use `ApiResult<T>` with bounded error codes and safe messages. Expected application errors retain their code; unexpected failures return a generic INTERNAL message without serialized stack traces or sensitive logs.

## Authorization and runtime validation

Each main handler verifies the live owning window, exact sender webContents, the main frame, its effective origin, and its app-entry URL. A trusted origin alone does not authorize a sibling frame or another window. Production trusts `learningapp://workspace`; development trusts only `http://127.0.0.1:5173`. Mutation payloads arrive as `unknown` and pass strict field/type/length parsers before core sees them. Course/session/choice membership is checked by core. TypeScript types do not validate incoming values.

## Renderer restrictions

Keep `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`, and `webviewTag: false`. Deny renderer navigation, redirects, popups, embedded webviews, and browser permissions in the app's dedicated session. No external link opening capability is present.

Built HTML/assets are served through a registered secure standard custom protocol. The handler allows GET requests only and a small fixed asset-path shape under the built renderer directory. It does not turn renderer-provided paths into general filesystem access. Production CSP disallows inline scripts/styles, network connections, frames, objects, and form submission. Dev CSP permits Vite refresh scripts/styles and its exact loopback websocket. Packaged apps ignore the development renderer URL.

## Adding capabilities

Extend shared DTOs, runtime validation, and API types first; add one preload wrapper and one authorized main handler; cover the rejected inputs and real IPC journey. Keep renderer text as React text. Before adding Markdown/HTML, imports, external navigation, or model-produced actions, define their trust boundary explicitly. Streaming/event APIs are deferred; when added, strip Electron event objects and return unsubscribe functions.
