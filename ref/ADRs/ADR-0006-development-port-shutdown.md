# ADR-0006: Explicit development port cleanup with verified process trees

- Status: Accepted
- Date: 2026-10-04

## Context

The user requested `npm run kill-dev` to stop a development server or another process occupying port 5173. Terminating only the listening Node process can leave its Electron children alive, while broad process-name matching can affect unrelated applications.

## Decision

Provide a dependency-free TypeScript CLI executed by Node 24. Discover the actual TCP listener through Linux `ss`/`lsof`, macOS `lsof`, or Windows PowerShell. Select its observed descendants, print the PIDs and process names, protect the kill command and its ancestors, and recheck PID/start-time/name identity before signalling. Attempt graceful shutdown on Unix, escalate after three seconds, and verify that the targets have exited and the loopback port is bindable. Use `--dry-run` for a read-only preview and `--port` for an alternate cleanup target. An already-free port succeeds.

The default intentionally includes another program owning the selected port, as explicitly requested. This policy belongs to the manually invoked cleanup command; application startup continues to refuse an occupied port and never invokes cleanup automatically.

## Consequences

Shutdown works across terminals without a launcher state file, and normal listener descendants such as Electron are included. Commands require the platform's standard discovery utilities and permission to inspect/stop the owner. Windows signal semantics can terminate immediately; Unix can request a graceful exit. The tool does not discover orphaned processes with no remaining ancestry or stop a parent that may restart its listener; in that case the occupied port is reported. A process that changes identity is never intentionally signalled.

Platform references: [Node process signals](https://nodejs.org/docs/latest-v24.x/api/process.html#processkillpid-signal), [Windows TCP listener discovery](https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-nettcpconnection), and [Windows process identity](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process).

Current rules: [development/testing](../patterns-development-testing.md).
