# ADR-0014: Durable account connection in the application profile

- Status: Accepted
- Date: 2026-10-04
- Scope: account persistence and restoration. Supersedes ADR-0008's memory-only fallback when OS encryption is unavailable.

## Context

The user reports having to log in after every restart and explicitly requires login information to remain in the application's home/data directory, including the Windows equivalent. The previous adapter deliberately discarded credentials at exit without a protected OS keychain. An isolated Electron probe on this WSL/Linux host returned `encryptionAvailable: false`, backend `basic_text`, and the default profile `~/.config/Learning Studio`. The behavior followed the earlier fallback decision but did not satisfy the requested persistence.

## Decision

Persist verified account identity, issued OAuth client registration, access/refresh tokens, permission scopes and expiry in `<userData>/connection/chatgpt.json`. Main owns this file; no token enters the renderer, localStorage, `.edu`, logs or committed source. Continue using Electron's existing `app.getPath('userData')` location:

| Platform | Default connection directory |
| --- | --- |
| Linux / WSL | `$XDG_CONFIG_HOME/Learning Studio/connection`, or `~/.config/Learning Studio/connection` |
| Windows | `%APPDATA%\Learning Studio\connection` |
| macOS | `~/Library/Application Support/Learning Studio/connection` |

Use a versioned envelope describing `protected` or `local` storage. When protected OS encryption is available, store only its base64 ciphertext. When unavailable, persist the credential as local JSON rather than silently using an ephemeral session. The local fallback is explicitly not encrypted; on POSIX require the app user to own the connection directory and read credential files, enforce directory mode `0700` and file mode `0600`, and use atomic replacement. Windows normally uses DPAPI-backed encryption and the app-data directory's inherited access controls; POSIX modes are not described as Windows ACL protection.

Keep file reads bounded and reject symlinked connection directories and nonregular/symlinked credential files. Preserve malformed, future-version or undecryptable connections and show recovery. An encryption failure must not silently downgrade an existing encrypted connection. If an OS keychain later becomes available, upgrade a valid local credential to protected storage during restoration.

Read and migrate the previous `chatgpt.enc` format when no canonical JSON file exists. Once the new file is atomically committed, it is authoritative even if legacy cleanup fails; subsequent reads retry cleanup, and sign-out removes both formats. A malformed canonical file must not fall back to a stale legacy token. Keep installation `host-id` independently of sign-out.

Use the existing account service to restore the saved connection at startup, renew expired access tokens with the saved refresh token, and persist renewed credentials. Reconnection remains necessary after revocation, invalid grants or unreadable saved state. Update the account UI to accurately distinguish protected storage from the persistent, unencrypted local fallback.

## Consequences

Normal application restart no longer requires a new browser sign-in solely because a Linux/WSL keychain is unavailable. The local fallback relies on filesystem access control rather than OS keychain encryption; other processes running as the same user can read it. This tradeoff implements the user's explicit persistence requirement and is disclosed in account settings. Credentials discarded by previous memory-only sessions cannot be recovered; the next successful sign-in creates the durable file.

Account/provider protocols, project storage and renderer privilege boundaries are unchanged. Tests must cover fresh-process restoration, real refresh-token exchange through a protocol fixture, durable sign-out, protected/local migration, permissions, malformed data and symlink rejection. Native platform and live-account evidence remain distinct from fixture evidence.

Sources: [Electron app paths](https://www.electronjs.org/docs/latest/api/app#appgetpathname), [Electron safeStorage semantics](https://www.electronjs.org/docs/latest/api/safe-storage).

Current rules: [learning and data](../patterns-learning-data.md), [IPC and security](../patterns-ipc-security.md), [architecture](../patterns-architecture.md).
